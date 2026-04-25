'use client';

import { useState } from 'react';
import type { Archive } from '@/lib/types';

interface Props {
  archive: Archive;
}

const DEFAULT_PRAYERS: { label: string; text: string }[] = [
  {
    label: 'Eternal Rest (Catholic)',
    text: `Eternal rest grant unto them, O Lord,
and let perpetual light shine upon them.
May the souls of the faithful departed,
through the mercy of God, rest in peace.
Amen.`,
  },
  {
    label: 'Prayer of St. Francis',
    text: `Lord, make me an instrument of your peace.
Where there is hatred, let me sow love;
where there is injury, pardon;
where there is doubt, faith;
where there is despair, hope;
where there is darkness, light;
where there is sadness, joy.`,
  },
  {
    label: 'Memorare (Catholic)',
    text: `Remember, O most gracious Virgin Mary,
that never was it known that anyone who fled to your protection,
implored your help, or sought your intercession,
was left unaided.
Inspired with this confidence, I fly unto you,
O Virgin of virgins, my Mother.
To you I come, before you I stand, sinful and sorrowful.
O Mother of the Word Incarnate,
despise not my petitions,
but in your mercy hear and answer me.
Amen.`,
  },
  {
    label: 'Mizmor le-David (Jewish, Psalm 23)',
    text: `The Lord is my shepherd; I shall not want.
He maketh me to lie down in green pastures;
He leadeth me beside the still waters.
He restoreth my soul.
He leadeth me in the paths of righteousness for His name’s sake.
Yea, though I walk through the valley of the shadow of death,
I will fear no evil; for Thou art with me.`,
  },
  {
    label: 'Secular reflection',
    text: `Do not stand at my grave and weep,
I am not there; I do not sleep.
I am a thousand winds that blow,
I am the diamond glints on snow,
I am the sunlight on ripened grain,
I am the gentle autumn rain.

Do not stand at my grave and cry,
I am not there; I did not die.`,
  },
];

export default function PrayerCardClient({ archive }: Props) {
  const [prayerIdx, setPrayerIdx] = useState(0);
  const [customPrayer, setCustomPrayer] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const prayerText = useCustom ? customPrayer : DEFAULT_PRAYERS[prayerIdx].text;
  const cards = Array.from({ length: 4 }, (_, i) => i);

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
        <h1 className="serif text-3xl font-medium mb-2">Prayer Cards</h1>
        <p className="text-muted text-sm mb-4">
          4 prayer cards per letter sheet. Print on cardstock. Cut along the dashed lines.
        </p>

        <div className="bg-white border border-line rounded-2xl p-5 mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
            Prayer
          </label>
          <select
            value={useCustom ? '__custom' : prayerIdx}
            onChange={(e) => {
              if (e.target.value === '__custom') {
                setUseCustom(true);
              } else {
                setUseCustom(false);
                setPrayerIdx(parseInt(e.target.value, 10));
              }
            }}
            className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm mb-3"
          >
            {DEFAULT_PRAYERS.map((p, i) => (
              <option key={i} value={i}>{p.label}</option>
            ))}
            <option value="__custom">Write my own…</option>
          </select>

          {useCustom && (
            <textarea
              value={customPrayer}
              onChange={(e) => setCustomPrayer(e.target.value)}
              placeholder="Type the prayer or reading you want on the back of each card."
              rows={6}
              className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm font-serif"
            />
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

      <div className="prayer-print">
        <div className="prayer-sheet">
          {cards.map((i) => (
            <div key={i} className="prayer-card">
              <div className="prayer-front">
                {archive.cover_photo_url && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={archive.cover_photo_url} alt="" className="prayer-photo" />
                )}
                <p className="prayer-front-label serif italic">In Loving Memory</p>
                <h2 className="prayer-front-name serif">{archive.subject_name}</h2>
                {archive.subject_dates && (
                  <p className="prayer-front-dates">{archive.subject_dates}</p>
                )}
              </div>
              <div className="prayer-back">
                <pre className="prayer-text serif">{prayerText}</pre>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .prayer-print .prayer-sheet {
          width: 8.5in;
          margin: 1.5rem auto;
          background: white;
          border: 1px solid #e8e2d6;
          border-radius: 8px;
          padding: 0.5in;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.25in;
          box-shadow: 0 2px 8px rgba(42,38,35,0.06);
        }
        .prayer-print .prayer-card {
          aspect-ratio: 5 / 4;
          border: 1px dashed #e8e2d6;
          padding: 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          overflow: hidden;
        }
        .prayer-print .prayer-front,
        .prayer-print .prayer-back {
          padding: 0.18in;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
        }
        .prayer-print .prayer-back {
          border-left: 1px dotted #e8e2d6;
        }
        .prayer-print .prayer-photo {
          width: 1in;
          height: 1in;
          border-radius: 50%;
          object-fit: cover;
          margin-bottom: 6pt;
        }
        .prayer-print .prayer-front-label {
          font-size: 8pt;
          color: #6b6258;
          margin: 0 0 4pt;
        }
        .prayer-print .prayer-front-name {
          font-size: 11pt;
          font-weight: 500;
          color: #2a2623;
          margin: 0 0 2pt;
          line-height: 1.1;
        }
        .prayer-print .prayer-front-dates {
          font-size: 7pt;
          color: #6b6258;
          letter-spacing: 0.04em;
          margin: 0;
        }
        .prayer-print .prayer-text {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 7.5pt;
          line-height: 1.35;
          color: #2a2623;
          margin: 0;
          white-space: pre-wrap;
          font-style: italic;
        }

        @media print {
          @page { size: letter; margin: 0; }
          body { background: white !important; margin: 0 !important; }
          .no-print { display: none !important; }
          .prayer-print { margin: 0 !important; padding: 0 !important; }
          .prayer-print .prayer-sheet {
            width: 8.5in;
            height: 11in;
            margin: 0;
            border: none;
            border-radius: 0;
            box-shadow: none;
            padding: 0.5in;
          }
        }
      `}</style>
    </div>
  );
}
