// GET  /api/archives/[slug] — fetch one archive with its memories (by share_slug)
// PATCH /api/archives/[slug] — update the archive (subject info, cover photo)

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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
    const body = await req.json();
    const allowed = ['subject_name', 'subject_dates', 'cover_photo_url', 'status', 'family_contact_email'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from('archives')
      .update(updates)
      .eq('share_slug', slug)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
