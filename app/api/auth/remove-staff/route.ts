// DELETE /api/auth/remove-staff?id=xxx — admin removes a staff member

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedStaff } from '@/lib/auth';

export async function DELETE(req: NextRequest) {
  try {
    const authed = await getAuthedStaff();
    if (!authed) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (authed.staff.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can remove staff' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    if (id === authed.staff.id) {
      return NextResponse.json({ error: "Can't remove yourself" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // Look up staff to get auth_user_id and verify they belong to this home
    const { data: staffToRemove, error: lookupErr } = await admin
      .from('staff')
      .select('id, home_id, auth_user_id')
      .eq('id', id)
      .single();

    if (lookupErr || !staffToRemove) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }
    if (staffToRemove.home_id !== authed.home.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Delete the staff record (cascade leaves auth user dangling — clean it up too)
    await admin.from('staff').delete().eq('id', id);

    if (staffToRemove.auth_user_id) {
      await admin.auth.admin.deleteUser(staffToRemove.auth_user_id);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Remove staff error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
