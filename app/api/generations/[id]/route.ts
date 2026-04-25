// PATCH /api/generations/[id] — save the director's edited/finalized version
// of an AI-generated draft.
//
// STAFF-ONLY: must own the parent archive.
//
// Body:
//   { edited_content: string, status?: 'edited' | 'finalized' }
//
// status defaults to 'finalized' when edited_content is set, signaling that
// this is the director's curated, sign-off version that should be used in
// downstream artifacts (program, prayer card, etc.).

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedStaff } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authed = await getAuthedStaff();
    if (!authed) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const admin = supabaseAdmin();

    // Look up the generation to verify ownership
    const { data: gen } = await admin
      .from('generations')
      .select('id, archive_id')
      .eq('id', id)
      .single();
    if (!gen) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: archive } = await admin
      .from('archives')
      .select('home_id')
      .eq('id', gen.archive_id)
      .single();
    if (!archive || archive.home_id !== authed.home.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json();
    const editedContent = typeof body.edited_content === 'string' ? body.edited_content : null;
    const status = ['draft', 'edited', 'finalized'].includes(body.status) ? body.status : 'finalized';

    const updates: Record<string, unknown> = {
      edited_content: editedContent,
      status,
    };

    const { data: updated, error } = await admin
      .from('generations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
