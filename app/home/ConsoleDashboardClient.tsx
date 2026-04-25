'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Archive } from '@/lib/types';

interface ArchiveSummary extends Archive {
  memory_count: number;
  contributor_count: number;
}

export default function ConsoleDashboardClient({
  initialArchives,
  homeName,
  staffName,
}: {
  initialArchives: ArchiveSummary[];
  homeName?: string;
  staffName?: string;
}) {
  const [archives, setArchives] = useState<ArchiveSummary[]>(initialArchives);
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDates, setNewDates] = useState('');
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  async function signOut() {
    if (!confirm('Sign out?')) return;
    await fetch('/api/auth/signout', { method: 'POST' });
    window.location.href = '/signin';
  }

  async function createArchive() {
    if (!newName.trim()) {
      alert('Please enter a name.');
      return;
    }
    setCreating(true);
    try {
      // Create the archive first (no photo)
      const res = await fetch('/api/archives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_name: newName.trim(),
          subject_dates: newDates.trim() || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Create failed');
      const archive = await res.json();

      // If photo, upload and patch
      if (newPhoto) {
        const fd = new FormData();
        fd.append('file', newPhoto);
        fd.append('slug', archive.share_slug);
        const up = await fetch('/api/upload', { method: 'POST', body: fd });
        if (up.ok) {
          const upData = await up.json();
          await fetch(`/api/archives/${archive.share_slug}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cover_photo_url: upData.url }),
          });
        }
      }

      router.push(`/home/${archive.share_slug}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert('Could not create: ' + message);
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f3ed]">
      {/* Top bar */}
      <div className="bg-white border-b border-line px-6 py-4 flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="serif text-xl font-medium">Petales</span>
          {homeName && (
            <>
              <span className="text-subtle">·</span>
              <span className="text-sm font-medium text-ink truncate">{homeName}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setModalOpen(true)}
            className="bg-sage text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sage-dark transition-colors"
          >
            + New family archive
          </button>
          <a href="/home/staff" className="text-muted text-sm hover:text-ink">Staff</a>
          <a href="/home/settings" className="text-muted text-sm hover:text-ink">Settings</a>
          <a href="/home/vendors" className="text-muted text-sm hover:text-ink">Vendors</a>
          {staffName && (
            <span className="text-xs text-subtle hidden sm:inline">{staffName}</span>
          )}
          <button onClick={signOut} className="text-muted text-sm hover:text-ink">
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex justify-between items-baseline mb-6">
          <div>
            <h1 className="serif text-3xl font-medium tracking-tight">Families</h1>
            <p className="text-muted text-sm">
              {archives.length === 0
                ? 'No families yet.'
                : `${archives.length} ${archives.length === 1 ? 'family' : 'families'} in the archive`}
            </p>
          </div>
        </div>

        {archives.length === 0 ? (
          <div className="bg-white border border-dashed border-line rounded-xl p-20 text-center">
            <h3 className="serif text-xl font-medium mb-2">No family archives yet</h3>
            <p className="text-muted mb-5 max-w-sm mx-auto">
              Create one when a family comes in. The archive will live here and across every device they use.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="bg-sage text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-sage-dark transition-colors"
            >
              + Create first archive
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archives.map(a => (
              <ArchiveCard key={a.id} archive={a} />
            ))}
          </div>
        )}
      </div>

      {/* New archive modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-5 z-50" onClick={() => setModalOpen(false)}>
          <div
            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="serif text-2xl font-medium mb-2">New family archive</h2>
            <p className="text-muted text-sm mb-6">
              Create a private page for a family. You&apos;ll share the link so relatives can add memories.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                Name of the person being remembered
              </label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Margaret Ellen Schmidt"
                autoFocus
                className="w-full border border-line bg-cream rounded-lg px-3.5 py-3 focus:border-sage focus:bg-white focus:outline-none"
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                Dates (optional)
              </label>
              <input
                type="text"
                value={newDates}
                onChange={e => setNewDates(e.target.value)}
                placeholder="1938 — 2024"
                className="w-full border border-line bg-cream rounded-lg px-3.5 py-3 focus:border-sage focus:bg-white focus:outline-none"
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                Cover photo (optional)
              </label>
              <label className="block border-2 border-dashed border-line rounded-lg py-5 text-center text-sm text-muted cursor-pointer hover:border-sage hover:bg-warm transition-colors">
                {newPhoto ? newPhoto.name : 'Click to choose a photo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setNewPhoto(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModalOpen(false)}
                disabled={creating}
                className="text-muted hover:text-ink px-4 py-2.5 font-medium text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createArchive}
                disabled={creating}
                className="bg-sage text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-sage-dark disabled:bg-subtle disabled:cursor-not-allowed transition-colors"
              >
                {creating ? 'Creating…' : 'Create archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ArchiveCard({ archive }: { archive: ArchiveSummary }) {
  const initial = (archive.subject_name || '?').charAt(0).toUpperCase();

  function timeAgo(ts: string) {
    const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
    if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
    return new Date(ts).toLocaleDateString();
  }

  return (
    <a
      href={`/home/${archive.share_slug}`}
      className="block bg-white border border-line rounded-xl p-5 hover:border-sage hover:-translate-y-0.5 hover:shadow-sm transition-all"
    >
      <div className="flex gap-3.5 items-center mb-3.5">
        <div className="w-14 h-14 rounded-full bg-tag flex items-center justify-center flex-shrink-0 overflow-hidden serif text-xl text-subtle">
          {archive.cover_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={archive.cover_photo_url} alt={archive.subject_name} className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div className="min-w-0">
          <div className="serif text-lg font-medium truncate">{archive.subject_name}</div>
          <div className="text-muted text-xs">{archive.subject_dates || '—'}</div>
        </div>
      </div>
      <div className="flex gap-3.5 text-xs text-muted pt-2.5 border-t border-line">
        <span><span className="text-ink font-semibold">{archive.memory_count}</span> memories</span>
        <span><span className="text-ink font-semibold">{archive.contributor_count}</span> contributors</span>
        <span className="text-subtle italic ml-auto">Updated {timeAgo(archive.updated_at)}</span>
      </div>
    </a>
  );
}
