'use client';

import { useEffect, useState } from 'react';
import { LIMITS } from '@/lib/limits';
import type { WallNote } from '@/lib/types';

interface Props {
  archiveSlug: string;
  subjectName: string;
}

// Sticky-note color rotation — gives the wall a hand-pinned feel
const NOTE_COLORS = [
  'bg-yellow-50 border-yellow-200',
  'bg-pink-50 border-pink-200',
  'bg-blue-50 border-blue-200',
  'bg-green-50 border-green-200',
  'bg-purple-50 border-purple-200',
  'bg-orange-50 border-orange-200',
];

const NOTE_ROTATIONS = ['-rotate-1', 'rotate-0', 'rotate-1', '-rotate-1', 'rotate-0', 'rotate-1'];

export default function WallSection({ archiveSlug, subjectName }: Props) {
  const [notes, setNotes] = useState<WallNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const firstName = subjectName.split(' ')[0];

  async function loadNotes() {
    setLoading(true);
    try {
      const res = await fetch(`/api/wall?slug=${archiveSlug}`);
      if (res.ok) setNotes(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadNotes(); }, [archiveSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    const trimmed = message.trim();
    if (!trimmed) {
      alert('Please write a note before posting.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/wall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: archiveSlug,
          author_name: authorName.trim() || null,
          message: trimmed,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Could not post');
      }
      const newNote = await res.json();
      setNotes([newNote, ...notes]);
      setComposerOpen(false);
      setMessage('');
      // Keep author name for repeat use
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : 'Unknown error';
      alert(m);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-16 pt-12 border-t border-line">
      <div className="text-center mb-7">
        <p className="serif italic text-muted text-sm mb-2">A wall for the people who knew them</p>
        <h2 className="serif text-3xl font-medium tracking-tight">
          Leave a note for {firstName}
        </h2>
      </div>

      {/* Composer */}
      {!composerOpen ? (
        <div className="text-center mb-8">
          <button
            onClick={() => setComposerOpen(true)}
            className="inline-flex items-center px-5 py-2.5 rounded-lg border border-dashed border-line text-muted hover:border-accent hover:text-accent transition-colors"
          >
            + Pin a note to the wall
          </button>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-8 max-w-md mx-auto shadow-sm">
          <input
            type="text"
            value={authorName}
            onChange={e => setAuthorName(e.target.value.slice(0, LIMITS.WALL_AUTHOR_MAX_CHARS))}
            placeholder="Your name (optional)"
            className="w-full bg-transparent border-b border-yellow-300 px-1 py-1.5 text-sm focus:outline-none focus:border-yellow-500 mb-2 placeholder-yellow-700/40"
          />
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value.slice(0, LIMITS.WALL_NOTE_MAX_CHARS))}
            placeholder={`Write a short note for ${firstName}…`}
            rows={3}
            autoFocus
            className="w-full bg-transparent border-0 px-1 py-1 serif text-base leading-relaxed focus:outline-none resize-none placeholder-yellow-700/40"
          />
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-yellow-200">
            <span className="text-xs text-yellow-700/60">{message.length} / {LIMITS.WALL_NOTE_MAX_CHARS}</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setComposerOpen(false); setMessage(''); }}
                disabled={submitting}
                className="text-xs text-muted hover:text-ink px-2"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting || !message.trim()}
                className="bg-ink text-white px-4 py-1.5 rounded-md text-xs font-medium hover:bg-accent-dark disabled:bg-subtle disabled:cursor-not-allowed"
              >
                {submitting ? 'Pinning…' : 'Pin to wall'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wall */}
      {loading ? (
        <div className="text-center text-muted italic">Loading the wall…</div>
      ) : notes.length === 0 ? (
        <div className="text-center text-muted italic py-6">
          The wall is quiet. Be the first to leave a note.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {notes.map((note, i) => (
            <div
              key={note.id}
              className={`${NOTE_COLORS[i % NOTE_COLORS.length]} ${NOTE_ROTATIONS[i % NOTE_ROTATIONS.length]} border rounded-lg p-4 shadow-sm hover:shadow-md hover:rotate-0 transition-all`}
              style={{ minHeight: '120px' }}
            >
              <div className="serif text-base leading-relaxed whitespace-pre-wrap break-words mb-2">
                {note.message}
              </div>
              <div className="flex justify-between items-end text-xs text-muted">
                <span className="font-medium">— {note.author_name || 'Anonymous'}</span>
                <span className="italic">{formatTimeAgo(note.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
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
