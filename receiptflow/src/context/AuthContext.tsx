import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppUser } from '@/types';
import { getPendingIntent, signOutUser, verifyAppSession, type SessionCheck } from '@/services/auth';
import { supabase, supabaseConfigError } from '@/services/supabase';

type AuthState =
  | { status: 'loading'; user: null; error: null }
  | { status: 'authenticated'; user: AppUser; error: null }
  | { status: 'unauthenticated'; user: null; error: null }
  | { status: 'error'; user: null; error: string };

interface AuthContextValue {
  state: AuthState;
  /** Re-checks the session with Supabase and updates the state. */
  refresh: () => Promise<SessionCheck>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const LOADING: AuthState = { status: 'loading', user: null, error: null };
const SIGNED_OUT: AuthState = { status: 'unauthenticated', user: null, error: null };

const isAuthPath = (path: string) => path === '/login' || path === '/register';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(supabaseConfigError ? { status: 'error', user: null, error: supabaseConfigError } : LOADING);

  const refresh = useCallback(async (): Promise<SessionCheck> => {
    const result = await verifyAppSession();
    if (result.ok) setState({ status: 'authenticated', user: result.user, error: null });
    else if (result.reason === 'error') setState({ status: 'error', user: null, error: result.message });
    else setState(SIGNED_OUT);
    return result;
  }, []);

  useEffect(() => {
    if (supabaseConfigError || !supabase) return undefined;

    // Returning from Google on /login or /register: the page itself finishes
    // the flow (it may need to create the profile first), so don't verify yet.
    if (getPendingIntent() && isAuthPath(window.location.pathname)) setState(SIGNED_OUT);
    else void refresh();

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setState(SIGNED_OUT);
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await signOutUser();
    setState(SIGNED_OUT);
  }, []);

  const value = useMemo(() => ({ state, refresh, signOut }), [state, refresh, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
}
