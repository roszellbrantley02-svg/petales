'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

interface Props {
  next: string;
}

export default function SignInClient({ next }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <a href="/" className="serif text-3xl font-medium text-ink hover:text-accent">Petales</a>
          <p className="serif italic text-muted text-sm mt-2">A quiet place to gather what matters</p>
        </div>

        <div className="bg-white border border-line rounded-2xl p-8 shadow-sm">
          <h1 className="serif text-2xl font-medium mb-1">Sign in</h1>
          <p className="text-muted text-sm mb-6">For funeral home staff</p>

          <form onSubmit={signIn}>
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

            <div className="mb-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
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
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-sm text-muted text-center mt-4">
            <a href="/forgot-password" className="text-muted hover:text-ink underline underline-offset-2">Forgot your password?</a>
          </p>

          <p className="text-sm text-muted text-center mt-6">
            New funeral home? <a href="/signup" className="text-accent hover:text-accent-dark font-medium">Create an account</a>
          </p>
        </div>

        <p className="text-center text-xs text-subtle italic mt-6">
          Trouble signing in? Email roszellbrantley02@gmail.com
        </p>
      </div>
    </div>
  );
}
