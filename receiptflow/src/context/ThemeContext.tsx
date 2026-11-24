import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  THEME_VARS_STORAGE_KEY,
  applyThemeToDocument,
  buildAllThemeVars,
  resolveMode,
  sanitizeTheme,
  type ResolvedMode,
  type ThemeMode,
  type ThemeSettings,
} from '@/lib/theme';
import { normalizeHex } from '@/lib/color';

interface ThemeContextValue {
  theme: ThemeSettings;
  resolved: ResolvedMode;
  setMode: (mode: ThemeMode) => void;
  setAccent: (hex: string) => void;
  setTint: (hex: string) => void;
  toggle: () => void;
  reset: () => void;
  isCustomized: boolean;
  /** The accent colour as actually rendered in the current mode (lifted in dark mode). */
  accentColor: string;
  accentLine: string;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function loadTheme(): ThemeSettings {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return sanitizeTheme(raw ? (JSON.parse(raw) as Partial<ThemeSettings>) : null);
  } catch {
    return DEFAULT_THEME;
  }
}

const prefersDark = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(loadTheme);
  const [systemDark, setSystemDark] = useState(prefersDark);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) return undefined;
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) setTheme(loadTheme());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const resolved = resolveMode(theme.mode, systemDark);
  const vars = useMemo(() => buildAllThemeVars(theme.accent, theme.tint), [theme.accent, theme.tint]);

  useLayoutEffect(() => {
    applyThemeToDocument(resolved, vars[resolved]);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
      localStorage.setItem(THEME_VARS_STORAGE_KEY, JSON.stringify(vars));
    } catch {
      /* Storage can be full or blocked; the theme still applies for this session. */
    }
  }, [theme, resolved, vars]);

  const setMode = useCallback((mode: ThemeMode) => setTheme((t) => ({ ...t, mode })), []);
  const setAccent = useCallback((hex: string) => {
    const accent = normalizeHex(hex);
    if (accent) setTheme((t) => ({ ...t, accent }));
  }, []);
  const setTint = useCallback((hex: string) => {
    const tint = normalizeHex(hex);
    if (tint) setTheme((t) => ({ ...t, tint }));
  }, []);
  const toggle = useCallback(() => {
    setTheme((t) => ({ ...t, mode: resolveMode(t.mode, prefersDark()) === 'dark' ? 'light' : 'dark' }));
  }, []);
  const reset = useCallback(() => setTheme(DEFAULT_THEME), []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolved,
      setMode,
      setAccent,
      setTint,
      toggle,
      reset,
      accentColor: vars[resolved]['--accent'] ?? theme.accent,
      accentLine: vars[resolved]['--accent-line'] ?? theme.accent,
      isCustomized: theme.accent !== DEFAULT_THEME.accent || theme.tint !== DEFAULT_THEME.tint || theme.mode !== DEFAULT_THEME.mode,
    }),
    [theme, resolved, vars, setMode, setAccent, setTint, toggle, reset],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>.');
  return value;
}
