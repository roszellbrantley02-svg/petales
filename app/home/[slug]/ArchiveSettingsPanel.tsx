'use client';

// ArchiveSettingsPanel — the staff-side controls for case-specific settings:
//   1. Cremation Memorial SKU — service type + package label/price
//   2. Physician Nudge — physician contact + send-reminder button
//
// Both panels are quiet, edit-in-place, and save via the existing PATCH
// /api/archives/[slug] endpoint. The physician nudge has its own
// /api/archives/[slug]/notify-physician endpoint.

import { useState } from 'react';
import type { Archive } from '@/lib/types';

interface Props {
  archive: Archive;
}

export default function ArchiveSettingsPanel({ archive }: Props) {
  // ─── Cremation package state ───
  const [serviceType, setServiceType] = useState<string>(archive.service_type || 'traditional');
  const [packageLabel, setPackageLabel] = useState<string>(archive.package_price_label || '');
  const [packagePrice, setPackagePrice] = useState<string>(
    archive.package_price_cents ? (archive.package_price_cents / 100).toFixed(2) : ''
  );
  const [savingPackage, setSavingPackage] = useState(false);
  const [packageMsg, setPackageMsg] = useState('');

  // ─── Physician state ───
  const [physicianName, setPhysicianName] = useState<string>(archive.physician_name || '');
  const [physicianEmail, setPhysicianEmail] = useState<string>(archive.physician_email || '');
  const [savingPhysician, setSavingPhysician] = useState(false);
  const [physicianMsg, setPhysicianMsg] = useState('');
  const [reminderCount, setReminderCount] = useState<number>(archive.physician_reminded_count || 0);
  const [reminderAt, setReminderAt] = useState<string | null>(archive.physician_reminded_at || null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderMsg, setReminderMsg] = useState('');

  // ─── Save package ───
  async function savePackage() {
    setSavingPackage(true);
    setPackageMsg('');
    try {
      const cents = packagePrice ? Math.round(parseFloat(packagePrice) * 100) : null;
      const res = await fetch(`/api/archives/${archive.share_slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_type: serviceType,
          package_price_label: packageLabel.trim() || null,
          package_price_cents: cents,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || 'Save failed');
      }
      setPackageMsg('Saved.');
      setTimeout(() => setPackageMsg(''), 2000);
    } catch (e) {
      setPackageMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setSavingPackage(false);
    }
  }

  // ─── Save physician ───
  async function savePhysician() {
    setSavingPhysician(true);
    setPhysicianMsg('');
    try {
      const res = await fetch(`/api/archives/${archive.share_slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          physician_name: physicianName.trim() || null,
          physician_email: physicianEmail.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || 'Save failed');
      }
      setPhysicianMsg('Saved.');
      setTimeout(() => setPhysicianMsg(''), 2000);
    } catch (e) {
      setPhysicianMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setSavingPhysician(false);
    }
  }

  // ─── Send physician reminder ───
  async function sendReminder() {
    if (!physicianEmail) {
      setReminderMsg('Save the physician email first.');
      return;
    }
    if (!confirm(`Send a cause-of-death reminder to ${physicianEmail}?`)) return;
    setSendingReminder(true);
    setReminderMsg('');
    try {
      const res = await fetch(`/api/archives/${archive.share_slug}/notify-physician`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Send failed');
      setReminderCount(json.reminded_count || reminderCount + 1);
      setReminderAt(json.reminded_at || new Date().toISOString());
      setReminderMsg(json.emailSent ? `Reminder sent to ${physicianEmail}.` : 'Saved as reminded; email delivery may have failed (check Resend).');
      setTimeout(() => setReminderMsg(''), 5000);
    } catch (e) {
      setReminderMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setSendingReminder(false);
    }
  }

  function timeAgo(iso: string | null): string {
    if (!iso) return '';
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.round(ms / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min} min ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr} hr ago`;
    return `${Math.round(hr / 24)} days ago`;
  }

  return (
    <section className="max-w-3xl mx-auto px-6 pb-10">
      <div className="grid md:grid-cols-2 gap-4">

        {/* ─── Cremation / Service Package ─── */}
        <div className="bg-white border border-line rounded-2xl p-6">
          <h3 className="serif text-lg font-medium mb-1">Service & package</h3>
          <p className="text-xs text-muted mb-4">
            Tell Petales what kind of service this is. If the family is paying for a memorial archive add-on, set the price label.
          </p>

          <div className="mb-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              Service type
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-accent focus:bg-white focus:outline-none"
            >
              <option value="traditional">Traditional service</option>
              <option value="cremation">Cremation with service</option>
              <option value="direct_cremation">Direct cremation</option>
              <option value="memorial_only">Memorial only (no service)</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              Package label <span className="font-normal normal-case text-subtle">(shown to family)</span>
            </label>
            <input
              type="text"
              value={packageLabel}
              onChange={(e) => setPackageLabel(e.target.value)}
              placeholder="Memorial Archive Package"
              className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-accent focus:bg-white focus:outline-none"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              Package price <span className="font-normal normal-case text-subtle">(USD, optional)</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={packagePrice}
              onChange={(e) => setPackagePrice(e.target.value)}
              placeholder="300.00"
              className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-accent focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={savePackage}
              disabled={savingPackage}
              className="bg-ink text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-accent-dark disabled:bg-subtle disabled:cursor-not-allowed"
            >
              {savingPackage ? 'Saving…' : 'Save'}
            </button>
            {packageMsg && <span className="text-xs text-muted italic">{packageMsg}</span>}
          </div>

          <p className="mt-4 pt-3 border-t border-line text-[11px] text-subtle italic leading-relaxed">
            Need sales materials for selling cremation memorial packages? See{' '}
            <a href="/home/cremation-marketing" className="underline underline-offset-2 hover:text-ink">
              the marketing kit
            </a>.
          </p>
        </div>

        {/* ─── Attending Physician ─── */}
        <div className="bg-white border border-line rounded-2xl p-6">
          <h3 className="serif text-lg font-medium mb-1">Attending physician</h3>
          <p className="text-xs text-muted mb-4">
            Add the physician&rsquo;s contact so Petales can email them for cause-of-death certification. Skip the phone tag.
          </p>

          <div className="mb-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              Physician name
            </label>
            <input
              type="text"
              value={physicianName}
              onChange={(e) => setPhysicianName(e.target.value)}
              placeholder="Dr. Sarah Chen"
              className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-accent focus:bg-white focus:outline-none"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              Physician email
            </label>
            <input
              type="email"
              value={physicianEmail}
              onChange={(e) => setPhysicianEmail(e.target.value)}
              placeholder="schen@hospital.org"
              className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-accent focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={savePhysician}
              disabled={savingPhysician}
              className="bg-ink text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-accent-dark disabled:bg-subtle disabled:cursor-not-allowed"
            >
              {savingPhysician ? 'Saving…' : 'Save contact'}
            </button>
            {physicianMsg && <span className="text-xs text-muted italic">{physicianMsg}</span>}
          </div>

          {physicianEmail && (
            <div className="pt-3 border-t border-line">
              <button
                onClick={sendReminder}
                disabled={sendingReminder}
                className="w-full bg-cream border border-line text-ink text-sm px-4 py-2.5 rounded-lg font-medium hover:bg-warm hover:border-accent disabled:opacity-50"
              >
                {sendingReminder
                  ? 'Sending reminder…'
                  : reminderCount === 0
                  ? '↗ Send physician reminder'
                  : `↗ Send another reminder (${reminderCount} sent so far)`}
              </button>
              {reminderAt && (
                <p className="text-[11px] text-subtle italic mt-2 text-center">
                  Last sent {timeAgo(reminderAt)}
                </p>
              )}
              {reminderMsg && (
                <p className="text-xs mt-2 text-center text-muted italic">{reminderMsg}</p>
              )}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
