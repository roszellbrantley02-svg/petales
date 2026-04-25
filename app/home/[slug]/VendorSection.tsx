'use client';

import { useEffect, useState } from 'react';
import type { Vendor, VendorStatus, VendorType } from '@/lib/types';
import { VENDOR_TYPE_LABELS, buildVendorEmail, vendorMailtoUrl } from '@/lib/vendor-templates';

const STATUS_LABELS: Record<VendorStatus, string> = {
  not_contacted: 'Not contacted',
  contacted: 'Contacted',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<VendorStatus, string> = {
  not_contacted: 'bg-tag text-muted',
  contacted: 'bg-warm text-accent-dark',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-sage text-white',
  cancelled: 'bg-red-100 text-red-700',
};

interface Props {
  archiveSlug: string;
  subjectName: string;
  subjectDates: string | null;
  homeName?: string;
}

export default function VendorSection({
  archiveSlug,
  subjectName,
  subjectDates,
  homeName = '',
}: Props) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [vendorType, setVendorType] = useState<VendorType>('florist');
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  async function loadVendors() {
    setLoading(true);
    try {
      const res = await fetch(`/api/vendors?slug=${archiveSlug}`);
      if (res.ok) setVendors(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVendors();
  }, [archiveSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  function openModal() {
    setVendorType('florist');
    setName('');
    setContactEmail('');
    setContactPhone('');
    setNotes('');
    setModalOpen(true);
  }

  async function createVendor() {
    if (!name.trim()) {
      alert('Please enter a vendor name.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: archiveSlug,
          vendor_type: vendorType,
          name: name.trim(),
          contact_email: contactEmail.trim() || null,
          contact_phone: contactPhone.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Could not add vendor');
      }
      setModalOpen(false);
      loadVendors();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(message);
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(vendorId: string, status: VendorStatus) {
    setVendors(vs => vs.map(v => v.id === vendorId ? { ...v, status } : v));
    try {
      await fetch(`/api/vendors/${vendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch {
      loadVendors();
    }
  }

  async function deleteVendor(vendorId: string) {
    if (!confirm('Remove this vendor from the tracker?')) return;
    setVendors(vs => vs.filter(v => v.id !== vendorId));
    try {
      await fetch(`/api/vendors?id=${vendorId}`, { method: 'DELETE' });
    } catch {
      loadVendors();
    }
  }

  function emailVendor(v: Vendor) {
    if (!v.contact_email) {
      alert(`No email saved for ${v.name}. Add one first or use the phone instead.`);
      return;
    }
    const template = buildVendorEmail(v.vendor_type, {
      subjectName,
      subjectDates,
      serviceDate: v.needed_at ? new Date(v.needed_at).toLocaleDateString() : null,
      homeName: homeName || '',
    });
    const url = vendorMailtoUrl(v.contact_email, template);
    window.location.href = url;
  }

  return (
    <>
      <div className="flex justify-between items-baseline mt-7 mb-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted">
          Vendors
        </div>
        <button
          onClick={openModal}
          className="text-xs font-medium text-sage hover:text-sage-dark"
        >
          + Add vendor
        </button>
      </div>

      <div className="bg-white border border-line rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-muted text-sm italic">Loading vendors…</div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <h3 className="serif text-lg font-medium text-ink mb-1">No vendors yet</h3>
            <p className="text-sm">Add the florist, clergy, musician, caterer, or anyone else you&apos;re coordinating with.</p>
          </div>
        ) : (
          vendors.map(v => (
            <div key={v.id} className="px-5 py-4 border-b border-line last:border-b-0">
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted">
                      {VENDOR_TYPE_LABELS[v.vendor_type]}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[v.status]}`}>
                      {STATUS_LABELS[v.status]}
                    </span>
                  </div>
                  <div className="font-semibold text-sm text-ink">{v.name}</div>
                  <div className="text-xs text-muted mt-1 space-x-3">
                    {v.contact_email && <span>{v.contact_email}</span>}
                    {v.contact_phone && <span>{v.contact_phone}</span>}
                  </div>
                  {v.notes && (
                    <div className="text-xs text-muted italic mt-1.5 line-clamp-2">{v.notes}</div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <select
                    value={v.status}
                    onChange={e => updateStatus(v.id, e.target.value as VendorStatus)}
                    className="text-xs border border-line rounded px-2 py-1 bg-white"
                  >
                    {(Object.keys(STATUS_LABELS) as VendorStatus[]).map(s => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <button
                      onClick={() => emailVendor(v)}
                      className="text-xs border border-line px-2 py-1 rounded hover:border-sage hover:text-sage"
                      title="Open templated email in your default mail client"
                    >
                      Email
                    </button>
                    <button
                      onClick={() => deleteVendor(v.id)}
                      className="text-xs text-subtle hover:text-red-600 px-1"
                      title="Remove vendor"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add vendor modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-5 z-50"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-7 max-w-md w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="serif text-xl font-medium mb-4">Add vendor</h2>

            <div className="mb-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Type</label>
              <select
                value={vendorType}
                onChange={e => setVendorType(e.target.value as VendorType)}
                className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-sage focus:bg-white focus:outline-none"
              >
                {(Object.keys(VENDOR_TYPE_LABELS) as VendorType[]).map(t => (
                  <option key={t} value={t}>{VENDOR_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Vendor or contact name"
                autoFocus
                className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-sage focus:bg-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="contact@vendor.com"
                  className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-sage focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-sage focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Anything specific to remember"
                rows={3}
                className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-sage focus:bg-white focus:outline-none resize-y"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModalOpen(false)}
                disabled={creating}
                className="text-muted hover:text-ink px-4 py-2 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={createVendor}
                disabled={creating}
                className="bg-sage text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-sage-dark disabled:bg-subtle disabled:cursor-not-allowed"
              >
                {creating ? 'Adding…' : 'Add vendor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
