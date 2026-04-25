// GET    /api/announcements?slug=xxx           — list past announcements + recipient suggestions
// POST   /api/announcements                     — send a new announcement to recipients
//
// Layered cost/abuse protection (matches /api/generate pattern):
//   1. HARD CAP — announcements per month
//   2. HARD CAP — emails per month (catches "many small announcements" abuse)
//   3. Global daily announcement cap
//   4. Per-archive daily announcement cap
//   5. Recipient count cap per announcement

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { LIMITS } from '@/lib/limits';
import { getResend, FROM_EMAIL, renderAnnouncementHtml, renderAnnouncementText } from '@/lib/resend';
import type { AnnouncementRecipient } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ——— GET ———
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 });

    const admin = supabaseAdmin();

    const { data: archive, error: aErr } = await admin
      .from('archives')
      .select('id')
      .eq('share_slug', slug)
      .single();
    if (aErr || !archive) {
      return NextResponse.json({ error: 'Archive not found' }, { status: 404 });
    }

    // Past announcements
    const { data: announcements } = await admin
      .from('announcements')
      .select('*')
      .eq('archive_id', archive.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Recipient suggestions: distinct (author_name, author_email) from memories
    // where the email is non-null
    const { data: memoryAuthors } = await admin
      .from('memories')
      .select('author_name, author_email')
      .eq('archive_id', archive.id)
      .not('author_email', 'is', null);

    const seen = new Set<string>();
    const recipients: AnnouncementRecipient[] = [];
    (memoryAuthors || []).forEach(m => {
      const email = (m.author_email || '').trim().toLowerCase();
      if (!email || seen.has(email)) return;
      seen.add(email);
      recipients.push({
        email: m.author_email!,
        name: m.author_name || null,
      });
    });

    return NextResponse.json({
      announcements: announcements || [],
      suggested_recipients: recipients,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ——— POST ———
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      slug,
      subject,
      body: messageBody,
      recipients,
    } = body as {
      slug: string;
      subject: string;
      body: string;
      recipients: AnnouncementRecipient[];
    };

    // ——— Validation ———
    if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    if (!subject || !subject.trim()) return NextResponse.json({ error: 'subject is required' }, { status: 400 });
    if (!messageBody || !messageBody.trim()) return NextResponse.json({ error: 'body is required' }, { status: 400 });
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'At least one recipient is required' }, { status: 400 });
    }

    if (subject.length > LIMITS.ANNOUNCEMENT_SUBJECT_MAX_CHARS) {
      return NextResponse.json(
        { error: `Subject too long (max ${LIMITS.ANNOUNCEMENT_SUBJECT_MAX_CHARS} chars)` },
        { status: 400 }
      );
    }
    if (messageBody.length > LIMITS.ANNOUNCEMENT_BODY_MAX_CHARS) {
      return NextResponse.json(
        { error: `Body too long (max ${LIMITS.ANNOUNCEMENT_BODY_MAX_CHARS} chars)` },
        { status: 400 }
      );
    }
    if (recipients.length > LIMITS.RECIPIENTS_PER_ANNOUNCEMENT_MAX) {
      return NextResponse.json(
        { error: `Too many recipients (max ${LIMITS.RECIPIENTS_PER_ANNOUNCEMENT_MAX} per announcement)` },
        { status: 400 }
      );
    }

    const validatedRecipients = recipients
      .filter(r => r && r.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))
      .map(r => ({ email: r.email.trim().toLowerCase(), name: r.name?.trim() || null }));

    if (validatedRecipients.length === 0) {
      return NextResponse.json({ error: 'No valid recipient email addresses' }, { status: 400 });
    }

    // ——— Caps ———
    const admin = supabaseAdmin();

    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    // Hard month cap on announcement count
    const { count: monthAnnouncementCount } = await admin
      .from('announcements')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString());

    if ((monthAnnouncementCount || 0) >= LIMITS.ANNOUNCEMENTS_PER_MONTH_HARD_CAP) {
      return NextResponse.json(
        { error: 'Monthly announcement limit reached. Edit lib/limits.ts to raise.', code: 'HARD_CAP_REACHED' },
        { status: 503 }
      );
    }

    // Hard month cap on email count
    const { data: monthDeliveries } = await admin
      .from('announcement_deliveries')
      .select('id')
      .gte('created_at', startOfMonth.toISOString());
    const monthEmailCount = (monthDeliveries || []).length;

    if (monthEmailCount + validatedRecipients.length > LIMITS.EMAILS_PER_MONTH_HARD_CAP) {
      return NextResponse.json(
        {
          error: `Sending ${validatedRecipients.length} more emails would exceed the monthly cap (${LIMITS.EMAILS_PER_MONTH_HARD_CAP}). Currently used: ${monthEmailCount}.`,
          code: 'EMAIL_HARD_CAP_REACHED',
        },
        { status: 503 }
      );
    }

    // Global daily cap
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const { count: globalDayCount } = await admin
      .from('announcements')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString());

    if ((globalDayCount || 0) >= LIMITS.ANNOUNCEMENTS_PER_DAY_GLOBAL) {
      return NextResponse.json(
        { error: 'Daily announcement limit reached for the platform. Try tomorrow.' },
        { status: 429 }
      );
    }

    // Lookup archive
    const { data: archive, error: aErr } = await admin
      .from('archives')
      .select('*')
      .eq('share_slug', slug)
      .single();
    if (aErr || !archive) {
      return NextResponse.json({ error: 'Archive not found' }, { status: 404 });
    }

    // Per-archive daily cap
    const { count: archiveDayCount } = await admin
      .from('announcements')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archive.id)
      .gte('created_at', startOfDay.toISOString());

    if ((archiveDayCount || 0) >= LIMITS.ANNOUNCEMENTS_PER_ARCHIVE_PER_DAY) {
      return NextResponse.json(
        { error: `This family has reached today's announcement limit (${LIMITS.ANNOUNCEMENTS_PER_ARCHIVE_PER_DAY}).` },
        { status: 429 }
      );
    }

    // ——— Create announcement record ———
    const { data: announcement, error: insertErr } = await admin
      .from('announcements')
      .insert({
        archive_id: archive.id,
        subject: subject.trim(),
        body: messageBody.trim(),
        status: 'sending',
        recipient_count: validatedRecipients.length,
      })
      .select()
      .single();

    if (insertErr || !announcement) {
      return NextResponse.json({ error: insertErr?.message || 'Failed to create announcement' }, { status: 500 });
    }

    // ——— Send via Resend ———
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://petales.canopytrove.com';
    const archiveUrl = `${appUrl}/p/${slug}`;

    // Get the Resend client (will throw a friendly error if no API key)
    let resend;
    try {
      resend = getResend();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Resend not configured';
      // Mark the announcement as failed so the UI shows it
      await admin
        .from('announcements')
        .update({ status: 'failed', failed_count: validatedRecipients.length })
        .eq('id', announcement.id);
      return NextResponse.json({ error: message, code: 'RESEND_NOT_CONFIGURED' }, { status: 503 });
    }

    let delivered = 0;
    let failed = 0;
    const deliveryRecords: Array<{
      announcement_id: string;
      recipient_email: string;
      recipient_name: string | null;
      delivery_status: 'sent' | 'failed';
      resend_message_id: string | null;
      error_message: string | null;
      sent_at: string;
    }> = [];

    for (const recipient of validatedRecipients) {
      const html = renderAnnouncementHtml({
        recipientName: recipient.name,
        subjectName: archive.subject_name,
        subjectDates: archive.subject_dates,
        body: messageBody,
        archiveUrl,
      });
      const text = renderAnnouncementText({
        recipientName: recipient.name,
        subjectName: archive.subject_name,
        subjectDates: archive.subject_dates,
        body: messageBody,
        archiveUrl,
      });

      try {
        const result = await resend.emails.send({
          from: FROM_EMAIL,
          to: recipient.email,
          subject: subject.trim(),
          html,
          text,
        });

        if (result.error) {
          failed++;
          deliveryRecords.push({
            announcement_id: announcement.id,
            recipient_email: recipient.email,
            recipient_name: recipient.name,
            delivery_status: 'failed',
            resend_message_id: null,
            error_message: result.error.message || 'Unknown send error',
            sent_at: new Date().toISOString(),
          });
        } else {
          delivered++;
          deliveryRecords.push({
            announcement_id: announcement.id,
            recipient_email: recipient.email,
            recipient_name: recipient.name,
            delivery_status: 'sent',
            resend_message_id: result.data?.id || null,
            error_message: null,
            sent_at: new Date().toISOString(),
          });
        }
      } catch (err: unknown) {
        failed++;
        deliveryRecords.push({
          announcement_id: announcement.id,
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          delivery_status: 'failed',
          resend_message_id: null,
          error_message: err instanceof Error ? err.message : 'Unknown error',
          sent_at: new Date().toISOString(),
        });
      }
    }

    // Bulk insert delivery records
    if (deliveryRecords.length > 0) {
      await admin.from('announcement_deliveries').insert(deliveryRecords);
    }

    // Update announcement with final status
    const finalStatus = failed === 0 ? 'sent' : (delivered === 0 ? 'failed' : 'sent');
    await admin
      .from('announcements')
      .update({
        status: finalStatus,
        delivered_count: delivered,
        failed_count: failed,
        sent_at: new Date().toISOString(),
      })
      .eq('id', announcement.id);

    return NextResponse.json({
      ok: true,
      announcement_id: announcement.id,
      delivered,
      failed,
      recipient_count: validatedRecipients.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Announcement send error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
