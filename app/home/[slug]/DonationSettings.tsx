'use client';

import { useState } from 'react';

interface Props {
  archiveSlug: string;
  initialCharityName: string | null;
  initialUrl: string | null;
  initialNote: string | null;
}

export default function DonationSettings({
  archiveSlug,
  initialCharityName,
  initialUrl,
  initialNote,
}: Props) {
  const [open, setOpen] = useState(false);
  const [charityName, setCharityName] = useState(initialCharityName || '');
  const [url, setUrl] = useState(initialUrl || '');
  const [note, setNote] = useState(initialNote || '');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const hasDonation = Boolean(charityName && url);

  async function save() {
    if (charityName && !url) {
      alert('If you set a charity name, please also include the donation URL.');
      return;
    }
    if (url && !/^https?:\/\//.test(url)) {
      alert('URL must start with http:// or https://');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/archives/${archiveSlug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donation_charity_name: charityName.trim() || null,
          donation_url: url.trim() || null,
          donation_note: note.trim() || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      setSavedAt(Date.now());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert('Could not save: ' + message);
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    if (!confirm('Remove the donation link from this archive?')) return;
    setCharityName('');
    setUrl('');
    setNote('');
    setSaving(true);
    try {
      await fetch(`/api/archives/${archiveSlug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donation_charity_name: null,
          donation_url: null,
          donation_note: null,
        }),
      });
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex justify-between items-baseline mt-7 mb-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted">
          In Lieu of Flowers
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="text-xs font-medium text-sage hover:text-sage-dark"
        >
          {open ? 'Close' : (hasDonation ? 'Edit' : '+ Set donation link')}
        </button>
      </div>

      {!open && (
        <div className="bg-white border border-line rounded-xl px-5 py-4">
          {hasDonation ? (
            <>
              <div className="text-sm">
                <strong className="text-ink">{charityName}</strong>
              </div>
              <div className="text-xs text-muted mt-1 truncate">{url}</div>
              {note && <div className="text-xs text-muted italic mt-1">{note}</div>}
              <div className="text-xs text-subtle mt-2 italic">
                Family page shows this prominently in the &quot;Ways to honor them&quot; section.
              </div>
            </>
          ) : (
            <p className="text-sm text-muted italic">
              No donation link set. The family page will show curated marketplace options instead.
            </p>
          )}
        </div>
      )}

      {open && (
        <div className="bg-white border border-line rounded-xl p-5">
          <p className="text-xs text-muted mb-4 italic">
            If the family has chosen a charity for memorial gifts, set it here. It will be displayed prominently on the family page.
          </p>

          <div className="mb-3">
            <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-1.5">Charity name</label>
            <input
              type="text"
              value={charityName}
              onChange={e => setCharityName(e.target.value)}
              placeholder="Alzheimer's Association"
              className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-sage focus:bg-white focus:outline-none"
            />
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-1.5">Donation URL</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://act.alz.org/donate"
              className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-sage focus:bg-white focus:outline-none"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-1.5">
              Note <span className="text-subtle normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Mom volunteered there for 20 years."
              rows={2}
              className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-sage focus:bg-white focus:outline-none resize-y"
            />
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-line">
            <div className="text-xs text-subtle italic">
              {savedAt && Date.now() - savedAt < 3000 ? 'Saved' : ''}
            </div>
            <div className="flex gap-2">
              {hasDonation && (
                <button
                  onClick={clear}
                  disabled={saving}
                  className="text-muted hover:text-red-600 px-3 py-1.5 text-sm font-medium"
                >
                  Remove
                </button>
              )}
              <button
                onClick={save}
                disabled={saving}
                className="bg-sage text-white px-4 py-1.5 rounded-lg font-medium text-sm hover:bg-sage-dark disabled:bg-subtle disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
