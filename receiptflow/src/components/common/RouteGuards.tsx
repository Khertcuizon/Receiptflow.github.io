import { Navigate, Outlet, useLocation } from 'react-router';
import { Loader2, TriangleAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { DataProvider } from '@/context/DataContext';
import { signOutUser } from '@/services/auth';
import { supabaseConfigError } from '@/services/supabase';
import { Button } from '@/components/ui/Button';
import { BrandMark } from './Logo';

export function FullScreenLoader({ label = 'Loading your workspace…' }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <BrandMark className="size-12" />
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {label}
        </p>
      </div>
    </div>
  );
}

export function SetupNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const isConfig = message === supabaseConfigError;
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas p-6">
      <div role="alert" className="w-full max-w-md rounded-panel border border-line bg-surface p-6 shadow-panel">
        <span className="mb-4 grid size-11 place-items-center rounded-full bg-warning-soft text-warning-ink">
          <TriangleAlert className="size-5" aria-hidden="true" />
        </span>
        <h1 className="font-display text-xl font-semibold">{isConfig ? 'Finish setting up Supabase' : "We couldn't verify your session"}</h1>
        <p className="mt-2 text-ink-muted">{message}</p>
        {isConfig && (
          <p className="mt-3 text-sm text-ink-muted">
            Create <code className="rounded bg-sunken px-1.5 py-0.5 text-[13px] text-ink">.env</code> from <code className="rounded bg-sunken px-1.5 py-0.5 text-[13px] text-ink">.env.example</code>, add your project URL and publishable key, then restart the dev server.
          </p>
        )}
        {!isConfig && (
          <div className="mt-5 flex flex-wrap gap-2">
            {onRetry && <Button onClick={onRetry}>Try again</Button>}
            <Button
              variant="secondary"
              onClick={() => {
                void signOutUser()
                  .catch(() => undefined)
                  .finally(() => window.location.assign('/login'));
              }}
            >
              Back to login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Renders the signed-in area, or sends visitors to /login. */
export function ProtectedRoute() {
  const { state, refresh } = useAuth();
  const location = useLocation();

  if (state.status === 'loading') return <FullScreenLoader />;
  if (state.status === 'error') return <SetupNotice message={state.error} onRetry={() => void refresh()} />;
  if (state.status === 'unauthenticated') return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return (
    <DataProvider key={state.user.id} user={state.user}>
      <Outlet />
    </DataProvider>
  );
}

/** Login/register pages: signed-in people go straight to the dashboard. */
export function GuestRoute() {
  const { state } = useAuth();
  if (state.status === 'authenticated') return <Navigate to="/dashboard" replace />;
  if (state.status === 'error' && state.error === supabaseConfigError) return <SetupNotice message={state.error} />;
  return <Outlet />;
}
