// ——————————————————————————————————————————————————
// Resend email client — for family announcement broadcaster.
//
// Free tier: 3,000 emails/month, 100/day.
// Verify a domain at https://resend.com/domains for production sending.
// For testing: onboarding@resend.dev works as a verified sender.
// ——————————————————————————————————————————————————

import { Resend } from 'resend';

// Lazy initialization — only construct the Resend client when something
// actually sends an email. This lets the app build and run without the API key,
// and only fails if/when the broadcaster is actually used.
let _resend: Resend | null = null;

export function getResend(): Resend {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      'RESEND_API_KEY is not set. Add it to your environment to enable announcement broadcasting.'
    );
  }
  _resend = new Resend(key);
  return _resend;
}

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

// ——————————————————————————————————————————————————
// HTML email template — Petales-branded, warm and quiet
// ——————————————————————————————————————————————————

export interface AnnouncementEmailData {
  recipientName: string | null;
  subjectName: string;
  subjectDates: string | null;
  body: string;
  archiveUrl: string;
  homeName?: string;
}

export function renderAnnouncementHtml(data: AnnouncementEmailData): string {
  const greeting = data.recipientName ? `Dear ${escapeHtml(data.recipientName)},` : 'Hello,';
  const home = data.homeName ? escapeHtml(data.homeName) : '';

  // Convert plain text body to HTML paragraphs
  const bodyHtml = escapeHtml(data.body)
    .split(/\n\n+/)
    .map(p => `<p style="margin: 0 0 16px; line-height: 1.65;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>In memory of ${escapeHtml(data.subjectName)}</title>
</head>
<body style="margin: 0; padding: 0; background: #faf8f4; font-family: Georgia, 'Times New Roman', serif; color: #2a2623;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #faf8f4; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background: #ffffff; border-radius: 12px; padding: 48px 40px;">
          <tr>
            <td>
              <p style="font-style: italic; color: #6b6258; margin: 0 0 12px; font-size: 16px;">In memory of</p>
              <h1 style="font-weight: 500; font-size: 32px; margin: 0 0 6px; line-height: 1.15; letter-spacing: -0.01em; color: #2a2623;">
                ${escapeHtml(data.subjectName)}
              </h1>
              ${data.subjectDates ? `<p style="color: #6b6258; margin: 0 0 36px; font-size: 14px; letter-spacing: 0.04em;">${escapeHtml(data.subjectDates)}</p>` : '<div style="height: 36px;"></div>'}

              <p style="margin: 0 0 16px; line-height: 1.65; font-size: 16px;">${greeting}</p>

              <div style="font-size: 16px;">
                ${bodyHtml}
              </div>

              <hr style="border: none; border-top: 1px solid #e8e2d6; margin: 36px 0 24px;">

              <p style="color: #a89e92; font-size: 13px; line-height: 1.5; margin: 0;">
                This message was sent from ${escapeHtml(data.subjectName)}'s memory archive on Petales${home ? `, in care of ${home}` : ''}.<br>
                <a href="${escapeHtml(data.archiveUrl)}" style="color: #8b6f47; text-decoration: none;">Visit the archive →</a>
              </p>
            </td>
          </tr>
        </table>

        <p style="color: #a89e92; font-size: 12px; margin: 20px 0 0; font-family: -apple-system, system-ui, sans-serif;">
          A quiet place to gather what matters.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderAnnouncementText(data: AnnouncementEmailData): string {
  const greeting = data.recipientName ? `Dear ${data.recipientName},` : 'Hello,';
  return `${greeting}

In memory of ${data.subjectName}${data.subjectDates ? ` (${data.subjectDates})` : ''}

${data.body}

—

This message was sent from ${data.subjectName}'s memory archive on Petales${data.homeName ? `, in care of ${data.homeName}` : ''}.

Visit the archive: ${data.archiveUrl}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
