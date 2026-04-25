// POST /api/auth/forgot-password — sends a password reset link to the user.
//
// Always returns a generic success (don't leak whether an email is registered).
// If the email exists, generates a Supabase recovery link and tries to send it
// via Resend. Doesn't return the link in the response (would leak existence).

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendPasswordReset } from '@/lib/resend';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // Look up the staff record (also implies an auth user exists for this email)
    const { data: staff } = await admin
      .from('staff')
      .select('id, name, email, home_id, funeral_homes(name)')
      .eq('email', email)
      .maybeSingle();

    if (!staff) {
      // Don't reveal that the email is unknown — return generic success
      return NextResponse.json({ ok: true });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://petales-gold.vercel.app';

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${appUrl}/set-password`,
      },
    });

    if (linkErr || !linkData?.properties?.action_link) {
      console.error('[forgot-password] generateLink failed:', linkErr);
      // Still return generic success
      return NextResponse.json({ ok: true });
    }

    const homeName = (staff as { funeral_homes?: { name?: string } | null }).funeral_homes?.name || 'your funeral home';

    try {
      await sendPasswordReset({
        recipientName: staff.name || null,
        recipientEmail: email,
        homeName,
        resetLink: linkData.properties.action_link,
      });
    } catch (e) {
      console.warn('[forgot-password] Resend send failed:', e);
      // Still return generic success — caller can't tell delivery failed
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
