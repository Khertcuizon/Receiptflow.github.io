/**
 * Supabase's client clears OAuth parameters from the URL while it initialises.
 * This module is imported first (see main.tsx) so a redirect error such as
 * "access_denied" is captured before that happens.
 */
function readErrorFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return search.get('error_description') || hash.get('error_description') || null;
}

let captured: string | null = readErrorFromLocation();

export function consumeOAuthError(): string | null {
  const value = captured ?? readErrorFromLocation();
  captured = null;
  return value;
}
