// GET  /api/archives/[slug] — fetch one archive with its memories (by share_slug)
//                              PUBLIC: families share this URL with relatives.
// PATCH /api/archives/[slug] — update the archive (subject info, cover photo)
//                              STAFF-ONLY: enforces ownership of the archive.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireOwnedArchiveBySlug } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const admin = supabaseAdmin();

    const { data: archive, error: archiveErr } = await admin
      .from('archives')
      .select('*')
      .eq('share_slug', slug)
      .single();

    if (archiveErr || !archive) {
      return NextResponse.json({ error: 'Archive not found' }, { status: 404 });
    }

    const { data: memories, error: memsErr } = await admin
      .from('memories')
      .select('*')
      .eq('archive_id', archive.id)
      .order('created_at', { ascending: false });

    if (memsErr) return NextResponse.json({ error: memsErr.message }, { status: 500 });

    return NextResponse.json({ ...archive, memories: memories || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // STAFF-ONLY: must own this archive
    const guard = await requireOwnedArchiveBySlug(slug);
    if (guard.response) return guard.response;

    const body = await req.json();
    const allowed = [
      'subject_name', 'subject_dates', 'cover_photo_url', 'status',
      'family_contact_email', 'donation_charity_name', 'donation_url', 'donation_note',
      'theme',
      // Cremation memorial SKU
      'service_type', 'package_price_cents', 'package_price_label',
      // Physician nudge
      'physician_name', 'physician_email',
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from('archives')
      .update(updates)
      .eq('id', guard.archive.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
