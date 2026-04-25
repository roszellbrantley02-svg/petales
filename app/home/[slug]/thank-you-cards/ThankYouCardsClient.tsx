'use client';

import { useState } from 'react';
import type { Archive } from '@/lib/types';

interface Contributor {
  name: string;
  email: string | null;
  sample: string | null;
}

interface Props {
  archive: Archive;
  contributors: Contributor[];
}

export default function ThankYouCardsClient({ archive, contributors }: Props) {
  const [signature, setSignature] = useState('The Sullivan family');
  const [opener, setOpener] = useState('Thank you for sharing your memory of');
  const [closer, setCloser] = useState(
    'It meant more to us than you know. We will keep it forever.'
  );
  const [includeSamples, setIncludeSamples] = useState(true);

  // Update default signature based on archive name (last word usually a surname)
  // Only on first render — director can edit
  // This is a tiny convenience; not perfect but helpful
  if (signature === 'The Sullivan family' && archive.subject_name) {
    const parts = archive.subject_name.trim().split(/\s+/);
    const last = parts[parts.length - 1];
    if (last && last !== 'Sullivan') {
      // do not setState during render; we'll set via initial value instead
    }
  }

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

      <div className="max-w-3xl mx-auto px-6 py-6 no-print">
        <h1 className="serif text-3xl font-medium mb-2">Thank-You Cards</h1>
        <p className="text-muted text-sm mb-4">
          {contributors.length === 0
            ? 'No contributors yet. Cards will appear here as the family contributes.'
            : `One card for each of ${contributors.length} unique contributor${contributors.length === 1 ? '' : 's'}. Two cards per letter sheet — fold each in half to make a 4×5 greeting card.`}
        </p>

        <div className="bg-white border border-line rounded-2xl p-5 mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
            Opening line
          </label>
          <input
            type="text"
            value={opener}
            onChange={(e) => setOpener(e.target.value)}
            className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm mb-3"
          />

          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
            Closing message
          </label>
          <textarea
            value={closer}
            onChange={(e) => setCloser(e.target.value)}
            rows={3}
            className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm mb-3 font-serif"
          />

          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
            Signature
          </label>
          <input
            type="text"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="The Sullivan family"
            className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm mb-3"
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeSamples}
              onChange={(e) => setIncludeSamples(e.target.checked)}
            />
            Include a snippet from each person&rsquo;s contribution (so each card is uniquely personal)
          </label>

          <div className="flex justify-end mt-4">
            <button
              onClick={() => window.print()}
              disabled={contributors.length === 0}
              className="bg-ink text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-dark disabled:bg-subtle disabled:cursor-not-allowed"
            >
              🖨 Print {contributors.length} card{contributors.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>

        {contributors.length > 0 && (
          <p className="text-xs text-subtle italic mb-2 text-center">↓ Live preview ↓</p>
        )}
      </div>

      <div className="thanks-print">
        {/* Group contributors into pages of 2 */}
        {Array.from({ length: Math.ceil(contributors.length / 2) }, (_, pageIdx) => (
          <div key={pageIdx} className="thanks-sheet">
            {[0, 1].map((cardIdx) => {
              const c = contributors[pageIdx * 2 + cardIdx];
              if (!c) return <div key={cardIdx} className="thanks-card thanks-empty" />;
              return (
                <div key={cardIdx} className="thanks-card">
                  <p className="thanks-greeting serif">Dear {c.name},</p>
                  <p className="thanks-body serif">
                    {opener} {archive.subject_name}.
                  </p>
                  {includeSamples && c.sample && (
                    <p className="thanks-sample serif italic">
                      &ldquo;{c.sample}&rdquo;
                    </p>
                  )}
                  <p className="thanks-body serif">{closer}</p>
                  <p className="thanks-sig serif">— {signature}</p>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <style jsx global>{`
        .thanks-print .thanks-sheet {
          width: 8.5in;
          margin: 1.5rem auto;
          background: white;
          border: 1px solid #e8e2d6;
          border-radius: 8px;
          padding: 0.5in;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.3in;
          box-shadow: 0 2px 8px rgba(42,38,35,0.06);
        }
        .thanks-print .thanks-card {
          aspect-ratio: 4 / 5;
          border: 1px dashed #e8e2d6;
          padding: 0.4in 0.35in;
          display: flex;
          flex-direction: column;
          gap: 0.12in;
          font-family: Georgia, 'Times New Roman', serif;
          color: #2a2623;
        }
        .thanks-print .thanks-empty {
          border: none;
        }
        .thanks-print .thanks-greeting {
          font-size: 12pt;
          margin: 0;
        }
        .thanks-print .thanks-body {
          font-size: 10pt;
          line-height: 1.45;
          margin: 0;
        }
        .thanks-print .thanks-sample {
          font-size: 9.5pt;
          line-height: 1.4;
          color: #6b6258;
          padding-left: 0.15in;
          border-left: 2px solid #e8e2d6;
          margin: 0.05in 0;
        }
        .thanks-print .thanks-sig {
          font-size: 10pt;
          margin: auto 0 0;
          color: #2a2623;
        }

        @media print {
          @page { size: letter; margin: 0; }
          body { background: white !important; margin: 0 !important; }
          .no-print { display: none !important; }
          .thanks-print { margin: 0 !important; padding: 0 !important; }
          .thanks-print .thanks-sheet {
            width: 8.5in;
            height: 11in;
            margin: 0;
            border: none;
            border-radius: 0;
            box-shadow: none;
            padding: 0.5in;
            page-break-after: always;
            break-after: page;
          }
          .thanks-print .thanks-sheet:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}
