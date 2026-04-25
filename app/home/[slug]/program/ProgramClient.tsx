'use client';

// ProgramClient — the printable memorial program for one archive.
//
// Pulls the most recent generated content for each relevant tool and arranges
// it into a finished pamphlet layout. Director picks which content goes where,
// then clicks Print. Browser handles the actual paper output.
//
// No PDF library — careful @media print CSS produces a clean printout. The
// director can also "Save as PDF" from the browser print dialog and send the
// PDF to a print shop.

import { useState } from 'react';
import type { Archive } from '@/lib/types';

interface Props {
  archive: Archive;
  homeName: string;
  latest: Record<string, string>;
}

type Format = 'bifold' | 'card';

interface SlotChoice {
  label: string;
  toolKey: string | null; // null = use a manually written line
  manual?: string;
}

export default function ProgramClient({ archive, homeName, latest }: Props) {
  // Sensible defaults — pick the best generation for each panel
  const inside1Choices: SlotChoice[] = [
    { label: 'Order of Service', toolKey: 'order_of_service' },
    { label: 'Memorial Program (full)', toolKey: 'memorial_program' },
    { label: 'Service-Day Timeline', toolKey: 'service_timeline' },
  ].filter(c => latest[c.toolKey || '']);

  const inside2Choices: SlotChoice[] = [
    { label: 'Personal Obituary', toolKey: 'obit_personal' },
    { label: 'Celebratory Obituary', toolKey: 'obit_celebratory' },
    { label: 'Traditional Obituary', toolKey: 'obit_traditional' },
    { label: 'Eulogy Draft', toolKey: 'eulogy' },
    { label: 'Readings & Music', toolKey: 'reading_music_suggestions' },
  ].filter(c => latest[c.toolKey || '']);

  const backChoices: SlotChoice[] = [
    { label: 'Memorial Card text', toolKey: 'memorial_card' },
    { label: 'Acknowledgment Letter', toolKey: 'acknowledgment_letter' },
    { label: 'Grief Resources', toolKey: 'grief_resources' },
  ].filter(c => latest[c.toolKey || '']);

  const [format, setFormat] = useState<Format>('bifold');
  const [inside1Key, setInside1Key] = useState<string | null>(inside1Choices[0]?.toolKey || null);
  const [inside2Key, setInside2Key] = useState<string | null>(inside2Choices[0]?.toolKey || null);
  const [backKey, setBackKey] = useState<string | null>(backChoices[0]?.toolKey || null);
  const [coverEpitaph, setCoverEpitaph] = useState<string>('In Loving Memory');
  const [showControls, setShowControls] = useState(true);

  const inside1Content = inside1Key ? latest[inside1Key] : '';
  const inside2Content = inside2Key ? latest[inside2Key] : '';
  const backContent = backKey ? latest[backKey] : '';

  function printNow() {
    setShowControls(false);
    setTimeout(() => {
      window.print();
      // Restore controls after print dialog closes
      setTimeout(() => setShowControls(true), 200);
    }, 100);
  }

  // Helper to render text with paragraph breaks
  function renderText(text: string) {
    if (!text) return null;
    return text.split(/\n\n+/).map((para, i) => (
      <p key={i}>{para.split('\n').map((line, j, arr) => (
        <span key={j}>
          {line}
          {j < arr.length - 1 && <br />}
        </span>
      ))}</p>
    ));
  }

  const hasAnyContent = !!(inside1Content || inside2Content || backContent);

  return (
    <div className="min-h-screen bg-cream">
      {/* Top nav — hidden on print */}
      <div className="bg-white border-b border-line px-6 py-4 flex justify-between items-center no-print">
        <div className="flex items-center gap-3">
          <span className="serif text-xl font-medium">Petales</span>
          <span className="text-subtle">·</span>
          <span className="text-sm font-medium text-ink">{archive.subject_name}</span>
        </div>
        <a href={`/home/${archive.share_slug}`} className="text-muted text-sm hover:text-ink">
          ← Back to archive
        </a>
      </div>

      {/* Controls panel — hidden on print */}
      {showControls && (
        <div className="max-w-4xl mx-auto px-6 py-6 no-print">
          <h1 className="serif text-3xl font-medium mb-2">Memorial Program</h1>
          <p className="text-muted text-sm mb-6">
            Pick what goes on each panel, then print. The browser&rsquo;s print dialog also lets you &ldquo;Save as PDF&rdquo; if you want to send it to a print shop.
          </p>

          {!hasAnyContent && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-5 text-sm">
              <strong className="text-amber-900">Generate content first.</strong>
              <p className="text-amber-800 mt-1">
                There&rsquo;s no AI-generated content in the archive yet. Go back to the archive and generate at least an Order of Service and an Obituary — those fill the inside panels.
              </p>
            </div>
          )}

          <div className="bg-white border border-line rounded-2xl p-5 mb-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as Format)}
                  className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm"
                >
                  <option value="bifold">Bifold pamphlet (letter folded in half)</option>
                  <option value="card">Memorial card (wallet-size, 4 per sheet)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Cover line
                </label>
                <input
                  type="text"
                  value={coverEpitaph}
                  onChange={(e) => setCoverEpitaph(e.target.value)}
                  className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            {format === 'bifold' && (
              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                    Inside left
                  </label>
                  <select
                    value={inside1Key || ''}
                    onChange={(e) => setInside1Key(e.target.value || null)}
                    className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">— blank —</option>
                    {inside1Choices.map((c) => (
                      <option key={c.toolKey} value={c.toolKey || ''}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                    Inside right
                  </label>
                  <select
                    value={inside2Key || ''}
                    onChange={(e) => setInside2Key(e.target.value || null)}
                    className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">— blank —</option>
                    {inside2Choices.map((c) => (
                      <option key={c.toolKey} value={c.toolKey || ''}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                    Back cover
                  </label>
                  <select
                    value={backKey || ''}
                    onChange={(e) => setBackKey(e.target.value || null)}
                    className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">— blank —</option>
                    {backChoices.map((c) => (
                      <option key={c.toolKey} value={c.toolKey || ''}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-xs text-subtle italic">
                Preview below shows roughly how it will print. Use Print (or browser&apos;s &ldquo;Save as PDF&rdquo;) for the real output.
              </p>
              <button
                onClick={printNow}
                disabled={!hasAnyContent}
                className="bg-ink text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-dark disabled:bg-subtle disabled:cursor-not-allowed"
              >
                🖨 Print
              </button>
            </div>
          </div>

          <p className="text-xs text-subtle mb-4 text-center italic">
            ↓ Live preview ↓
          </p>
        </div>
      )}

      {/* The actual printable program */}
      <div className="program-print">
        {format === 'bifold' && (
          <>
            {/* SHEET 1 (outside): back cover | front cover (when folded) */}
            <div className="sheet">
              <div className="panel panel-back">
                <div className="panel-inner">
                  {backContent ? (
                    <div className="prose-print">{renderText(backContent)}</div>
                  ) : (
                    <p className="serif italic text-muted center">
                      In care of {homeName}
                    </p>
                  )}
                </div>
              </div>
              <div className="panel panel-cover">
                <div className="panel-inner cover-inner">
                  <p className="cover-epitaph serif italic">{coverEpitaph}</p>
                  {archive.cover_photo_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={archive.cover_photo_url} alt={archive.subject_name} className="cover-photo" />
                  )}
                  <h1 className="cover-name serif">{archive.subject_name}</h1>
                  {archive.subject_dates && (
                    <p className="cover-dates serif">{archive.subject_dates}</p>
                  )}
                </div>
              </div>
            </div>

            {/* SHEET 2 (inside): left | right (when opened) */}
            <div className="sheet">
              <div className="panel panel-inside-left">
                <div className="panel-inner">
                  {inside1Content && (
                    <div className="prose-print">{renderText(inside1Content)}</div>
                  )}
                </div>
              </div>
              <div className="panel panel-inside-right">
                <div className="panel-inner">
                  {inside2Content && (
                    <div className="prose-print">{renderText(inside2Content)}</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {format === 'card' && (
          <div className="card-sheet">
            {/* Four cards per letter sheet, 4x6 each (will be cut apart) */}
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="memorial-card">
                {archive.cover_photo_url && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={archive.cover_photo_url} alt="" className="card-photo" />
                )}
                <p className="card-epitaph serif italic">{coverEpitaph}</p>
                <h2 className="card-name serif">{archive.subject_name}</h2>
                {archive.subject_dates && (
                  <p className="card-dates">{archive.subject_dates}</p>
                )}
                {backContent && (
                  <p className="card-back-line serif italic">
                    {backContent.split('\n')[0].slice(0, 120)}…
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Print and preview styles */}
      <style jsx global>{`
        /* Screen preview */
        .program-print .sheet {
          width: 100%;
          max-width: 11in;
          margin: 1.5rem auto;
          background: #ffffff;
          border: 1px solid #e8e2d6;
          border-radius: 8px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          aspect-ratio: 11 / 8.5;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(42,38,35,0.06);
        }
        .program-print .panel {
          padding: 0.4in;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .program-print .panel + .panel {
          border-left: 1px dashed #e8e2d6;
        }
        .program-print .panel-inner {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .program-print .cover-inner {
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .program-print .cover-epitaph {
          color: #6b6258;
          font-size: 14px;
          margin: 0 0 16px;
        }
        .program-print .cover-photo {
          width: 2in;
          height: 2in;
          border-radius: 50%;
          object-fit: cover;
          margin: 0 auto 16px;
          border: 2px solid #e8e2d6;
        }
        .program-print .cover-name {
          font-size: 26px;
          font-weight: 500;
          margin: 0 0 8px;
          color: #2a2623;
          letter-spacing: -0.01em;
          line-height: 1.15;
        }
        .program-print .cover-dates {
          color: #6b6258;
          font-size: 13px;
          margin: 0;
          letter-spacing: 0.05em;
        }
        .program-print .prose-print {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 10.5pt;
          line-height: 1.45;
          color: #2a2623;
        }
        .program-print .prose-print p {
          margin: 0 0 0.6em;
        }
        .program-print .prose-print p:first-child {
          margin-top: 0;
        }

        /* Memorial card preview */
        .program-print .card-sheet {
          width: 8.5in;
          margin: 1.5rem auto;
          background: white;
          border: 1px solid #e8e2d6;
          border-radius: 8px;
          padding: 0.25in;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.25in;
          box-shadow: 0 2px 8px rgba(42,38,35,0.06);
        }
        .program-print .memorial-card {
          aspect-ratio: 4 / 6;
          border: 1px dashed #e8e2d6;
          padding: 0.3in;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .program-print .card-photo {
          width: 1.4in;
          height: 1.4in;
          border-radius: 50%;
          object-fit: cover;
          margin-bottom: 12px;
        }
        .program-print .card-epitaph {
          font-size: 11px;
          color: #6b6258;
          margin: 0 0 8px;
        }
        .program-print .card-name {
          font-size: 16pt;
          margin: 0 0 4px;
          color: #2a2623;
        }
        .program-print .card-dates {
          font-size: 9pt;
          color: #6b6258;
          letter-spacing: 0.05em;
          margin: 0 0 12px;
        }
        .program-print .card-back-line {
          font-size: 8pt;
          color: #6b6258;
          margin: 0;
        }

        /* PRINT — actual paper output */
        @media print {
          @page { size: letter landscape; margin: 0; }
          body { background: white !important; margin: 0 !important; }
          .no-print { display: none !important; }
          .program-print {
            margin: 0 !important;
            padding: 0 !important;
          }
          .program-print .sheet {
            width: 11in;
            height: 8.5in;
            max-width: none;
            margin: 0;
            page-break-after: always;
            break-after: page;
            border: none;
            border-radius: 0;
            box-shadow: none;
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
          .program-print .sheet:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .program-print .panel {
            padding: 0.4in;
          }
          .program-print .panel + .panel {
            border-left: none;
          }
          .program-print .card-sheet {
            width: 8.5in;
            height: 11in;
            margin: 0;
            padding: 0.25in;
            border: none;
            border-radius: 0;
            box-shadow: none;
          }
          @page { size: letter; margin: 0; }
        }
      `}</style>
    </div>
  );
}
