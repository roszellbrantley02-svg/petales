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

// ——————————————————————————————————————————————————
// Staff invitation email — sent when an admin adds a new staff member.
// The invitee receives a link to set their own password and sign in.
// ——————————————————————————————————————————————————

export interface StaffInviteEmailData {
  recipientName: string | null;
  recipientEmail: string;
  homeName: string;
  inviterName: string;
  inviteLink: string;
  role: string;
}

const ROLE_LABELS_EMAIL: Record<string, string> = {
  admin: 'Admin',
  director: 'Director',
  staff: 'Staff',
};

export function renderStaffInviteHtml(data: StaffInviteEmailData): string {
  const greeting = data.recipientName ? `Hi ${escapeHtml(data.recipientName)},` : 'Hello,';
  const roleLabel = ROLE_LABELS_EMAIL[data.role] || data.role;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>You're invited to ${escapeHtml(data.homeName)} on Petales</title>
</head>
<body style="margin: 0; padding: 0; background: #faf8f4; font-family: Georgia, 'Times New Roman', serif; color: #2a2623;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #faf8f4; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background: #ffffff; border-radius: 12px; padding: 44px 36px;">
          <tr>
            <td>
              <div style="font-family: Georgia, serif; font-size: 24px; font-weight: 500; color: #2a2623; letter-spacing: -0.01em;">Petales</div>
              <div style="font-style: italic; font-size: 13px; color: #6b6258; margin-top: 4px;">A quiet place to gather what matters.</div>

              <hr style="border: none; border-top: 1px solid #e8e2d6; margin: 28px 0;">

              <p style="margin: 0 0 16px; line-height: 1.65; font-size: 16px;">${greeting}</p>

              <p style="margin: 0 0 16px; line-height: 1.65; font-size: 16px;">
                <strong style="color: #2a2623;">${escapeHtml(data.inviterName)}</strong> has invited you to join
                <strong style="color: #2a2623;">${escapeHtml(data.homeName)}</strong> on Petales as
                <strong style="color: #2a2623;">${escapeHtml(roleLabel)}</strong>.
              </p>

              <p style="margin: 0 0 24px; line-height: 1.65; font-size: 16px;">
                Petales is the quiet place we use to help families gather memories of the people they've lost &mdash; voice notes, photos, stories &mdash; and weave them into the obituary, eulogy, and program. Click the button below to set your password and sign in.
              </p>

              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 28px;">
                <tr>
                  <td align="center" style="background: #2a2623; border-radius: 8px;">
                    <a href="${escapeHtml(data.inviteLink)}" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, system-ui, sans-serif; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Set your password &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px; line-height: 1.55; font-size: 13px; color: #6b6258;">
                This link is good for 24 hours. If it's expired, ask ${escapeHtml(data.inviterName)} to send a new invitation.
              </p>

              <hr style="border: none; border-top: 1px solid #e8e2d6; margin: 28px 0;">

              <p style="margin: 0; line-height: 1.55; font-size: 12px; color: #a89e92; font-style: italic;">
                If you weren't expecting this invitation, it's safe to ignore this email &mdash; nothing happens until you click the button above.
              </p>
            </td>
          </tr>
        </table>

        <p style="color: #a89e92; font-size: 11px; margin: 16px 0 0; font-family: -apple-system, system-ui, sans-serif;">
          Petales &middot; A quiet place to gather what matters.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderStaffInviteText(data: StaffInviteEmailData): string {
  const greeting = data.recipientName ? `Hi ${data.recipientName},` : 'Hello,';
  const roleLabel = ROLE_LABELS_EMAIL[data.role] || data.role;
  return `${greeting}

${data.inviterName} has invited you to join ${data.homeName} on Petales as ${roleLabel}.

Petales is the quiet place we use to help families gather memories of the people they've lost — voice notes, photos, stories — and weave them into the obituary, eulogy, and program.

Click the link below to set your password and sign in:
${data.inviteLink}

This link is good for 24 hours. If it's expired, ask ${data.inviterName} to send a new invitation.

If you weren't expecting this invitation, it's safe to ignore this email — nothing happens until you click the link.

— Petales
`;
}

export async function sendStaffInvite(data: StaffInviteEmailData) {
  const resend = getResend();
  return resend.emails.send({
    from: FROM_EMAIL,
    to: data.recipientEmail,
    subject: `${data.inviterName} invited you to join ${data.homeName} on Petales`,
    html: renderStaffInviteHtml(data),
    text: renderStaffInviteText(data),
  });
}
