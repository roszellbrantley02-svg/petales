'use client';

import { useState, useMemo } from 'react';
import type { HomeVendor, VendorType } from '@/lib/types';
import { VENDOR_TYPE_LABELS } from '@/lib/vendor-templates';

interface Props {
  initialVendors: HomeVendor[];
  homeName: string;
}

const TYPE_ORDER: VendorType[] = [
  'florist', 'clergy', 'musician', 'caterer',
  'cemetery', 'transportation', 'photographer',
  'reception_venue', 'pallbearer', 'other',
];

export default function VendorsPageClient({ initialVendors, homeName }: Props) {
  const [vendors, setVendors] = useState<HomeVendor[]>(initialVendors);
  const [filterType, setFilterType] = useState<VendorType | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [fType, setFType] = useState<VendorType>('florist');
  const [fName, setFName] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fPhone, setFPhone] = useState('');
  const [fNotes, setFNotes] = useState('');
  const [fPreferred, setFPreferred] = useState(false);
  const [error, setError] = useState('');

  const grouped = useMemo(() => {
    const map = new Map<VendorType, HomeVendor[]>();
    for (const v of vendors) {
      if (filterType !== 'all' && v.vendor_type !== filterType) continue;
      if (!map.has(v.vendor_type)) map.set(v.vendor_type, []);
      map.get(v.vendor_type)!.push(v);
    }
    return TYPE_ORDER.filter((t) => map.has(t)).map((t) => [t, map.get(t)!] as const);
  }, [vendors, filterType]);

  function startAdd() {
    setEditingId(null);
    setFType('florist');
    setFName('');
    setFEmail('');
    setFPhone('');
    setFNotes('');
    setFPreferred(false);
    setError('');
    setFormOpen(true);
  }

  function startEdit(v: HomeVendor) {
    setEditingId(v.id);
    setFType(v.vendor_type);
    setFName(v.name);
    setFEmail(v.contact_email || '');
    setFPhone(v.contact_phone || '');
    setFNotes(v.notes || '');
    setFPreferred(!!v.is_preferred);
    setError('');
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setError('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fName.trim()) {
      setError('Name is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        vendor_type: fType,
        name: fName.trim(),
        contact_email: fEmail.trim() || null,
        contact_phone: fPhone.trim() || null,
        notes: fNotes.trim() || null,
        is_preferred: fPreferred,
      };
      let res: Response;
      if (editingId) {
        res = await fetch(`/api/home-vendors/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/home-vendors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || 'Save failed');
      }
      const saved = await res.json();
      if (editingId) {
        setVendors((vs) => vs.map((v) => (v.id === editingId ? { ...v, ...saved } : v)));
      } else {
        setVendors((vs) => [...vs, saved as HomeVendor]);
      }
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(v: HomeVendor) {
    if (!confirm(`Remove ${v.name} from your vendor directory?`)) return;
    try {
      const res = await fetch(`/api/home-vendors/${v.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || 'Remove failed');
      }
      setVendors((vs) => vs.filter((x) => x.id !== v.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-white border-b border-line px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="serif text-xl font-medium">Petales</span>
          <span className="text-subtle">·</span>
          <span className="text-sm font-medium text-ink">{homeName}</span>
        </div>
        <a href="/home" className="text-muted text-sm hover:text-ink">← Families</a>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex justify-between items-baseline mb-2">
          <h1 className="serif text-3xl font-medium tracking-tight">Vendors</h1>
          <button
            onClick={startAdd}
            className="bg-ink text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-dark"
          >
            + Add vendor
          </button>
        </div>
        <p className="text-muted text-sm mb-6">
          Your regular florists, clergy, musicians, caterers — anyone you work with often. Once they&rsquo;re here, you can quick-add them to any case.
        </p>

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`text-xs px-3 py-1.5 rounded-full ${filterType === 'all' ? 'bg-ink text-white' : 'bg-tag text-muted hover:bg-warm'}`}
          >
            All ({vendors.length})
          </button>
          {TYPE_ORDER.map((t) => {
            const count = vendors.filter((v) => v.vendor_type === t).length;
            if (count === 0) return null;
            return (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`text-xs px-3 py-1.5 rounded-full ${filterType === t ? 'bg-ink text-white' : 'bg-tag text-muted hover:bg-warm'}`}
              >
                {VENDOR_TYPE_LABELS[t]} ({count})
              </button>
            );
          })}
        </div>

        {vendors.length === 0 ? (
          <div className="bg-white border border-line rounded-2xl p-12 text-center text-muted serif italic">
            <p className="mb-2 text-lg">No vendors saved yet.</p>
            <p className="text-sm">Add your regular florist, clergy, musicians, and others to skip the typing on every case.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([type, list]) => (
              <div key={type}>
                <h2 className="text-xs uppercase tracking-widest text-subtle mb-2 px-2">
                  {VENDOR_TYPE_LABELS[type]}
                </h2>
                <div className="bg-white border border-line rounded-xl overflow-hidden">
                  {list.map((v) => (
                    <div key={v.id} className="px-5 py-4 border-b border-line last:border-b-0 flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-medium text-ink">{v.name}</span>
                          {v.is_preferred && (
                            <span className="text-[10px] uppercase tracking-wider bg-warm text-accent-dark px-1.5 py-0.5 rounded">
                              ★ Preferred
                            </span>
                          )}
                          {v.use_count > 0 && (
                            <span className="text-[10px] text-subtle italic">
                              used in {v.use_count} {v.use_count === 1 ? 'case' : 'cases'}
                            </span>
                          )}
                        </div>
                        {(v.contact_email || v.contact_phone) && (
                          <div className="text-xs text-muted mt-1">
                            {v.contact_email && <span>{v.contact_email}</span>}
                            {v.contact_email && v.contact_phone && <span className="text-subtle"> · </span>}
                            {v.contact_phone && <span>{v.contact_phone}</span>}
                          </div>
                        )}
                        {v.notes && (
                          <div className="text-xs text-muted serif italic mt-1">
                            {v.notes}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 items-center flex-shrink-0">
                        <button
                          onClick={() => startEdit(v)}
                          className="text-xs text-muted hover:text-ink px-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(v)}
                          className="text-xs text-subtle hover:text-red-600 px-2"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/edit modal */}
      {formOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-5 z-50"
          onClick={closeForm}
        >
          <div
            className="bg-white rounded-2xl p-7 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="serif text-xl font-medium mb-5">
              {editingId ? 'Edit vendor' : 'Add a vendor'}
            </h2>

            <form onSubmit={submit}>
              <div className="mb-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Type
                </label>
                <select
                  value={fType}
                  onChange={(e) => setFType(e.target.value as VendorType)}
                  className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-accent focus:bg-white focus:outline-none"
                >
                  {TYPE_ORDER.map((t) => (
                    <option key={t} value={t}>{VENDOR_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  required
                  autoFocus
                  placeholder="Sunrise Florals"
                  className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-accent focus:bg-white focus:outline-none"
                />
              </div>

              <div className="mb-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={fEmail}
                    onChange={(e) => setFEmail(e.target.value)}
                    placeholder="contact@..."
                    className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-accent focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={fPhone}
                    onChange={(e) => setFPhone(e.target.value)}
                    placeholder="(555) 555-5555"
                    className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-accent focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Notes <span className="font-normal normal-case text-subtle">(optional)</span>
                </label>
                <textarea
                  value={fNotes}
                  onChange={(e) => setFNotes(e.target.value)}
                  placeholder="e.g. Doris handles weekend rushes well. Ask for the standing arrangement."
                  rows={2}
                  className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-accent focus:bg-white focus:outline-none resize-y"
                />
              </div>

              <div className="mb-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fPreferred}
                    onChange={(e) => setFPreferred(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm">Mark as preferred (suggested first when adding to cases)</span>
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={submitting}
                  className="text-muted hover:text-ink px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-ink text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-accent-dark disabled:bg-subtle disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving…' : editingId ? 'Save changes' : 'Add vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
