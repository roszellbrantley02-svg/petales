// POST /api/upload — upload a file to the Supabase media bucket
// Enforces file size + MIME type limits.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { LIMITS, bytesToReadable } from '@/lib/limits';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const slug = formData.get('slug') as string | null;
    const intendedType = formData.get('memory_type') as string | null;

    if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 });
    if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 });

    // ——— Limit enforcement ———

    // Determine which limit applies based on the file's MIME type
    const mime = file.type || 'application/octet-stream';
    let maxBytes = 0;
    let category: 'photo' | 'video' | 'voice' | null = null;

    if ((LIMITS.ALLOWED_PHOTO_TYPES as readonly string[]).includes(mime)) {
      maxBytes = LIMITS.PHOTO_MAX_BYTES;
      category = 'photo';
    } else if ((LIMITS.ALLOWED_VIDEO_TYPES as readonly string[]).includes(mime)) {
      maxBytes = LIMITS.VIDEO_MAX_BYTES;
      category = 'video';
    } else if ((LIMITS.ALLOWED_AUDIO_TYPES as readonly string[]).includes(mime)) {
      maxBytes = LIMITS.AUDIO_MAX_BYTES;
      category = 'voice';
    } else {
      return NextResponse.json(
        {
          error: `Unsupported file type "${mime}". Please upload a photo, video, or audio file.`,
        },
        { status: 415 }
      );
    }

    // Optional intentType cross-check
    if (intendedType && category !== intendedType) {
      return NextResponse.json(
        {
          error: `File type ${mime} doesn't match the memory type "${intendedType}".`,
        },
        { status: 400 }
      );
    }

    // Size cap
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          error: `File is ${bytesToReadable(file.size)}. The maximum for ${category}s is ${bytesToReadable(maxBytes)}.`,
        },
        { status: 413 }
      );
    }

    // ——— Upload ———
    const admin = supabaseAdmin();
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${slug}/${timestamp}-${random}-${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await admin.storage
      .from('media')
      .upload(path, buffer, {
        contentType: mime,
        upsert: false,
      });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const { data: urlData } = admin.storage.from('media').getPublicUrl(path);

    return NextResponse.json({
      url: urlData.publicUrl,
      path,
      size: file.size,
      type: mime,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
