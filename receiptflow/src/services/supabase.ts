import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

const looksLikePlaceholder = (value: string) => /YOUR_(PROJECT_ID|PUBLIC_ANON_KEY)/.test(value);

export const supabaseConfigError: string | null =
  !url || !anonKey || looksLikePlaceholder(url) || looksLikePlaceholder(anonKey)
    ? 'Supabase is not configured. Copy .env.example to .env, then set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    : null;

export const supabase: SupabaseClient | null = supabaseConfigError ? null : createClient(url!, anonKey!);

export function getSupabase(): SupabaseClient {
  if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase is not configured.');
  return supabase;
}

/** Normalises Supabase/PostgREST errors (which are not always Error instances). */
export function toError(error: unknown, fallback = 'Something went wrong.'): Error {
  if (error instanceof Error) return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const { message } = error as { message?: unknown };
    if (typeof message === 'string' && message) return new Error(message);
  }
  return new Error(fallback);
}
