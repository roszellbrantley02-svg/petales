'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function SignUpClient() {
  const [step, setStep] = useState<'home' | 'account'>('home');
  const [homeName, setHomeName] = useState('');
  const [yourName, setYourName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  function nextStep(e: React.FormEvent) {
    e.preventDefault();
    if (!homeName.trim()) return;
    setStep('account');
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setSubmitting(false);
      return;
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. Create the auth account
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    if (!authData.user) {
      setError('Account created but no user returned. Please try signing in.');
      setSubmitting(false);
      return;
    }

    // 2. Create the funeral home + staff record via API
    try {
      const res = await fetch('/api/auth/setup-home', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          home_name: homeName.trim(),
          staff_name: yourName.trim() || email,
          staff_email: email.trim(),
          auth_user_id: authData.user.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Could not set up funeral home');
      }
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : 'Setup failed';
      setError(m);
      setSubmitting(false);
      return;
    }

    // 3. Sign in the new account (in case email confirmation is off, this is needed for cookies)
    await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    router.push('/home');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <a href="/" className="serif text-3xl font-medium text-ink hover:text-accent">Petales</a>
          <p className="serif italic text-muted text-sm mt-2">A quiet place to gather what matters</p>
        </div>

        <div className="bg-white border border-line rounded-2xl p-8 shadow-sm">
          <h1 className="serif text-2xl font-medium mb-1">Create funeral home account</h1>
          <p className="text-muted text-sm mb-6">
            {step === 'home' ? 'Step 1 of 2 — your funeral home' : 'Step 2 of 2 — your account'}
          </p>

          {step === 'home' && (
            <form onSubmit={nextStep}>
              <div className="mb-5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Funeral home name
                </label>
                <input
                  type="text"
                  value={homeName}
                  onChange={e => setHomeName(e.target.value)}
                  placeholder="Schmidt Family Funeral Home"
                  required
                  autoFocus
                  className="w-full border border-line bg-cream rounded-lg px-3.5 py-3 text-sm focus:border-accent focus:bg-white focus:outline-none"
                />
                <p className="text-xs text-subtle italic mt-2">
                  This is how families will see your home name in their archives.
                </p>
              </div>

              <button
                type="submit"
                disabled={!homeName.trim()}
                className="w-full bg-ink text-white font-medium py-3 rounded-lg hover:bg-accent-dark disabled:bg-subtle disabled:cursor-not-allowed transition-colors"
              >
                Continue →
              </button>
            </form>
          )}

          {step === 'account' && (
            <form onSubmit={signUp}>
              <div className="mb-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Your name
                </label>
                <input
                  type="text"
                  value={yourName}
                  onChange={e => setYourName(e.target.value)}
                  placeholder="Director's name"
                  autoFocus
                  className="w-full border border-line bg-cream rounded-lg px-3.5 py-3 text-sm focus:border-accent focus:bg-white focus:outline-none"
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full border border-line bg-cream rounded-lg px-3.5 py-3 text-sm focus:border-accent focus:bg-white focus:outline-none"
                />
              </div>

              <div className="mb-5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Password <span className="font-normal normal-case text-subtle">(8+ characters)</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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
                {submitting ? 'Creating account…' : 'Create account →'}
              </button>

              <button
                type="button"
                onClick={() => setStep('home')}
                disabled={submitting}
                className="w-full text-muted hover:text-ink text-sm py-2 mt-2"
              >
                ← Back
              </button>
            </form>
          )}

          <p className="text-sm text-muted text-center mt-6">
            Already have an account? <a href="/signin" className="text-accent hover:text-accent-dark font-medium">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
