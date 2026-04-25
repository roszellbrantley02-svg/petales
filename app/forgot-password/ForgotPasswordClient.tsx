'use client';

import { useState } from 'react';

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [resetLink, setResetLink] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not start password reset');
      setSubmitted(true);
      // Server returns the link only when the request comes from a real
      // staff/admin context (so we don't leak email-existence). For self-serve
      // forgot-password, the link is NOT returned — see API.
      if (json.resetLink) setResetLink(json.resetLink);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <a href="/" className="serif text-3xl font-medium text-ink hover:text-accent">Petales</a>
          <p className="serif italic text-muted text-sm mt-2">A quiet place to gather what matters</p>
        </div>

        <div className="bg-white border border-line rounded-2xl p-8 shadow-sm">
          {!submitted && (
            <>
              <h1 className="serif text-2xl font-medium mb-1">Reset your password</h1>
              <p className="text-muted text-sm mb-6">
                Enter your email. If it&rsquo;s registered, we&rsquo;ll send you a link to set a new one.
              </p>

              <form onSubmit={submit}>
                <div className="mb-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                    className="w-full border border-line bg-cream rounded-lg px-3.5 py-3 text-sm focus:border-accent focus:bg-white focus:outline-none"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-ink text-white font-medium py-3 rounded-lg hover:bg-accent-dark disabled:bg-subtle disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}

          {submitted && (
            <>
              <h1 className="serif text-2xl font-medium mb-2">Check your inbox</h1>
              <p className="text-sm text-muted mb-4">
                If <strong className="text-ink">{email}</strong> is registered, a password reset link is on its way. The link is good for 24 hours.
              </p>
              {resetLink && (
                <div className="bg-cream border border-line rounded-lg p-3 mb-4">
                  <div className="text-xs uppercase tracking-wider text-muted mb-1.5">Or use this direct link</div>
                  <div className="text-xs break-all bg-white border border-line rounded p-2 text-ink font-mono">
                    {resetLink}
                  </div>
                </div>
              )}
              <p className="text-xs text-subtle italic mt-2">
                Don&rsquo;t see the email? Check your spam folder, or contact your funeral home admin.
              </p>
            </>
          )}

          <p className="text-sm text-muted text-center mt-6">
            <a href="/signin" className="text-accent hover:text-accent-dark font-medium">← Back to sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
