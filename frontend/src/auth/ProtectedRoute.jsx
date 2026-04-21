import { Navigate, useLocation } from 'react-router-dom';
import { hasSupabaseConfig } from '../lib/supabase';
import { useAuth } from './useAuth';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const { loading, isAuthenticated } = useAuth();

  if (!hasSupabaseConfig) {
    return (
      <main className="min-h-screen bg-[#f7f8f5] px-6 pt-32 text-[#26312d]">
        <div className="mx-auto max-w-xl rounded-lg border border-[var(--tm-border)] bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-[var(--tm-accent-hover)]">Supabase is not configured yet.</p>
          <p className="text-sm leading-relaxed text-[var(--tm-text-secondary)]">
            Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your frontend environment,
            then restart the Vite dev server.
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f8f5] px-6 pt-32 text-center text-sm text-[var(--tm-text-secondary)]">
        Checking your session...
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
