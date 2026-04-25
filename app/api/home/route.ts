// PATCH /api/home — admin updates funeral home settings
// (currently: print supplier contact info; will grow over time)

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedStaff } from '@/lib/auth';

export async function PATCH(req: NextRequest) {
  try {
    const authed = await getAuthedStaff();
    if (!authed) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (authed.staff.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can update home settings' }, { status: 403 });
    }

    const body = await req.json();
    const allowed = [
      'print_supplier_name',
      'print_supplier_email',
      'print_supplier_notes',
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        const v = body[key];
        updates[key] = typeof v === 'string' ? v.trim() || null : v;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from('funeral_homes')
      .update(updates)
      .eq('id', authed.home.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
