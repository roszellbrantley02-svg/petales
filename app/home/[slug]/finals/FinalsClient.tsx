'use client';

import { useState } from 'react';
import type { Archive } from '@/lib/types';

interface Final {
  id: string;
  tool: string;
  content: string | null;
  edited_content: string;
  status: string;
  created_at: string;
  tradition: string | null;
  language: string | null;
}

interface Props {
  archive: Archive;
  finals: Final[];
}

const TOOL_LABELS: Record<string, string> = {
  obit_traditional: 'Obituary — Traditional',
  obit_celebratory: 'Obituary — Celebratory',
  obit_personal: 'Obituary — Personal',
  eulogy: 'Eulogy',
  death_notice: 'Death Notice',
  memorial_card: 'Memorial Card',
  order_of_service: 'Order of Service',
  memorial_program: 'Memorial Program',
  service_timeline: 'Service-Day Timeline',
  reading_music_suggestions: 'Readings & Music',
  thank_yous: 'Thank-You Notes',
  acknowledgment_letter: 'Acknowledgment Letter',
  grief_resources: 'Grief Resources',
  director_brief: 'Pre-Meeting Brief',
};

export default function FinalsClient({ archive, finals }: Props) {
  const [copiedId, setCopiedId] = useState<string>('');

  function copy(id: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 2000);
    });
  }

  function timeAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.round(ms / 60000);
    if (min < 60) return `${min} min ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr} hr ago`;
    return `${Math.round(hr / 24)} days ago`;
  }

  function variantSuffix(t: string | null, l: string | null): string {
    const parts: string[] = [];
    if (t && t !== 'none') parts.push(t.charAt(0).toUpperCase() + t.slice(1));
    if (l && l !== 'en') parts.push(l.toUpperCase());
    return parts.length ? ` · ${parts.join(' · ')}` : '';
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-white border-b border-line px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="serif text-xl font-medium">Petales</span>
          <span className="text-subtle">·</span>
          <span className="text-sm font-medium text-ink">{archive.subject_name}</span>
        </div>
        <a href={`/home/${archive.share_slug}`} className="text-muted text-sm hover:text-ink">
          ← Back to archive
        </a>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="serif text-3xl font-medium tracking-tight mb-2">What&rsquo;s done</h1>
        <p className="text-muted text-sm mb-8">
          Every signed-off final you&rsquo;ve saved for {archive.subject_name}. These are what get used in the program, prayer cards, and other print artifacts &mdash; the AI drafts are just starting points; these are <em className="serif">your</em> versions.
        </p>

        {finals.length === 0 ? (
          <div className="bg-white border border-line rounded-2xl p-12 text-center">
            <p className="serif italic text-muted text-lg mb-2">Nothing finalized yet.</p>
            <p className="text-sm text-muted mb-4">
              Generate a draft, edit it on the right side of the editor, then click <strong>&ldquo;Save as final&rdquo;</strong>. It&rsquo;ll show up here.
            </p>
            <a
              href={`/home/${archive.share_slug}`}
              className="inline-block bg-ink text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-dark"
            >
              Open the archive →
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {finals.map((f) => (
              <div key={f.id} className="bg-white border border-line rounded-2xl p-6">
                <div className="flex justify-between items-baseline mb-3 gap-3 flex-wrap">
                  <div>
                    <h3 className="serif text-lg font-medium text-ink">
                      {TOOL_LABELS[f.tool] || f.tool}{variantSuffix(f.tradition, f.language)}
                    </h3>
                    <p className="text-xs text-subtle italic mt-0.5">
                      Finalized {timeAgo(f.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {copiedId === f.id && (
                      <span className="text-xs text-accent">Copied</span>
                    )}
                    <button
                      onClick={() => copy(f.id, f.edited_content)}
                      className="text-xs text-muted hover:text-ink px-2 py-1 border border-line rounded"
                    >
                      Copy
                    </button>
                    <a
                      href={`/home/${archive.share_slug}`}
                      className="text-xs text-muted hover:text-ink px-2 py-1 border border-line rounded"
                    >
                      Edit
                    </a>
                  </div>
                </div>
                <div className="serif text-base leading-relaxed text-ink whitespace-pre-wrap">
                  {f.edited_content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
