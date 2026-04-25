'use client';

import { useState, useMemo } from 'react';
import type { Archive, Memory } from '@/lib/types';
import PrintShopActions, { ArtifactType } from '../PrintShopActions';

interface Props {
  archive: Archive;
  memories: Memory[];
}

export default function PosterClient({ archive, memories }: Props) {
  // Suggest quotes from text memories — prioritize last_words, then short ones
  const quoteOptions = useMemo(() => {
    const texts = memories.filter(
      (m) => m.memory_type === 'text' && m.text_content && m.text_content.trim().length > 0
    );
    // Sort: last_words first, then shortest (fits the poster better)
    const sorted = [...texts].sort((a, b) => {
      if (!!a.is_last_words !== !!b.is_last_words) return a.is_last_words ? -1 : 1;
      return (a.text_content || '').length - (b.text_content || '').length;
    });
    return sorted.slice(0, 6).map((m) => ({
      id: m.id,
      author: m.author_name,
      text: (m.text_content || '').trim(),
    }));
  }, [memories]);

  const [selectedQuoteId, setSelectedQuoteId] = useState<string>(
    quoteOptions[0]?.id || ''
  );
  const [customQuote, setCustomQuote] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const quote = useCustom
    ? { text: customQuote, author: customAuthor || null }
    : quoteOptions.find((q) => q.id === selectedQuoteId) || null;

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
        <h1 className="serif text-3xl font-medium mb-2">Memorial Poster</h1>
        <p className="text-muted text-sm mb-4">
          Single 8.5×11 portrait sheet. Print on heavy cardstock or have a print shop blow it up to 11×17 or 18×24 for an entrance easel.
        </p>

        <div className="bg-white border border-line rounded-2xl p-5 mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
            Featured quote
          </label>
          {quoteOptions.length > 0 && !useCustom && (
            <select
              value={selectedQuoteId}
              onChange={(e) => setSelectedQuoteId(e.target.value)}
              className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm mb-3"
            >
              {quoteOptions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.author}: &ldquo;{q.text.slice(0, 60)}{q.text.length > 60 ? '…' : ''}&rdquo;
                </option>
              ))}
            </select>
          )}
          <label className="flex items-center gap-2 mb-3 text-sm">
            <input
              type="checkbox"
              checked={useCustom}
              onChange={(e) => setUseCustom(e.target.checked)}
            />
            Write my own quote
          </label>
          {useCustom && (
            <>
              <textarea
                value={customQuote}
                onChange={(e) => setCustomQuote(e.target.value)}
                placeholder="Quote text..."
                rows={3}
                className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm font-serif italic mb-2"
              />
              <input
                type="text"
                value={customAuthor}
                onChange={(e) => setCustomAuthor(e.target.value)}
                placeholder="Attribution (optional)"
                className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm"
              />
            </>
          )}

          <div className="flex justify-end mt-4">
            <button
              onClick={() => window.print()}
              className="bg-ink text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-dark"
            >
              🖨 Print
            </button>
          </div>
        </div>

        <p className="text-xs text-subtle italic mb-2 text-center">↓ Live preview ↓</p>
      </div>

      <div className="poster-print">
        <div className="poster-sheet">
          {archive.cover_photo_url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={archive.cover_photo_url} alt="" className="poster-photo" />
          )}
          <p className="poster-label serif italic">In Loving Memory of</p>
          <h1 className="poster-name serif">{archive.subject_name}</h1>
          {archive.subject_dates && (
            <p className="poster-dates serif">{archive.subject_dates}</p>
          )}
          {quote && quote.text && (
            <div className="poster-quote">
              <p className="serif italic">&ldquo;{quote.text}&rdquo;</p>
              {quote.author && <p className="poster-attribution serif">— {quote.author}</p>}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .poster-print .poster-sheet {
          width: 8.5in;
          aspect-ratio: 8.5 / 11;
          margin: 1.5rem auto;
          background: white;
          border: 1px solid #e8e2d6;
          border-radius: 8px;
          padding: 1in 0.75in;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          box-shadow: 0 2px 8px rgba(42,38,35,0.06);
        }
        .poster-print .poster-photo {
          width: 4in;
          height: 4in;
          border-radius: 50%;
          object-fit: cover;
          margin-bottom: 0.4in;
          border: 3px solid #e8e2d6;
        }
        .poster-print .poster-label {
          font-size: 18pt;
          color: #6b6258;
          margin: 0 0 0.15in;
        }
        .poster-print .poster-name {
          font-size: 44pt;
          font-weight: 500;
          color: #2a2623;
          margin: 0 0 0.1in;
          line-height: 1.05;
          letter-spacing: -0.01em;
        }
        .poster-print .poster-dates {
          font-size: 16pt;
          color: #6b6258;
          letter-spacing: 0.05em;
          margin: 0 0 0.5in;
        }
        .poster-print .poster-quote {
          margin-top: auto;
          padding-top: 0.4in;
          border-top: 1px solid #e8e2d6;
          width: 100%;
        }
        .poster-print .poster-quote p {
          font-size: 14pt;
          color: #3d3733;
          line-height: 1.45;
          margin: 0 0 0.15in;
        }
        .poster-print .poster-attribution {
          font-size: 11pt;
          color: #6b6258;
          font-style: normal !important;
          margin: 0;
        }

        @media print {
          @page { size: letter; margin: 0; }
          body { background: white !important; margin: 0 !important; }
          .no-print { display: none !important; }
          .poster-print { margin: 0 !important; padding: 0 !important; }
          .poster-print .poster-sheet {
            width: 8.5in;
            height: 11in;
            aspect-ratio: auto;
            margin: 0;
            border: none;
            border-radius: 0;
            box-shadow: none;
          }
        }
      `}</style>
    
      <PrintShopActions artifactType={"poster" as ArtifactType} decedentName={archive.subject_name} />
      </div>
  );
}
