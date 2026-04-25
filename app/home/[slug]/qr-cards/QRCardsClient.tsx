'use client';

import type { Archive } from '@/lib/types';
import PrintShopActions, { ArtifactType } from '../PrintShopActions';

interface Props {
  archive: Archive;
  qrDataUrl: string;
  familyUrl: string;
}

export default function QRCardsClient({ archive, qrDataUrl, familyUrl }: Props) {
  // 8 cards per letter sheet (4 rows x 2 cols), each ~3.5" x 2" business-card sized
  const cards = Array.from({ length: 10 }, (_, i) => i);

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-white border-b border-line px-6 py-4 flex justify-between items-center no-print">
        <div className="flex items-center gap-3">
          <span className="serif text-xl font-medium">Petales</span>
          <span className="text-subtle">·</span>
          <span className="text-sm font-medium text-ink">{archive.subject_name}</span>
        </div>
        <a href={`/home/${archive.share_slug}/print`} className="text-muted text-sm hover:text-ink">
          ← All print materials
        </a>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 no-print">
        <h1 className="serif text-3xl font-medium mb-2">QR Code Cards</h1>
        <p className="text-muted text-sm mb-4">
          10 small cards per letter sheet. Hand them out at the service so attendees can scan and visit {archive.subject_name}&rsquo;s archive on their phones.
        </p>
        <div className="bg-white border border-line rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
          <p className="text-xs text-muted break-all">
            QR points to: <span className="font-mono text-ink">{familyUrl}</span>
          </p>
          <button
            onClick={() => window.print()}
            className="bg-ink text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-dark whitespace-nowrap"
          >
            🖨 Print
          </button>
        </div>
        <p className="text-xs text-subtle italic mb-2 text-center">↓ Live preview ↓</p>
      </div>

      <div className="qr-print">
        <div className="qr-sheet">
          {cards.map((i) => (
            <div key={i} className="qr-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR code" className="qr-img" />
              <div className="qr-text">
                <p className="qr-title serif">In memory of</p>
                <p className="qr-name serif">{archive.subject_name}</p>
                <p className="qr-cta">Scan to visit the family archive</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .qr-print .qr-sheet {
          width: 8.5in;
          margin: 1.5rem auto;
          background: white;
          border: 1px solid #e8e2d6;
          border-radius: 8px;
          padding: 0.4in 0.5in;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.15in;
          box-shadow: 0 2px 8px rgba(42,38,35,0.06);
        }
        .qr-print .qr-card {
          aspect-ratio: 3.5 / 2;
          border: 1px dashed #e8e2d6;
          padding: 0.1in;
          display: flex;
          align-items: center;
          gap: 0.15in;
        }
        .qr-print .qr-img {
          width: 1.5in;
          height: 1.5in;
          flex-shrink: 0;
        }
        .qr-print .qr-text {
          flex: 1;
          min-width: 0;
        }
        .qr-print .qr-title {
          font-style: italic;
          color: #6b6258;
          font-size: 9pt;
          margin: 0;
        }
        .qr-print .qr-name {
          font-size: 12pt;
          font-weight: 500;
          color: #2a2623;
          margin: 2pt 0 4pt;
          line-height: 1.1;
        }
        .qr-print .qr-cta {
          font-size: 8pt;
          color: #6b6258;
          font-style: italic;
          margin: 0;
        }

        @media print {
          @page { size: letter; margin: 0; }
          body { background: white !important; margin: 0 !important; }
          .no-print { display: none !important; }
          .qr-print { margin: 0 !important; padding: 0 !important; }
          .qr-print .qr-sheet {
            width: 8.5in;
            height: 11in;
            margin: 0;
            border: none;
            border-radius: 0;
            box-shadow: none;
            padding: 0.4in 0.5in;
          }
        }
      `}</style>
    
      <PrintShopActions artifactType={"qr-cards" as ArtifactType} decedentName={archive.subject_name} />
      </div>
  );
}
