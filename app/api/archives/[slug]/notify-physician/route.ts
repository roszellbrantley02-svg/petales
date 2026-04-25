// POST /api/archives/[slug]/notify-physician — sends a Resend email to the
// attending physician asking them to certify cause of death in the state EDRS.
//
// STAFF-ONLY: ownership of the archive enforced.
// Bumps physician_reminded_count + physician_reminded_at. Returns whether
// the email was actually delivered (so the UI can fall back gracefully).

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireOwnedArchiveBySlug } from '@/lib/auth';
import { sendPhysicianReminder } from '@/lib/resend';

export const runtime = 'nodejs';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const guard = await requireOwnedArchiveBySlug(slug);
    if (guard.response) return guard.response;
    const archive = guard.archive as typeof guard.archive & {
      physician_name?: string | null;
      physician_email?: string | null;
      physician_reminded_count?: number | null;
    };

    const physicianEmail = archive.physician_email;
    if (!physicianEmail) {
      return NextResponse.json({ error: 'No physician email saved on this archive yet.' }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // Get the home name for the email signature
    const { data: home } = await admin
      .from('funeral_homes')
      .select('name')
      .eq('id', archive.home_id)
      .single();

    let emailSent = false;
    let emailError: string | null = null;
    try {
      const result = await sendPhysicianReminder({
        physicianName: archive.physician_name || null,
        physicianEmail,
        decedentName: archive.subject_name || 'the decedent',
        homeName: home?.name || 'Your funeral home',
      });
      if (result?.error) {
        emailError = result.error.message || 'Resend rejected the send';
      } else {
        emailSent = true;
      }
    } catch (e) {
      emailError = e instanceof Error ? e.message : 'Unknown error';
    }

    // Bump the reminder counter regardless of email delivery — the click is the action.
    const newCount = (archive.physician_reminded_count || 0) + 1;
    const now = new Date().toISOString();
    await admin
      .from('archives')
      .update({
        physician_reminded_at: now,
        physician_reminded_count: newCount,
      })
      .eq('id', archive.id);

    return NextResponse.json({
      ok: true,
      emailSent,
      emailError,
      reminded_at: now,
      reminded_count: newCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[notify-physician] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
