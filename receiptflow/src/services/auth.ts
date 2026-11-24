import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { AppUser } from '@/types';
import { consumeOAuthError } from '@/lib/oauthUrl';
import { getSupabase, toError } from './supabase';

export type AuthIntent = 'login' | 'register';

const INTENT_KEY = 'receiptflow_google_auth_intent';

export const GMAIL_ONLY_MESSAGE = 'Please use a Google account with a @gmail.com address.';

export function profileFromAuthUser(user: User | null | undefined): AppUser | null {
  if (!user) return null;
  const meta = user.user_metadata as { full_name?: string } | undefined;
  return {
    id: user.id,
    name: meta?.full_name || user.email?.split('@')[0] || 'Account',
    email: user.email || '',
  };
}

export function getPendingIntent(): AuthIntent | null {
  try {
    const value = sessionStorage.getItem(INTENT_KEY);
    return value === 'login' || value === 'register' ? value : null;
  } catch {
    return null;
  }
}

function setIntent(intent: AuthIntent | null) {
  try {
    if (intent) sessionStorage.setItem(INTENT_KEY, intent);
    else sessionStorage.removeItem(INTENT_KEY);
  } catch {
    /* sessionStorage can be unavailable in private modes; the flow still works for same-tab redirects. */
  }
}

function clearIntentAndUrl() {
  setIntent(null);
  if (window.location.search || window.location.hash) {
    window.history.replaceState(null, document.title, window.location.pathname);
  }
}

export async function startGoogleOAuth(intent: AuthIntent): Promise<void> {
  setIntent(intent);
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  try {
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, queryParams: { prompt: 'select_account' } },
    });
    if (error) throw error;
  } catch (error) {
    setIntent(null);
    throw toError(error);
  }
}

export function isGmailGoogleUser(user: User | null | undefined): boolean {
  const providers = (user?.app_metadata?.providers as string[] | undefined) ?? [];
  return providers.includes('google') && /^[^@\s]+@gmail\.com$/i.test(user?.email ?? '');
}

async function hasRegisteredAccount(client: SupabaseClient, user: User): Promise<boolean> {
  const { data, error } = await client.from('account_profiles').select('user_id').eq('user_id', user.id).maybeSingle();
  if (error) throw toError(error);
  return Boolean(data);
}

async function signOutOrThrow(client: SupabaseClient) {
  const { error } = await client.auth.signOut();
  if (error) throw toError(error);
}

export type OAuthResult =
  | { handled: false }
  | { handled: true; success: true; registered: boolean }
  | { handled: true; success: false; message: string };

let inflight: { intent: AuthIntent; promise: Promise<OAuthResult> } | null = null;

/**
 * Finishes a Google redirect on /login or /register. Safe to call twice in a
 * row (React StrictMode): the second call shares the first call's result.
 */
export function completeGoogleOAuth(intent: AuthIntent): Promise<OAuthResult> {
  if (inflight?.intent === intent) return inflight.promise;
  const promise = runCompleteGoogleOAuth(intent).finally(() => {
    setTimeout(() => {
      if (inflight?.promise === promise) inflight = null;
    }, 1500);
  });
  inflight = { intent, promise };
  return promise;
}

async function runCompleteGoogleOAuth(intent: AuthIntent): Promise<OAuthResult> {
  if (getPendingIntent() !== intent) return { handled: false };

  const oauthError = consumeOAuthError();
  if (oauthError) {
    clearIntentAndUrl();
    return { handled: true, success: false, message: oauthError };
  }

  const client = getSupabase();
  const { data, error } = await client.auth.getUser();
  if (error) throw toError(error);
  if (!data.user) return { handled: false };

  if (!isGmailGoogleUser(data.user)) {
    await signOutOrThrow(client);
    clearIntentAndUrl();
    return { handled: true, success: false, message: GMAIL_ONLY_MESSAGE };
  }

  const hasAccount = await hasRegisteredAccount(client, data.user);

  if (intent === 'register') {
    if (hasAccount) {
      await signOutOrThrow(client);
      clearIntentAndUrl();
      return { handled: true, success: false, message: 'An account already exists. Please log in instead.' };
    }
    const { error: insertError } = await client.from('account_profiles').insert({
      user_id: data.user.id,
      email: data.user.email,
      full_name: profileFromAuthUser(data.user)?.name,
    });
    if (insertError) throw toError(insertError);
    await signOutOrThrow(client);
    clearIntentAndUrl();
    return { handled: true, success: true, registered: true };
  }

  if (!hasAccount) {
    await signOutOrThrow(client);
    clearIntentAndUrl();
    return { handled: true, success: false, message: 'No account found. Please create an account before logging in.' };
  }

  clearIntentAndUrl();
  return { handled: true, success: true, registered: false };
}

export type SessionCheck =
  | { ok: true; user: AppUser }
  | { ok: false; reason: 'no-session' | 'invalid-account' }
  | { ok: false; reason: 'error'; message: string };

/** Confirms there is a signed-in, registered Gmail/Google user. Signs out anything else. */
export async function verifyAppSession(): Promise<SessionCheck> {
  let client: SupabaseClient;
  try {
    client = getSupabase();
  } catch (error) {
    return { ok: false, reason: 'error', message: toError(error).message };
  }

  try {
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) return { ok: false, reason: 'no-session' };

    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    if (!data.user) return { ok: false, reason: 'no-session' };

    if (!isGmailGoogleUser(data.user) || !(await hasRegisteredAccount(client, data.user))) {
      await signOutOrThrow(client);
      return { ok: false, reason: 'invalid-account' };
    }
    return { ok: true, user: profileFromAuthUser(data.user)! };
  } catch (error) {
    return { ok: false, reason: 'error', message: toError(error, 'Unable to verify your session.').message };
  }
}

export async function signOutUser(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw toError(error);
}
