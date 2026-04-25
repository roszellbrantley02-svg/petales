'use client';

// LiveBriefPanel — the calm, focused top-of-page view for the staff console.
// Shows a cached director brief that auto-refreshes when stale + new memories
// exist, plus a real-time feed of contributions as they arrive.
// Designed for one job: helping the director walk into a grieving family
// already knowing the deceased.

import { useEffect, useState, useRef } from 'react';
import type { Archive } from '@/lib/types';

interface FeedItem {
  id: string;
  author_name: string | null;
  memory_type: 'text' | 'photo' | 'voice' | 'video';
  text_content: string | null;
  caption: string | null;
  duration_seconds: number | null;
  created_at: string;
}

interface BriefData {
  brief: string | null;
  generated_at: string | null;
  memory_count_at_generation: number;
  current_memory_count: number;
  is_stale: boolean;
  recent_memories: FeedItem[];
}

interface Props {
  archive: Archive;
}

const POLL_INTERVAL_MS = 30_000; // 30s — feels real-time enough, costs nothing

export default function LiveBriefPanel({ archive }: Props) {
  const [data, setData] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const autoRefreshKickedOff = useRef(false);

  // Initial load + polling for live feed
  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function fetchOnce() {
      try {
        const res = await fetch(`/api/archives/${archive.share_slug}/brief`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          const errPayload = await res.json().catch(() => ({}));
          throw new Error(errPayload.error || `HTTP ${res.status}`);
        }
        const json: BriefData = await res.json();
        if (cancelled) return;
        setData(json);

        // First load only: if the brief is stale, kick off a regenerate in the background
        if (!autoRefreshKickedOff.current && json.is_stale && (json.current_memory_count > 0)) {
          autoRefreshKickedOff.current = true;
          refresh(false);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load brief');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOnce();
    intervalId = setInterval(fetchOnce, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archive.share_slug]);

  async function refresh(force: boolean) {
    if (refreshing) return;
    setRefreshing(true);
    setError('');
    try {
      const res = await fetch(`/api/archives/${archive.share_slug}/brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      // Merge regenerated brief into existing data (preserve recent_memories from poll)
      setData((prev) =>
        prev
          ? { ...prev, brief: json.brief, generated_at: json.generated_at, memory_count_at_generation: json.memory_count_at_generation, current_memory_count: json.current_memory_count, is_stale: false }
          : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  }

  function timeAgo(iso: string | null): string {
    if (!iso) return 'never';
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.round(ms / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min} ${min === 1 ? 'minute' : 'minutes'} ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr} ${hr === 1 ? 'hour' : 'hours'} ago`;
    const days = Math.round(hr / 24);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }

  function formatFeedTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function feedSnippet(m: FeedItem): string {
    if (m.memory_type === 'text') {
      const t = (m.text_content || '').trim();
      return t.length > 90 ? `${t.slice(0, 90).trim()}…` : t;
    }
    if (m.memory_type === 'photo') return m.caption ? `photo · "${m.caption}"` : 'photo';
    if (m.memory_type === 'voice') return `voice note${m.duration_seconds ? ` (${Math.round(m.duration_seconds)} sec)` : ''}`;
    if (m.memory_type === 'video') return `video${m.duration_seconds ? ` (${Math.round(m.duration_seconds)} sec)` : ''}`;
    return '';
  }

  function feedIcon(t: FeedItem['memory_type']): string {
    if (t === 'text') return '✍︎';
    if (t === 'photo') return '◧';
    if (t === 'voice') return '◉';
    if (t === 'video') return '▷';
    return '·';
  }

  // ─────────────── render ───────────────

  return (
    <section className="live-brief print-area max-w-3xl mx-auto px-6 pt-12 pb-10">
      {/* Header */}
      <header className="text-center mb-10 pb-8 border-b border-line">
        <h1 className="serif text-4xl md:text-5xl font-medium tracking-tight text-ink leading-tight">
          {archive.subject_name || '—'}
        </h1>
        {archive.subject_dates && (
          <p className="mt-3 text-sm text-muted tracking-wide">{archive.subject_dates}</p>
        )}
        <div className="mt-4 text-xs text-subtle uppercase tracking-widest no-print">
          {data?.current_memory_count || 0} {(data?.current_memory_count || 0) === 1 ? 'contribution' : 'contributions'}
        </div>
      </header>

      {/* The brief */}
      <div className="brief-content min-h-[200px]">
        {loading && (
          <p className="text-center text-muted serif italic py-8">Reading what the family has shared…</p>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {!loading && !error && data && !data.brief && data.current_memory_count === 0 && (
          <div className="text-center text-muted serif py-8 leading-relaxed">
            <p className="mb-2">The family hasn&rsquo;t shared anything yet.</p>
            <p className="text-sm text-subtle italic">Send them the link &mdash; most contributions arrive within 24 hours.</p>
          </div>
        )}

        {!loading && !error && data && !data.brief && data.current_memory_count > 0 && (
          <div className="text-center py-8">
            <p className="text-muted serif italic mb-4">No brief yet.</p>
            <button
              onClick={() => refresh(true)}
              disabled={refreshing}
              className="bg-ink text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-accent-dark disabled:opacity-50"
            >
              {refreshing ? 'Reading the contributions…' : 'Generate a brief from what’s been shared'}
            </button>
          </div>
        )}

        {!loading && !error && data && data.brief && (
          <article className="serif text-ink whitespace-pre-wrap leading-relaxed text-[17px]">
            {data.brief}
          </article>
        )}
      </div>

      {/* Refresh / print controls */}
      {!loading && !error && data && data.brief && (
        <div className="mt-8 pt-6 border-t border-line flex flex-wrap items-center justify-between gap-3 no-print">
          <p className="text-xs text-subtle italic">
            Updated {timeAgo(data.generated_at)}
            {data.is_stale && data.current_memory_count > data.memory_count_at_generation && (
              <span className="text-accent ml-2">
                · {data.current_memory_count - data.memory_count_at_generation} new since
              </span>
            )}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refresh(true)}
              disabled={refreshing}
              className="text-xs uppercase tracking-wider text-muted hover:text-ink disabled:opacity-40"
            >
              {refreshing ? 'Updating…' : '↻ Update with what’s new'}
            </button>
            <button
              onClick={() => window.print()}
              className="text-xs uppercase tracking-wider text-muted hover:text-ink"
            >
              🖨 Print
            </button>
          </div>
        </div>
      )}

      {/* Live contributions feed */}
      {!loading && !error && data && data.recent_memories && data.recent_memories.length > 0 && (
        <div className="mt-12 no-print">
          <h2 className="text-xs uppercase tracking-widest text-subtle text-center mb-6">
            What the family is sharing
          </h2>
          <ul className="space-y-3">
            {data.recent_memories.map((m) => (
              <li key={m.id} className="flex gap-3 items-start text-sm bg-white border border-line rounded-lg px-4 py-3">
                <span className="text-subtle mt-0.5 text-base">{feedIcon(m.memory_type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span className="font-medium text-ink truncate">{m.author_name || 'Someone'}</span>
                    <span className="text-xs text-subtle whitespace-nowrap">{formatFeedTime(m.created_at)}</span>
                  </div>
                  <p className="text-muted leading-snug serif italic break-words">{feedSnippet(m)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Print-only stylesheet */}
      <style jsx global>{`
        @media print {
          body { background: #ffffff !important; }
          .no-print { display: none !important; }
          /* Hide everything except the brief area */
          body > div > nav,
          body > div > header,
          body > div > footer,
          body > div > div > nav,
          body > div > div > header,
          body > div > div > div:not(:has(.print-area)) {
            display: none !important;
          }
          .live-brief {
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .brief-content {
            font-size: 13pt;
            line-height: 1.6;
          }
        }
      `}</style>
    </section>
  );
}
