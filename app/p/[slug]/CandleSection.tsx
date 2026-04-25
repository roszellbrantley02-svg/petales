'use client';

import { useEffect, useState } from 'react';
import { LIMITS } from '@/lib/limits';
import type { Candle } from '@/lib/types';

interface Props {
  archiveSlug: string;
  subjectName: string;
}

export default function CandleSection({ archiveSlug, subjectName }: Props) {
  const [count, setCount] = useState<number>(0);
  const [recent, setRecent] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [litBy, setLitBy] = useState('');
  const [dedication, setDedication] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [justLit, setJustLit] = useState(false);

  const firstName = subjectName.split(' ')[0];

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/candles?slug=${archiveSlug}`);
      if (res.ok) {
        const data = await res.json();
        setCount(data.count);
        setRecent(data.recent);
      }
    } catch {} finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [archiveSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  async function light() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/candles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: archiveSlug,
          lit_by: litBy.trim() || null,
          dedication: dedication.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Could not light candle');
      }
      const data = await res.json();
      setCount(data.total);
      setRecent([data.candle, ...recent].slice(0, 20));
      setJustLit(true);
      setTimeout(() => setJustLit(false), 2000);
      setComposerOpen(false);
      setDedication('');
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : 'Unknown error';
      alert(m);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-16 pt-12 border-t border-line text-center">
      <p className="serif italic text-muted text-sm mb-2">A candle in their memory</p>
      <h2 className="serif text-3xl font-medium tracking-tight mb-8">
        Light a candle for {firstName}
      </h2>

      {/* The big candle visualization */}
      <div className="relative mx-auto mb-6 select-none" style={{ width: 120, height: 180 }}>
        {/* Flame */}
        {count > 0 && (
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 0 }}>
            <div className="flame-wrapper">
              <div className={`flame ${justLit ? 'flame-lit' : ''}`}>
                <div className="flame-inner"></div>
              </div>
            </div>
          </div>
        )}
        {/* Wick */}
        <div className="absolute left-1/2 -translate-x-1/2 bg-gray-700" style={{ top: 38, width: 2, height: 8 }}></div>
        {/* Candle body */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-md"
          style={{
            top: 46,
            width: 60,
            height: 130,
            background: 'linear-gradient(to right, #f5e6c8, #e8d4a8, #d4b87f, #e8d4a8, #f5e6c8)',
            boxShadow: 'inset 0 -10px 20px rgba(0,0,0,0.1)',
          }}
        ></div>
      </div>

      {/* Counter */}
      <div className="serif text-2xl font-medium mb-2">
        {loading ? '…' : count.toLocaleString()} {count === 1 ? 'candle' : 'candles'} lit
      </div>
      <p className="text-muted text-sm italic mb-8">
        {count === 0
          ? 'Be the first to light one.'
          : count === 1
          ? 'A small light, kept for them.'
          : 'Many small lights, kept for them.'}
      </p>

      {/* Composer */}
      {!composerOpen ? (
        <button
          onClick={() => setComposerOpen(true)}
          className="inline-flex items-center px-6 py-3 rounded-lg bg-ink text-white font-medium hover:bg-accent-dark transition-colors"
        >
          🕯 Light a candle
        </button>
      ) : (
        <div className="bg-white border border-line rounded-xl p-5 max-w-md mx-auto text-left">
          <p className="text-xs text-muted italic mb-3 text-center">
            Light a candle for {firstName}. Add your name and a few words if you wish.
          </p>
          <input
            type="text"
            value={litBy}
            onChange={e => setLitBy(e.target.value.slice(0, LIMITS.WALL_AUTHOR_MAX_CHARS))}
            placeholder="Your name (optional)"
            className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm mb-2 focus:border-accent focus:bg-white focus:outline-none"
          />
          <textarea
            value={dedication}
            onChange={e => setDedication(e.target.value.slice(0, LIMITS.CANDLE_DEDICATION_MAX_CHARS))}
            placeholder="A short dedication (optional)"
            rows={2}
            className="w-full border border-line bg-cream rounded-lg px-3 py-2 serif text-sm leading-relaxed focus:border-accent focus:bg-white focus:outline-none resize-none"
          />
          <div className="text-xs text-subtle text-right mt-1 mb-3">
            {dedication.length} / {LIMITS.CANDLE_DEDICATION_MAX_CHARS}
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setComposerOpen(false); setDedication(''); }}
              disabled={submitting}
              className="text-muted hover:text-ink px-3 py-1.5 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={light}
              disabled={submitting}
              className="bg-ink text-white px-5 py-1.5 rounded-lg text-sm font-medium hover:bg-accent-dark disabled:bg-subtle disabled:cursor-not-allowed"
            >
              {submitting ? 'Lighting…' : '🕯 Light'}
            </button>
          </div>
        </div>
      )}

      {/* Recent dedications */}
      {recent.length > 0 && (
        <div className="mt-10 max-w-md mx-auto text-left space-y-2">
          <p className="text-xs uppercase tracking-widest text-muted text-center mb-3">Recent</p>
          {recent.slice(0, 8).map(c => (
            <div key={c.id} className="text-sm py-2 border-b border-line last:border-b-0">
              <div className="flex justify-between items-baseline gap-3">
                <span className="font-medium">{c.lit_by || 'Anonymous'}</span>
                <span className="text-xs text-subtle">{formatTimeAgo(c.created_at)}</span>
              </div>
              {c.dedication && (
                <div className="serif italic text-muted text-sm mt-1">&ldquo;{c.dedication}&rdquo;</div>
              )}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .flame-wrapper {
          width: 30px;
          height: 40px;
          position: relative;
        }
        .flame {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 18px;
          height: 38px;
          background: radial-gradient(ellipse at center, #ffe066 0%, #ffaa33 30%, #ff6633 60%, transparent 100%);
          border-radius: 50% 50% 30% 30%;
          animation: flicker 1.3s ease-in-out infinite alternate;
          filter: blur(0.3px);
          box-shadow: 0 0 24px 8px rgba(255, 170, 51, 0.45);
        }
        .flame-inner {
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 8px;
          height: 18px;
          background: radial-gradient(ellipse at center, #fff 0%, #ffe066 50%, transparent 100%);
          border-radius: 50%;
          animation: flicker-inner 0.7s ease-in-out infinite alternate;
        }
        .flame-lit {
          animation: flicker 0.8s ease-in-out infinite alternate, pop 0.4s ease-out;
        }
        @keyframes flicker {
          0% { transform: translateX(-50%) scale(1) rotate(-1deg); opacity: 0.92; }
          50% { transform: translateX(-50%) scale(1.05) rotate(1deg); opacity: 1; }
          100% { transform: translateX(-50%) scale(0.97) rotate(-0.5deg); opacity: 0.95; }
        }
        @keyframes flicker-inner {
          0% { transform: translateX(-50%) scale(1); }
          100% { transform: translateX(-50%) scale(0.85); }
        }
        @keyframes pop {
          0% { transform: translateX(-50%) scale(0.3); opacity: 0; }
          80% { transform: translateX(-50%) scale(1.2); opacity: 1; }
          100% { transform: translateX(-50%) scale(1); }
        }
      `}</style>
    </section>
  );
}

function formatTimeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}
