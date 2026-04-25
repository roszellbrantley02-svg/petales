'use client';

// PrintShopActions — quiet section that appears on every print artifact page.
// Two paths for getting our PDF into a printer's hands:
//
//   1. Send to YOUR supplier — uses the home's configured supplier email.
//      Director clicks → email opens with order text pre-filled.
//      They attach the PDF (downloaded via the browser's print dialog) and send.
//
//   2. Order from a print shop — curated external services per artifact type.
//      Director clicks → opens the service in a new tab. They upload the PDF.
//
// Doesn't actually upload PDFs anywhere — just routes the director to the
// right place with the right message ready.

import { useEffect, useState } from 'react';

export type ArtifactType =
  | 'program'
  | 'poster'
  | 'prayer-card'
  | 'qr-cards'
  | 'photo-album'
  | 'thank-you-cards';

interface ExternalService {
  name: string;
  url: string;
  note: string;
}

const EXTERNAL_BY_TYPE: Record<ArtifactType, ExternalService[]> = {
  'program': [
    { name: 'Vistaprint — Brochures', url: 'https://www.vistaprint.com/marketing-materials/brochures', note: 'Most-used by funeral homes; bifold/trifold options' },
    { name: 'GotPrint — Programs', url: 'https://www.gotprint.com/products/booklets-prc.do', note: 'Cheaper wholesale rates' },
  ],
  'poster': [
    { name: 'Vistaprint — Posters', url: 'https://www.vistaprint.com/marketing-materials/posters', note: 'Standard sizes; 5-7 day shipping' },
    { name: 'FedEx Office', url: 'https://www.office.fedex.com/default/posters', note: 'Same-day pickup at local stores' },
    { name: 'Smartpress — Premium', url: 'https://www.smartpress.com/products/posters', note: 'Higher quality, more expensive' },
  ],
  'prayer-card': [
    { name: 'GotPrint — Prayer cards', url: 'https://www.gotprint.com/products/notepads-prc.do', note: 'Funeral-industry standard' },
    { name: 'Frazer Consultants', url: 'https://www.frazerconsultants.com', note: 'Funeral-home-specific stationery' },
    { name: 'Vistaprint — Postcards', url: 'https://www.vistaprint.com/marketing-materials/postcards', note: 'Use the postcard template at 4x6' },
  ],
  'qr-cards': [
    { name: 'Vistaprint — Business cards', url: 'https://www.vistaprint.com/business-cards', note: 'Standard 3.5x2 size; ships in days' },
    { name: 'MOO — Premium business cards', url: 'https://www.moo.com/us/products/business-cards', note: 'Heavier paper; better feel' },
    { name: 'GotPrint — Business cards', url: 'https://www.gotprint.com/products/business-cards-prc.do', note: 'Cheap, fast' },
  ],
  'photo-album': [
    { name: 'Lulu — Photo books', url: 'https://www.lulu.com/create/photo-books', note: 'Print-on-demand, hardcover available, has API' },
    { name: 'Blurb — Photo books', url: 'https://www.blurb.com/photo-books', note: 'Higher quality; premium tier' },
    { name: 'Shutterfly — Photo books', url: 'https://www.shutterfly.com/photo-books', note: 'Most consumer-familiar; cheap' },
    { name: 'Mixbook — Photo books', url: 'https://www.mixbook.com/photo-books', note: 'Premium options; long turnaround' },
  ],
  'thank-you-cards': [
    { name: 'Vistaprint — Thank you cards', url: 'https://www.vistaprint.com/stationery/note-cards', note: 'Cheap, includes envelopes' },
    { name: 'MOO — Note cards', url: 'https://www.moo.com/us/products/notecards', note: 'Premium feel; great for high-end homes' },
    { name: 'Shutterfly — Thank you cards', url: 'https://www.shutterfly.com/cards-stationery/thank-you-cards', note: 'Lots of templates' },
  ],
};

const ARTIFACT_LABELS: Record<ArtifactType, string> = {
  'program': 'memorial program',
  'poster': 'memorial poster',
  'prayer-card': 'prayer cards',
  'qr-cards': 'QR code cards',
  'photo-album': 'photo album',
  'thank-you-cards': 'thank-you cards',
};

interface Props {
  artifactType: ArtifactType;
  decedentName: string;
  serviceDate?: string | null;
}

interface SupplierSettings {
  print_supplier_name: string | null;
  print_supplier_email: string | null;
  print_supplier_notes: string | null;
  home_name: string;
}

export default function PrintShopActions({ artifactType, decedentName, serviceDate }: Props) {
  const [supplier, setSupplier] = useState<SupplierSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/home/settings', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSupplier(d || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function buildMailto(): string {
    if (!supplier?.print_supplier_email) return '';
    const subject = `Print order: ${ARTIFACT_LABELS[artifactType]} for ${decedentName}`;
    const bodyLines = [
      `Hi${supplier.print_supplier_name ? ' ' + supplier.print_supplier_name : ''},`,
      '',
      `Please print the attached ${ARTIFACT_LABELS[artifactType]} for ${decedentName}.${
        serviceDate ? ` Service is on ${serviceDate}.` : ''
      }`,
      '',
      'Quantity needed: ____',
      'Paper / finish: ____',
      'Delivery date needed by: ____',
    ];
    if (supplier.print_supplier_notes) {
      bodyLines.push('', supplier.print_supplier_notes);
    }
    bodyLines.push('', 'Thank you,', supplier.home_name);
    const body = bodyLines.join('\n');
    return `mailto:${encodeURIComponent(supplier.print_supplier_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const externals = EXTERNAL_BY_TYPE[artifactType] || [];

  return (
    <div className="max-w-3xl mx-auto px-6 mt-6 mb-12 no-print">
      <div className="bg-white border border-line rounded-2xl p-5">
        <h3 className="serif text-base font-medium mb-3">Don&rsquo;t want to print yourself?</h3>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Send to your supplier */}
          <div>
            <p className="text-xs uppercase tracking-wider text-muted mb-2">Your usual supplier</p>
            {loading && <p className="text-xs text-subtle italic">Loading…</p>}
            {!loading && supplier?.print_supplier_email && (
              <>
                <a
                  href={buildMailto()}
                  className="block w-full bg-ink text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-accent-dark text-center"
                >
                  ✉ Email{supplier.print_supplier_name ? ' ' + supplier.print_supplier_name : ' your supplier'}
                </a>
                <p className="text-[11px] text-subtle italic mt-2 leading-relaxed">
                  After clicking, save the PDF first (browser&rsquo;s print dialog → Save as PDF), then attach it in your email client before sending.
                </p>
              </>
            )}
            {!loading && !supplier?.print_supplier_email && (
              <>
                <p className="text-xs text-muted leading-relaxed mb-2">
                  No supplier configured yet.
                </p>
                <a
                  href="/home/settings"
                  className="text-xs text-accent hover:text-accent-dark underline"
                >
                  Set one up →
                </a>
              </>
            )}
          </div>

          {/* External services */}
          <div>
            <p className="text-xs uppercase tracking-wider text-muted mb-2">Or order online</p>
            <ul className="space-y-1">
              {externals.map((svc) => (
                <li key={svc.url}>
                  <a
                    href={svc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:text-accent-dark"
                  >
                    {svc.name} ↗
                  </a>
                  <p className="text-[11px] text-subtle italic leading-tight">
                    {svc.note}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
