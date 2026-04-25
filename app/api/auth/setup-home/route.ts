// POST /api/auth/setup-home — called from the signup flow.
// Creates the funeral_home record and links the new auth user as the admin staff member.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { home_name, staff_name, staff_email, auth_user_id } = body;

    if (!home_name || !staff_email || !auth_user_id) {
      return NextResponse.json(
        { error: 'home_name, staff_email, and auth_user_id are required' },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();

    // Verify the auth user actually exists (paranoid check — they were just created)
    const { data: userData } = await admin.auth.admin.getUserById(auth_user_id);
    if (!userData?.user) {
      return NextResponse.json({ error: 'Invalid auth user' }, { status: 400 });
    }

    // Check if this user already has a staff record (prevent duplicate setup)
    const { data: existingStaff } = await admin
      .from('staff')
      .select('id, home_id')
      .eq('auth_user_id', auth_user_id)
      .maybeSingle();

    if (existingStaff) {
      return NextResponse.json({
        ok: true,
        message: 'User already has a home',
        home_id: existingStaff.home_id,
      });
    }

    // 1. Create the funeral home
    const { data: home, error: homeErr } = await admin
      .from('funeral_homes')
      .insert({
        name: String(home_name).trim(),
        owner_email: staff_email,
        subscription_tier: 'trial',
      })
      .select()
      .single();

    if (homeErr || !home) {
      return NextResponse.json(
        { error: homeErr?.message || 'Could not create funeral home' },
        { status: 500 }
      );
    }

    // 2. Create the staff record (admin role)
    const { data: staff, error: staffErr } = await admin
      .from('staff')
      .insert({
        home_id: home.id,
        email: String(staff_email).trim(),
        name: staff_name ? String(staff_name).trim() : null,
        role: 'admin',
        auth_user_id,
      })
      .select()
      .single();

    if (staffErr || !staff) {
      // Clean up the home record if staff creation failed
      await admin.from('funeral_homes').delete().eq('id', home.id);
      return NextResponse.json(
        { error: staffErr?.message || 'Could not create staff record' },
        { status: 500 }
      );
    }

    // 3. Optional: claim any existing archives that have no home_id
    // (For users who tested the product before auth was added)
    await admin
      .from('archives')
      .update({ home_id: home.id })
      .is('home_id', null);

    return NextResponse.json({
      ok: true,
      home_id: home.id,
      staff_id: staff.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Setup home error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
