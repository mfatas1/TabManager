import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowRight, BookOpen, LogIn } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

export default function LoginPage() {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/library';

  if (!loading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!hasSupabaseConfig || !supabase) {
      setError('Supabase is not configured yet.');
      return;
    }

    setSubmitting(true);
    const credentials = { email, password };
    const response = mode === 'login'
      ? await supabase.auth.signInWithPassword(credentials)
      : await supabase.auth.signUp(credentials);

    setSubmitting(false);

    if (response.error) {
      setError(response.error.message);
      return;
    }

    if (mode === 'signup' && !response.data.session) {
      setMessage('Check your email to confirm your account, then come back to sign in.');
      return;
    }

    setMessage('You are signed in.');
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] px-6 py-28 text-[#1e1b2e]">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
        <section>
          <Link to="/" className="mb-8 inline-flex items-center gap-2.5 rounded-md border border-[var(--tm-border)] bg-white px-4 py-1.5">
            <BookOpen className="size-4" />
            <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--tm-text-secondary)] uppercase">
              Folio
            </span>
          </Link>
          <h1 className="font-display max-w-xl text-4xl font-bold leading-tight md:text-6xl">
            Keep your library close.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--tm-text-secondary)]">
            Sign in to save links, shape projects, and keep your graph tied to your own account.
          </p>
        </section>

        <section className="rounded-lg border border-[var(--tm-border)] bg-white p-6 shadow-sm">
          <div className="mb-6 flex rounded-md border border-[var(--tm-border)] bg-[#f7f8f5] p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                mode === 'login' ? 'bg-white text-[var(--tm-accent-hover)] shadow-sm' : 'text-[var(--tm-text-secondary)]'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                mode === 'signup' ? 'bg-white text-[var(--tm-accent-hover)] shadow-sm' : 'text-[var(--tm-text-secondary)]'
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#1e1b2e]">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-md border border-[var(--tm-border-mid)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--tm-accent)] focus:ring-2 focus:ring-[var(--tm-accent)]/15"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#1e1b2e]">Password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                className="w-full rounded-md border border-[var(--tm-border-mid)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--tm-accent)] focus:ring-2 focus:ring-[var(--tm-accent)]/15"
              />
            </label>

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            {message && (
              <p className="rounded-md border border-[var(--tm-border)] bg-[var(--tm-accent-bg)] px-3 py-2 text-sm text-[var(--tm-accent-hover)]">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--tm-accent-hover)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--tm-accent-press)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Working...' : mode === 'login' ? 'Sign in' : 'Create account'}
              {mode === 'login' ? <LogIn className="size-4" /> : <ArrowRight className="size-4" />}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
