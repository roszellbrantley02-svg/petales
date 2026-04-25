// ——————————————————————————————————————————————————
// Vendor email templates
//
// Each vendor type has a starting subject + body that the director
// can customize before sending. The output becomes a mailto: link so
// it opens in the director's existing email client (Outlook, Gmail,
// Apple Mail, whatever they already use).
//
// No real email sending happens here — that's a Phase 2 feature
// requiring Resend or Postmark integration.
// ——————————————————————————————————————————————————

import type { VendorType } from './types';

export interface VendorTemplate {
  subject: string;
  body: string;
}

export interface VendorContext {
  subjectName: string;
  subjectDates: string | null;
  serviceDate: string | null;
  homeName: string;
}

const HOME = '[Funeral Home Name]';
const SERVICE_DATE = '[service date — TBD]';
const SERVICE_LOCATION = '[service location — TBD]';

export const VENDOR_TYPE_LABELS: Record<VendorType, string> = {
  florist: 'Florist',
  clergy: 'Clergy / Officiant',
  musician: 'Musician / Organist',
  caterer: 'Caterer',
  transportation: 'Transportation',
  cemetery: 'Cemetery / Crematorium',
  photographer: 'Photographer / Videographer',
  reception_venue: 'Reception Venue',
  pallbearer: 'Pallbearer',
  other: 'Other',
};

export function buildVendorEmail(
  vendorType: VendorType,
  ctx: VendorContext
): VendorTemplate {
  const name = ctx.subjectName;
  const home = ctx.homeName || HOME;
  const date = ctx.serviceDate || SERVICE_DATE;

  switch (vendorType) {
    case 'florist':
      return {
        subject: `Floral arrangements — ${name} memorial service`,
        body:
`Hello,

I'm coordinating funeral arrangements for ${name}${ctx.subjectDates ? ' (' + ctx.subjectDates + ')' : ''} at ${home}. The family service is scheduled for ${date} at ${SERVICE_LOCATION}.

We need:
  - Casket spray (please confirm style preferences with the family)
  - Two standing arrangements for the chapel
  - One arrangement for the memorial table

Could you confirm availability and provide pricing? The family is open to color/style suggestions in keeping with seasonal availability.

Thank you,
${home}`,
      };

    case 'clergy':
      return {
        subject: `Officiating request — ${name} memorial service`,
        body:
`Dear [Reverend/Father/Rabbi/Pastor],

The family of ${name}${ctx.subjectDates ? ' (' + ctx.subjectDates + ')' : ''} respectfully requests your services to officiate the memorial on ${date} at ${SERVICE_LOCATION}.

The family will share specific readings and remembrances in advance. Would you be available to meet briefly with us before the service?

Please confirm your availability at your earliest convenience.

Gratefully,
${home}`,
      };

    case 'musician':
      return {
        subject: `Music for ${name} memorial service`,
        body:
`Hello,

We are coordinating the memorial service for ${name} on ${date} at ${SERVICE_LOCATION}. The family has requested live music and we would love to engage your services.

The service typically requires:
  - Prelude (15 min)
  - One hymn or song after the eulogy
  - Recessional

The family is happy to discuss specific selections — please let me know your availability and standard repertoire.

Thank you,
${home}`,
      };

    case 'caterer':
      return {
        subject: `Reception catering — ${name} memorial`,
        body:
`Hello,

We are coordinating a memorial reception following ${name}'s service on ${date} at ${SERVICE_LOCATION}.

Anticipated guest count: [TBD — usually 30–80]
Reception time: approximately [time TBD]
Style: light buffet / family-style

Please let me know:
  - Availability for the date
  - Sample menus and pricing
  - Any dietary accommodations you handle (vegetarian, kosher, gluten-free, etc.)

Thank you,
${home}`,
      };

    case 'transportation':
      return {
        subject: `Transportation request — ${name} memorial service`,
        body:
`Hello,

We need transportation services for ${name}'s memorial on ${date}.

Required:
  - Hearse for transfer from ${home} to service location and on to cemetery
  - One family limousine (capacity for [TBD])
  - Estimated total time: [TBD]

Could you confirm availability and pricing?

Thank you,
${home}`,
      };

    case 'cemetery':
      return {
        subject: `Interment scheduling — ${name}`,
        body:
`Hello,

We are scheduling interment for ${name}${ctx.subjectDates ? ' (' + ctx.subjectDates + ')' : ''} following the memorial service on ${date}.

Please confirm:
  - Available slots that day
  - Plot/niche details (already arranged)
  - Required documentation
  - Family directions for the day-of process

Thank you,
${home}`,
      };

    case 'photographer':
      return {
        subject: `Photography request — ${name} memorial service`,
        body:
`Hello,

The family of ${name} has requested professional photography of the memorial service on ${date} at ${SERVICE_LOCATION}.

Coverage needed:
  - Family arrival and reception line
  - Service ceremony (discreet, no flash during readings)
  - Reception highlights

Please confirm availability and pricing for [duration TBD].

Thank you,
${home}`,
      };

    case 'reception_venue':
      return {
        subject: `Reception venue inquiry — ${name} memorial`,
        body:
`Hello,

We are reserving a reception space for the family and friends of ${name} following the memorial service on ${date}.

Anticipated:
  - Guest count: [TBD]
  - Time: [TBD, usually 1–3 hours after service]
  - Catering: handled separately / through your venue (please specify)

Please confirm availability and rates.

Thank you,
${home}`,
      };

    case 'pallbearer':
      return {
        subject: `Pallbearer request — ${name} memorial service`,
        body:
`Dear [Name],

The family of ${name} is honored to ask you to serve as a pallbearer at the memorial service on ${date} at ${SERVICE_LOCATION}.

Your role would involve:
  - Arriving 30 minutes before the service
  - Carrying the casket from the chapel to the hearse and to the graveside
  - The family will provide a brief walkthrough on arrival

Please let us know if you can accept this honor.

With gratitude,
The family of ${name} (via ${home})`,
      };

    case 'other':
    default:
      return {
        subject: `Inquiry — ${name} memorial service`,
        body:
`Hello,

We are coordinating arrangements for ${name}'s memorial service on ${date} at ${SERVICE_LOCATION}.

[Details of the request go here.]

Please let us know if you can assist.

Thank you,
${home}`,
      };
  }
}

// Generates a mailto: URL with the templated subject and body.
// The director's default mail client opens with this prefilled.
export function vendorMailtoUrl(
  toEmail: string,
  template: VendorTemplate
): string {
  const params = new URLSearchParams({
    subject: template.subject,
    body: template.body,
  });
  return `mailto:${encodeURIComponent(toEmail)}?${params.toString()}`;
}
