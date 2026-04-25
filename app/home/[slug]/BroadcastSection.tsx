'use client';

import { useEffect, useState } from 'react';
import { LIMITS } from '@/lib/limits';
import type { Announcement, AnnouncementRecipient } from '@/lib/types';

interface Props {
  archiveSlug: string;
}

export default function BroadcastSection({ archiveSlug }: Props) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [suggestedRecipients, setSuggestedRecipients] = useState<AnnouncementRecipient[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [extraRecipients, setExtraRecipients] = useState<AnnouncementRecipient[]>([]);
  const [extraEmail, setExtraEmail] = useState('');
  const [extraName, setExtraName] = useState('');
  const [history, setHistory] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/announcements?slug=${archiveSlug}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestedRecipients(data.suggested_recipients || []);
        setHistory(data.announcements || []);
        // Auto-select all suggested recipients
        setSelectedEmails(new Set((data.suggested_recipients || []).map((r: AnnouncementRecipient) => r.email)));
      }
    } catch {} finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [archiveSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleRecipient(email: string) {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  function addExtraRecipient() {
    const e = extraEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      alert('Please enter a valid email address.');
      return;
    }
    if (extraRecipients.some(r => r.email === e) || suggestedRecipients.some(r => r.email.toLowerCase() === e)) {
      alert('That email is already in the list.');
      return;
    }
    setExtraRecipients(prev => [...prev, { email: e, name: extraName.trim() || null }]);
    setSelectedEmails(prev => new Set([...prev, e]));
    setExtraEmail('');
    setExtraName('');
  }

  function removeExtra(email: string) {
    setExtraRecipients(prev => prev.filter(r => r.email !== email));
    setSelectedEmails(prev => {
      const next = new Set(prev);
      next.delete(email);
      return next;
    });
  }

  async function send() {
    if (!subject.trim() || !body.trim()) {
      alert('Add a subject and message before sending.');
      return;
    }
    const allRecipients = [...suggestedRecipients, ...extraRecipients].filter(r =>
      selectedEmails.has(r.email.toLowerCase())
    );
    if (allRecipients.length === 0) {
      alert('Pick at least one recipient.');
      return;
    }
    if (!confirm(`Send this announcement to ${allRecipients.length} ${allRecipients.length === 1 ? 'person' : 'people'}?`)) {
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: archiveSlug,
          subject: subject.trim(),
          body: body.trim(),
          recipients: allRecipients,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Send failed');
      }
      alert(`Sent to ${data.delivered} of ${data.recipient_count}.${data.failed > 0 ? ` ${data.failed} failed.` : ''}`);
      setComposerOpen(false);
      setSubject('');
      setBody('');
      setExtraRecipients([]);
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert('Could not send: ' + message);
    } finally {
      setSending(false);
    }
  }

  const recipientCount = selectedEmails.size;

  return (
    <>
      <div className="flex justify-between items-baseline mt-7 mb-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted">
          Family Announcements
        </div>
        <button
          onClick={() => setComposerOpen(!composerOpen)}
          className="text-xs font-medium text-sage hover:text-sage-dark"
        >
          {composerOpen ? 'Cancel' : '+ Compose announcement'}
        </button>
      </div>

      {composerOpen && (
        <div className="bg-white border border-line rounded-xl p-5 mb-3">
          <div className="mb-3">
            <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-1.5">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value.slice(0, LIMITS.ANNOUNCEMENT_SUBJECT_MAX_CHARS))}
              placeholder="Service time changed to 2 PM"
              className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-sage focus:bg-white focus:outline-none"
            />
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-1.5">
              Message
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value.slice(0, LIMITS.ANNOUNCEMENT_BODY_MAX_CHARS))}
              placeholder={`Dear family,\n\nThe service time for [name]'s memorial has been moved to 2:00 PM this Saturday. The reception will follow at the church hall.\n\nThank you,\nThe family`}
              rows={8}
              className="w-full border border-line bg-cream rounded-lg px-3 py-2 serif text-sm leading-relaxed focus:border-sage focus:bg-white focus:outline-none resize-y"
            />
            <div className="text-xs text-subtle mt-1 text-right">
              {body.length} / {LIMITS.ANNOUNCEMENT_BODY_MAX_CHARS}
            </div>
          </div>

          {/* Recipients */}
          <div className="mb-4">
            <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-2">
              Recipients ({recipientCount} selected)
            </label>

            {loading ? (
              <p className="text-sm text-muted italic">Loading contributors…</p>
            ) : suggestedRecipients.length === 0 && extraRecipients.length === 0 ? (
              <p className="text-sm text-muted italic mb-3">
                No family members have shared an email yet. Add one below.
              </p>
            ) : (
              <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto border border-line rounded-lg p-2 bg-cream">
                {suggestedRecipients.map(r => (
                  <label key={r.email} className="flex items-center gap-2 text-sm py-0.5 cursor-pointer hover:bg-warm rounded px-1">
                    <input
                      type="checkbox"
                      checked={selectedEmails.has(r.email.toLowerCase())}
                      onChange={() => toggleRecipient(r.email.toLowerCase())}
                    />
                    <span className="font-medium">{r.name || '(no name)'}</span>
                    <span className="text-muted text-xs">{r.email}</span>
                  </label>
                ))}
                {extraRecipients.map(r => (
                  <label key={r.email} className="flex items-center gap-2 text-sm py-0.5 cursor-pointer hover:bg-warm rounded px-1">
                    <input
                      type="checkbox"
                      checked={selectedEmails.has(r.email)}
                      onChange={() => toggleRecipient(r.email)}
                    />
                    <span className="font-medium">{r.name || '(no name)'}</span>
                    <span className="text-muted text-xs">{r.email}</span>
                    <button
                      onClick={(e) => { e.preventDefault(); removeExtra(r.email); }}
                      className="ml-auto text-subtle hover:text-red-600 text-xs"
                      title="Remove"
                    >
                      ×
                    </button>
                  </label>
                ))}
              </div>
            )}

            {/* Add extra recipient */}
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input
                type="email"
                value={extraEmail}
                onChange={e => setExtraEmail(e.target.value)}
                placeholder="extra@email.com"
                className="border border-line bg-cream rounded px-2 py-1.5 text-xs focus:border-sage focus:bg-white focus:outline-none"
              />
              <input
                type="text"
                value={extraName}
                onChange={e => setExtraName(e.target.value)}
                placeholder="Name (optional)"
                className="border border-line bg-cream rounded px-2 py-1.5 text-xs focus:border-sage focus:bg-white focus:outline-none"
              />
              <button
                onClick={addExtraRecipient}
                className="text-xs font-medium text-sage hover:text-sage-dark px-3"
              >
                + Add
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-line">
            <p className="text-xs text-subtle italic">
              Sends from your Resend address. Daily limit: {LIMITS.ANNOUNCEMENTS_PER_ARCHIVE_PER_DAY} per family.
            </p>
            <button
              onClick={send}
              disabled={sending || recipientCount === 0 || !subject.trim() || !body.trim()}
              className="bg-sage text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-sage-dark disabled:bg-subtle disabled:cursor-not-allowed"
            >
              {sending ? 'Sending…' : `Send to ${recipientCount}`}
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {!composerOpen && (
        <div className="bg-white border border-line rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-center py-10 text-muted text-sm italic">Loading…</div>
          ) : history.length === 0 ? (
            <div className="text-center py-10 text-muted">
              <p className="text-sm">No announcements sent yet.</p>
              <p className="text-xs italic mt-1">Use the compose button above when you need to update the family.</p>
            </div>
          ) : (
            history.map(a => (
              <div key={a.id} className="px-5 py-3 border-b border-line last:border-b-0 flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{a.subject}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {a.sent_at ? new Date(a.sent_at).toLocaleString() : 'Pending'}
                    {' · '}
                    Sent to {a.delivered_count} of {a.recipient_count}
                    {a.failed_count > 0 && <span className="text-red-600"> · {a.failed_count} failed</span>}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  a.status === 'sent' ? 'bg-sage text-white'
                  : a.status === 'failed' ? 'bg-red-100 text-red-700'
                  : 'bg-tag text-muted'
                }`}>
                  {a.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}
