// PATCH  /api/home-vendors/[id]   — update a directory entry
// DELETE /api/home-vendors/[id]   — remove a directory entry
// STAFF-ONLY: must own the directory entry's home.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedStaff } from '@/lib/auth';

async function ownsEntry(id: string, homeId: string): Promise<boolean> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from('home_vendors')
    .select('home_id')
    .eq('id', id)
    .single();
  return !!data && data.home_id === homeId;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authed = await getAuthedStaff();
    if (!authed) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const owns = await ownsEntry(id, authed.home.id);
    if (!owns) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const allowed = ['vendor_type', 'name', 'contact_email', 'contact_phone', 'notes', 'is_preferred'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    if (typeof updates.name === 'string') updates.name = updates.name.trim();

    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from('home_vendors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authed = await getAuthedStaff();
    if (!authed) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const owns = await ownsEntry(id, authed.home.id);
    if (!owns) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const admin = supabaseAdmin();
    const { error } = await admin.from('home_vendors').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
