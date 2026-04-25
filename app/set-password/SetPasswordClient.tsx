'use client';

// Set-password page — landed here from the staff invitation email.
// Supabase's recovery link puts an access_token + refresh_token in the URL hash.
// We exchange those for a session, then let the user set their password.

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get('welcome') === '1';

  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // 1. On mount, exchange the URL-hash tokens for a real session.
  useEffect(() => {
    async function exchangeTokens() {
      // Supabase puts the tokens in the URL fragment, e.g.
      //   #access_token=xxx&refresh_token=yyy&expires_in=3600&type=recovery
      const hash = window.location.hash.slice(1); // drop the leading '#'
      const params = new URLSearchParams(hash);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (!access_token || !refresh_token) {
        // Maybe the user is already signed in (e.g. returning to this page)
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSessionReady(true);
        } else {
          setSessionError('This password-reset link is invalid or has expired. Ask your admin to send you a new invitation.');
        }
        return;
      }

      const { error: setErr } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (setErr) {
        setSessionError(setErr.message);
        return;
      }

      // Clean the hash from the URL so reloading doesn't re-process the tokens
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      setSessionReady(true);
    }
    exchangeTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords don’t match.');
      return;
    }
    setSubmitting(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push('/home'), 1500);
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <a href="/" className="serif text-3xl font-medium text-ink hover:text-accent">Petales</a>
          <p className="serif italic text-muted text-sm mt-2">A quiet place to gather what matters</p>
        </div>

        <div className="bg-white border border-line rounded-2xl p-8 shadow-sm">
          {sessionError && (
            <>
              <h1 className="serif text-2xl font-medium mb-2">Link not valid</h1>
              <p className="text-sm text-muted mb-4">{sessionError}</p>
              <a href="/signin" className="text-accent hover:text-accent-dark text-sm font-medium">Go to sign in &rarr;</a>
            </>
          )}

          {!sessionError && !sessionReady && (
            <p className="text-muted text-sm">Verifying your invitation…</p>
          )}

          {!sessionError && sessionReady && !done && (
            <>
              <h1 className="serif text-2xl font-medium mb-1">
                {isWelcome ? 'Welcome to Petales' : 'Set a new password'}
              </h1>
              <p className="text-muted text-sm mb-6">
                {isWelcome
                  ? 'Choose a password to finish setting up your account.'
                  : 'Enter your new password below.'}
              </p>

              <form onSubmit={submit}>
                <div className="mb-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                    New password <span className="font-normal normal-case text-subtle">(8+ characters)</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoFocus
                    autoComplete="new-password"
                    className="w-full border border-line bg-cream rounded-lg px-3.5 py-3 text-sm focus:border-accent focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="mb-5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
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
                  {submitting ? 'Saving…' : 'Set password and sign in'}
                </button>
              </form>
            </>
          )}

          {done && (
            <>
              <h1 className="serif text-2xl font-medium mb-2">All set</h1>
              <p className="text-sm text-muted">Taking you to your dashboard…</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
