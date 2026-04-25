'use client';

import { useState } from 'react';
import type { FuneralHome } from '@/lib/types';

interface ExtendedHome extends FuneralHome {
  print_supplier_name?: string | null;
  print_supplier_email?: string | null;
  print_supplier_notes?: string | null;
}

interface Props {
  home: ExtendedHome;
  isAdmin: boolean;
}

export default function SettingsClient({ home, isAdmin }: Props) {
  const [supplierName, setSupplierName] = useState(home.print_supplier_name || '');
  const [supplierEmail, setSupplierEmail] = useState(home.print_supplier_email || '');
  const [supplierNotes, setSupplierNotes] = useState(home.print_supplier_notes || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      const res = await fetch('/api/home', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          print_supplier_name: supplierName.trim() || null,
          print_supplier_email: supplierEmail.trim() || null,
          print_supplier_notes: supplierNotes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      setMsg('Saved.');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-white border-b border-line px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="serif text-xl font-medium">Petales</span>
          <span className="text-subtle">·</span>
          <span className="text-sm font-medium text-ink">{home.name}</span>
        </div>
        <a href="/home" className="text-muted text-sm hover:text-ink">← Families</a>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="serif text-3xl font-medium tracking-tight mb-2">Home settings</h1>
        <p className="text-muted text-sm mb-8">
          Settings that apply across every case and every staff member at {home.name}.
        </p>

        <div className="bg-white border border-line rounded-2xl p-6 mb-6">
          <h2 className="serif text-xl font-medium mb-2">Print supplier</h2>
          <p className="text-muted text-sm mb-5">
            If you already have a print shop you work with (Frazer, Aurora, MKJ, a local printer),
            put their contact here. We&rsquo;ll add a one-click &ldquo;Send to {supplierName || 'your supplier'}&rdquo;
            button on every print artifact page so you can hand off the PDF in two clicks.
          </p>

          {!isAdmin && (
            <p className="text-xs italic text-muted mb-4">
              Only admins can edit these settings. Ask your admin if you need a change.
            </p>
          )}

          <form onSubmit={save}>
            <div className="grid md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Supplier name
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="e.g. Frazer Consultants"
                  className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Supplier email
                </label>
                <input
                  type="email"
                  value={supplierEmail}
                  onChange={(e) => setSupplierEmail(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="orders@your-printer.com"
                  className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm disabled:opacity-60"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                Notes for the supplier <span className="font-normal normal-case text-subtle">(optional)</span>
              </label>
              <textarea
                value={supplierNotes}
                onChange={(e) => setSupplierNotes(e.target.value)}
                disabled={!isAdmin}
                rows={2}
                placeholder="e.g. 'Account #4477. Standard 100lb gloss. Bill to home account.'"
                className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm disabled:opacity-60 resize-y"
              />
              <p className="text-xs text-subtle italic mt-1">
                We&rsquo;ll include these notes in every print order email so you don&rsquo;t have to retype them.
              </p>
            </div>

            {err && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-3">
                {err}
              </div>
            )}
            {msg && (
              <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg p-3 mb-3">
                {msg}
              </div>
            )}

            {isAdmin && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-ink text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-dark disabled:bg-subtle disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
