// POST /api/auth/invite-staff — admin adds a new staff member to their home

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedStaff } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authed = await getAuthedStaff();
    if (!authed) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (authed.staff.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can add staff' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    if (!['admin', 'director', 'staff'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // 1. Create the auth user (auto-confirmed since admin is creating them)
    const { data: userData, error: userErr } = await admin.auth.admin.createUser({
      email: String(email).trim(),
      password,
      email_confirm: true,
    });

    if (userErr || !userData.user) {
      return NextResponse.json(
        { error: userErr?.message || 'Could not create auth user' },
        { status: 500 }
      );
    }

    // 2. Create the staff record
    const { data: staff, error: staffErr } = await admin
      .from('staff')
      .insert({
        home_id: authed.home.id,
        email: String(email).trim(),
        name: name ? String(name).trim() : null,
        role,
        auth_user_id: userData.user.id,
      })
      .select()
      .single();

    if (staffErr || !staff) {
      // Roll back the auth user
      await admin.auth.admin.deleteUser(userData.user.id);
      return NextResponse.json(
        { error: staffErr?.message || 'Could not create staff record' },
        { status: 500 }
      );
    }

    return NextResponse.json(staff);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Invite staff error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
