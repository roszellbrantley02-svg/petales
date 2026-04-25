'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Staff } from '@/lib/types';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  director: 'Director',
  staff: 'Staff',
};

interface Props {
  staff: Staff[];
  homeName: string;
  currentStaffId: string;
  currentRole: string;
}

export default function StaffPageClient({
  staff: initialStaff,
  homeName,
  currentStaffId,
  currentRole,
}: Props) {
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteEmailSent, setInviteEmailSent] = useState(false);
  const [inviteRecipient, setInviteRecipient] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [inviteRole, setInviteRole] = useState<'staff' | 'director' | 'admin'>('staff');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const isAdmin = currentRole === 'admin';

  async function inviteStaff(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/auth/invite-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Could not invite staff member');
      }

      const newStaff = await res.json();
      setStaff([...staff, newStaff]);
      setInviteName('');
      setInviteEmail('');
      setInviteRole('staff');
      setInviteLink(newStaff.inviteLink || '');
      setInviteEmailSent(!!newStaff.emailSent);
      setInviteRecipient(newStaff.recipientEmail || inviteEmail.trim());
      setLinkCopied(false);
      setInviteSuccess(
        newStaff.emailSent
          ? `Invitation email sent to ${newStaff.recipientEmail || inviteEmail.trim()}. Their link is also shown below in case it doesn\u2019t arrive.`
          : `Account created. The invitation email could not be sent automatically \u2014 copy the link below and send it to them yourself.`
      );
      router.refresh();
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : 'Unknown error';
      setError(m);
    } finally {
      setSubmitting(false);
    }
  }

  async function removeStaff(id: string) {
    if (id === currentStaffId) {
      alert("You can't remove yourself.");
      return;
    }
    if (!confirm('Remove this staff member? They will no longer be able to sign in.')) return;
    try {
      const res = await fetch(`/api/auth/remove-staff?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Could not remove');
      }
      setStaff(staff.filter(s => s.id !== id));
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : 'Unknown error';
      alert(m);
    }
  }

  async function signOut() {
    if (!confirm('Sign out?')) return;
    await fetch('/api/auth/signout', { method: 'POST' });
    window.location.href = '/signin';
  }

  return (
    <div className="min-h-screen bg-[#f5f3ed]">
      <div className="bg-white border-b border-line px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="serif text-xl font-medium">Petales</span>
          <span className="text-subtle">·</span>
          <span className="text-sm font-medium text-ink">{homeName}</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/home" className="text-muted text-sm hover:text-ink">← All families</a>
          <button onClick={signOut} className="text-muted text-sm hover:text-ink">Sign out</button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex justify-between items-baseline mb-6">
          <div>
            <h1 className="serif text-3xl font-medium tracking-tight">Staff</h1>
            <p className="text-muted text-sm">
              {staff.length} {staff.length === 1 ? 'person' : 'people'} can sign in to {homeName}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setInviteOpen(true)}
              className="bg-sage text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sage-dark transition-colors"
            >
              + Add staff
            </button>
          )}
        </div>

        {!isAdmin && (
          <p className="text-xs text-muted italic mb-4 text-center">
            Only admins can add or remove staff. Ask your admin if you need someone added.
          </p>
        )}

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          {staff.map(s => (
            <div key={s.id} className="px-5 py-4 border-b border-line last:border-b-0 flex justify-between items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm">
                  {s.name || s.email}
                  {s.id === currentStaffId && (
                    <span className="text-xs text-sage font-normal ml-2">(you)</span>
                  )}
                </div>
                <div className="text-xs text-muted mt-0.5">{s.email}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-0.5 bg-tag text-muted rounded-full font-medium">
                  {ROLE_LABELS[s.role] || s.role}
                </span>
                {isAdmin && s.id !== currentStaffId && (
                  <button
                    onClick={() => removeStaff(s.id)}
                    className="text-subtle hover:text-red-600 text-sm px-1"
                    title="Remove staff member"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite modal */}
      {inviteOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-5 z-50"
          onClick={() => setInviteOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-7 max-w-md w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="serif text-xl font-medium mb-2">Invite a staff member</h2>
            <p className="text-muted text-sm mb-5">
              They&rsquo;ll receive an email with a link to set their own password and sign in. They don&rsquo;t need anything from you.
            </p>

            <form onSubmit={inviteStaff}>
              <div className="mb-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Name</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="Their name"
                  className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-sage focus:bg-white focus:outline-none"
                />
              </div>

              <div className="mb-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="director2@yourhome.com"
                  required
                  className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-sage focus:bg-white focus:outline-none"
                />
              </div>

              <div className="mb-5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as 'staff' | 'director' | 'admin')}
                  className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-sage focus:bg-white focus:outline-none"
                >
                  <option value="staff">Staff — can use the console</option>
                  <option value="director">Director — same as Staff (label only)</option>
                  <option value="admin">Admin — can add and remove staff</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
                  {error}
                </div>
              )}

              {inviteSuccess && (
                <div className={`text-sm rounded-lg p-3 mb-4 ${inviteEmailSent ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-amber-50 border border-amber-200 text-amber-900'}`}>
                  {inviteSuccess}
                </div>
              )}

              {inviteLink && (
                <div className="bg-cream border border-line rounded-lg p-3 mb-4">
                  <div className="text-xs uppercase tracking-wider text-muted mb-1.5">
                    Invitation link {inviteRecipient ? `for ${inviteRecipient}` : ''}
                  </div>
                  <div className="text-xs break-all bg-white border border-line rounded p-2 text-ink mb-2 font-mono">
                    {inviteLink}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(inviteLink);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2000);
                      } catch {
                        // Fallback: select the text in the box
                        alert('Copy this link manually: ' + inviteLink);
                      }
                    }}
                    className="text-xs uppercase tracking-wider text-accent hover:text-accent-dark font-medium"
                  >
                    {linkCopied ? '\u2713 Copied' : 'Copy link'}
                  </button>
                  <p className="text-xs text-subtle italic mt-2 leading-relaxed">
                    The link expires in 24 hours. The new staff member clicks it to set their password and sign in.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInviteOpen(false);
                    setInviteSuccess('');
                    setInviteLink('');
                    setInviteEmailSent(false);
                    setInviteRecipient('');
                  }}
                  disabled={submitting}
                  className="text-muted hover:text-ink px-4 py-2 font-medium text-sm"
                >
                  {inviteLink ? 'Done' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-sage text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-sage-dark disabled:bg-subtle disabled:cursor-not-allowed"
                >
                  {submitting ? 'Sending invitation…' : 'Send invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
