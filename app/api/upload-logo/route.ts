// POST /api/upload-logo — admin-only logo upload for the funeral home.
// Accepts JPG, PNG, SVG, WebP up to 1 MB. Stores under media/logos/{home_id}/

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedStaff } from '@/lib/auth';

export const runtime = 'nodejs';

const MAX_LOGO_BYTES = 1_000_000;
const ALLOWED_LOGO_TYPES = [
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
];

export async function POST(req: NextRequest) {
  try {
    const authed = await getAuthedStaff();
    if (!authed) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (authed.staff.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can change the home logo' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 });

    const mime = file.type || 'application/octet-stream';
    if (!ALLOWED_LOGO_TYPES.includes(mime)) {
      return NextResponse.json(
        { error: `Unsupported file type "${mime}". Use JPG, PNG, SVG, or WebP.` },
        { status: 415 }
      );
    }
    if (file.size > MAX_LOGO_BYTES) {
      return NextResponse.json(
        { error: `Logo too large (max 1 MB).` },
        { status: 413 }
      );
    }

    const ext = mime === 'image/svg+xml' ? 'svg'
      : mime === 'image/png' ? 'png'
      : mime === 'image/webp' ? 'webp'
      : 'jpg';
    const path = `logos/${authed.home.id}/${Date.now()}.${ext}`;

    const admin = supabaseAdmin();
    const buffer = await file.arrayBuffer();

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
    const logoUrl = urlData.publicUrl;

    // Persist on the funeral home
    await admin
      .from('funeral_homes')
      .update({ logo_url: logoUrl })
      .eq('id', authed.home.id);

    return NextResponse.json({ url: logoUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[upload-logo] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
