// POST /api/auth/invite-staff — admin adds a new staff member to their home.
//
// New flow (April 2026): we don't ask the admin for a password. Instead:
//   1. Create the auth user with a random secure temp password
//   2. Create the staff record linked to the auth user
//   3. Generate a Supabase recovery link (lets the new staff set their password)
//   4. Send a Petales-branded invitation email via Resend with that link
//   5. New staff clicks the link, lands on /set-password, sets their own password,
//      then signs in like normal.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedStaff } from '@/lib/auth';
import { sendStaffInvite } from '@/lib/resend';
import crypto from 'node:crypto';

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
    const { name, email, role } = body;

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }
    if (!['admin', 'director', 'staff'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // 1. Create the auth user with a random temp password (the user will reset it
    //    via the invitation link before they ever sign in).
    const tempPassword = crypto.randomBytes(32).toString('hex');
    const { data: userData, error: userErr } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password: tempPassword,
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
        email: cleanEmail,
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

    // 3. Generate the recovery link (where the new staff sets their password)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://petales-gold.vercel.app';
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: cleanEmail,
      options: {
        redirectTo: `${appUrl}/set-password?welcome=1`,
      },
    });

    if (linkErr || !linkData?.properties?.action_link) {
      console.error('[invite-staff] generateLink failed:', linkErr);
      // The staff record is created — admin will need to manually trigger a password
      // reset. Return a partial success so the UI shows the staff member but warns.
      return NextResponse.json({
        ...staff,
        warning: 'Staff added, but invitation link could not be generated. Have them use "Forgot password" on the sign-in page.',
      });
    }

    // 4. Send the invitation email via Resend
    try {
      await sendStaffInvite({
        recipientName: name ? String(name).trim() : null,
        recipientEmail: cleanEmail,
        homeName: authed.home.name,
        inviterName: authed.staff.name || authed.staff.email || 'Your colleague',
        inviteLink: linkData.properties.action_link,
        role,
      });
    } catch (emailErr) {
      console.error('[invite-staff] Failed to send invite email:', emailErr);
      // Don't fail the request — staff is created and admin can re-invite if needed.
      return NextResponse.json({
        ...staff,
        warning: 'Staff added, but the invitation email failed to send. Check your Resend setup, or send them this link manually: ' + linkData.properties.action_link,
      });
    }

    return NextResponse.json({
      ...staff,
      invited: true,
      message: `Invitation email sent to ${cleanEmail}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Invite staff error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
