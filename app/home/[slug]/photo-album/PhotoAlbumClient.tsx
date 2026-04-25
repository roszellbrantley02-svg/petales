'use client';

import type { Archive, Memory } from '@/lib/types';

interface Props {
  archive: Archive;
  photos: Memory[];
}

export default function PhotoAlbumClient({ archive, photos }: Props) {
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
        <h1 className="serif text-3xl font-medium mb-2">Photo Album</h1>
        <p className="text-muted text-sm mb-4">
          {photos.length === 0
            ? 'No photos have been contributed yet. Once family members add photos to the archive, they’ll appear here ready to print.'
            : `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'} contributed. Each prints on its own page with the contributor’s name and caption.`}
        </p>
        {photos.length > 0 && (
          <div className="bg-white border border-line rounded-xl p-4 mb-6 flex justify-end">
            <button
              onClick={() => window.print()}
              className="bg-ink text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-dark"
            >
              🖨 Print album
            </button>
          </div>
        )}

        {photos.length > 0 && (
          <p className="text-xs text-subtle italic mb-2 text-center">↓ Live preview (will be one photo per page when printed) ↓</p>
        )}
      </div>

      <div className="album-print">
        {/* Cover page */}
        <div className="album-page album-cover">
          <p className="album-label serif italic">A photo album for</p>
          <h1 className="album-name serif">{archive.subject_name}</h1>
          {archive.subject_dates && (
            <p className="album-dates serif">{archive.subject_dates}</p>
          )}
          <p className="album-meta serif italic">
            {photos.length} {photos.length === 1 ? 'photograph' : 'photographs'} contributed by family
          </p>
        </div>

        {photos.map((p, idx) => (
          <div key={p.id} className="album-page album-photo-page">
            {p.media_url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={p.media_url} alt={p.caption || ''} className="album-img" />
            )}
            <div className="album-caption">
              {p.caption && <p className="serif italic">{p.caption}</p>}
              <p className="album-attribution">
                — {p.author_name || 'Anonymous'}
                <span className="album-num"> · {idx + 1} of {photos.length}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        .album-print .album-page {
          width: 8.5in;
          aspect-ratio: 8.5 / 11;
          margin: 1.5rem auto;
          background: white;
          border: 1px solid #e8e2d6;
          border-radius: 8px;
          padding: 0.75in;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          box-shadow: 0 2px 8px rgba(42,38,35,0.06);
        }
        .album-print .album-cover {
          justify-content: center;
        }
        .album-print .album-label {
          font-size: 16pt;
          color: #6b6258;
          margin: 0 0 0.2in;
        }
        .album-print .album-name {
          font-size: 38pt;
          font-weight: 500;
          color: #2a2623;
          margin: 0 0 0.15in;
          line-height: 1.05;
        }
        .album-print .album-dates {
          font-size: 14pt;
          color: #6b6258;
          letter-spacing: 0.05em;
          margin: 0 0 0.4in;
        }
        .album-print .album-meta {
          font-size: 11pt;
          color: #6b6258;
          margin: 0;
        }
        .album-print .album-photo-page {
          justify-content: flex-start;
        }
        .album-print .album-img {
          max-width: 100%;
          max-height: 7in;
          object-fit: contain;
          margin-bottom: 0.3in;
        }
        .album-print .album-caption {
          width: 100%;
          margin-top: auto;
          padding-top: 0.2in;
          border-top: 1px solid #e8e2d6;
        }
        .album-print .album-caption p {
          font-size: 11pt;
          line-height: 1.4;
          margin: 0 0 6pt;
          color: #2a2623;
        }
        .album-print .album-attribution {
          font-style: normal !important;
          font-size: 9pt;
          color: #6b6258;
        }
        .album-print .album-num {
          color: #a89e92;
        }

        @media print {
          @page { size: letter; margin: 0; }
          body { background: white !important; margin: 0 !important; }
          .no-print { display: none !important; }
          .album-print { margin: 0 !important; padding: 0 !important; }
          .album-print .album-page {
            width: 8.5in;
            height: 11in;
            aspect-ratio: auto;
            margin: 0;
            border: none;
            border-radius: 0;
            box-shadow: none;
            page-break-after: always;
            break-after: page;
          }
          .album-print .album-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}
