import { ensureContrast, hexToOklch, normalizeHex, oklchToHex, readableOn } from './color';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedMode = 'light' | 'dark';

export interface ThemeSettings {
  mode: ThemeMode;
  accent: string;
  tint: string;
}

export interface Swatch {
  id: string;
  label: string;
  value: string;
}

export const ACCENT_PRESETS: Swatch[] = [
  { id: 'emerald', label: 'Emerald', value: '#17805a' },
  { id: 'ocean', label: 'Ocean', value: '#2563c9' },
  { id: 'violet', label: 'Violet', value: '#6d4ae0' },
  { id: 'rose', label: 'Rose', value: '#c8325f' },
  { id: 'amber', label: 'Amber', value: '#b8690a' },
  { id: 'graphite', label: 'Graphite', value: '#3f4a55' },
];

export const BACKGROUND_PRESETS: Swatch[] = [
  { id: 'mist', label: 'Mist', value: '#5f8a74' },
  { id: 'paper', label: 'Paper', value: '#9a8660' },
  { id: 'sky', label: 'Sky', value: '#5d86b8' },
  { id: 'lilac', label: 'Lilac', value: '#8a74b8' },
  { id: 'blush', label: 'Blush', value: '#b8768a' },
  { id: 'neutral', label: 'Neutral', value: '#808080' },
];

export const DEFAULT_THEME: ThemeSettings = {
  mode: 'system',
  accent: ACCENT_PRESETS[0]!.value,
  tint: BACKGROUND_PRESETS[0]!.value,
};

export const THEME_STORAGE_KEY = 'receiptflow:theme';
export const THEME_VARS_STORAGE_KEY = 'receiptflow:theme-vars';

export type ThemeVars = Record<string, string>;

type Tone = [lightness: number, chromaWeight: number];

interface Surfaces {
  canvas: Tone;
  surface: Tone;
  sunken: Tone;
  line: Tone;
  lineStrong: Tone;
  ink: Tone;
  inkMuted: Tone;
  inkFaint: Tone;
}

// The chroma weight is scaled by how colourful the chosen background tint is,
// so "Neutral" stays grey and "Mist" gets a soft green cast.
const LIGHT: Surfaces = {
  canvas: [0.968, 0.016],
  surface: [0.997, 0.004],
  sunken: [0.948, 0.02],
  line: [0.905, 0.022],
  lineStrong: [0.83, 0.024],
  ink: [0.2, 0.022],
  inkMuted: [0.44, 0.024],
  inkFaint: [0.53, 0.022],
};

const DARK: Surfaces = {
  canvas: [0.185, 0.014],
  surface: [0.225, 0.016],
  sunken: [0.265, 0.018],
  line: [0.325, 0.02],
  lineStrong: [0.42, 0.022],
  ink: [0.955, 0.01],
  inkMuted: [0.76, 0.016],
  inkFaint: [0.65, 0.016],
};

const HUES = { success: 156, warning: 72, danger: 25 } as const;

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function sanitizeTheme(input: Partial<ThemeSettings> | null | undefined): ThemeSettings {
  return {
    mode: isThemeMode(input?.mode) ? input.mode : DEFAULT_THEME.mode,
    accent: normalizeHex(input?.accent) ?? DEFAULT_THEME.accent,
    tint: normalizeHex(input?.tint) ?? DEFAULT_THEME.tint,
  };
}

export function buildThemeVars(mode: ResolvedMode, accentHex: string, tintHex: string): ThemeVars {
  const dark = mode === 'dark';
  const S = dark ? DARK : LIGHT;
  const tint = hexToOklch(tintHex);
  const strength = Math.min(tint.c / 0.06, 1);
  const tone = ([l, c]: Tone) => oklchToHex({ l, c: c * strength, h: tint.h });

  // Accent: keep the user's hue, lift it on dark surfaces so it stays visible.
  const a = hexToOklch(accentHex);
  const accent = dark ? oklchToHex({ l: Math.min(0.8, Math.max(0.66, a.l)), c: a.c, h: a.h }) : accentHex;
  const accentFg = readableOn(accent, '#0b1410', '#ffffff');
  const accentSoft = oklchToHex({ l: dark ? 0.27 : 0.952, c: Math.min(a.c, 0.09) * (dark ? 0.7 : 0.45), h: a.h });
  const accentLine = oklchToHex({ l: dark ? 0.4 : 0.85, c: Math.min(a.c, 0.1) * 0.6, h: a.h });
  const accentInk = ensureContrast(oklchToHex({ l: dark ? 0.8 : 0.42, c: Math.min(a.c, 0.16), h: a.h }), accentSoft, 7);

  const semantic = (h: number) => {
    const soft = oklchToHex({ l: dark ? 0.27 : 0.955, c: dark ? 0.05 : 0.035, h });
    return {
      solid: oklchToHex({ l: dark ? 0.72 : 0.6, c: 0.17, h }),
      soft,
      ink: ensureContrast(oklchToHex({ l: dark ? 0.82 : 0.44, c: 0.15, h }), soft, 7),
    };
  };
  const success = semantic(HUES.success);
  const warning = semantic(HUES.warning);
  const danger = semantic(HUES.danger);

  return {
    '--canvas': tone(S.canvas),
    '--surface': tone(S.surface),
    '--sunken': tone(S.sunken),
    '--line': tone(S.line),
    '--line-strong': tone(S.lineStrong),
    '--ink': tone(S.ink),
    '--ink-muted': tone(S.inkMuted),
    '--ink-faint': tone(S.inkFaint),
    '--accent': accent,
    '--accent-fg': accentFg,
    '--accent-soft': accentSoft,
    '--accent-line': accentLine,
    '--accent-ink': accentInk,
    '--success': success.solid,
    '--success-soft': success.soft,
    '--success-ink': success.ink,
    '--warning': warning.solid,
    '--warning-soft': warning.soft,
    '--warning-ink': warning.ink,
    '--danger': danger.solid,
    '--danger-soft': danger.soft,
    '--danger-ink': danger.ink,
  };
}

export function buildAllThemeVars(accent: string, tint: string): Record<ResolvedMode, ThemeVars> {
  return { light: buildThemeVars('light', accent, tint), dark: buildThemeVars('dark', accent, tint) };
}

export function resolveMode(mode: ThemeMode, systemPrefersDark: boolean): ResolvedMode {
  if (mode === 'system') return systemPrefersDark ? 'dark' : 'light';
  return mode;
}

export function applyThemeToDocument(resolved: ResolvedMode, vars: ThemeVars, root: HTMLElement = document.documentElement) {
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', vars['--canvas'] ?? '#f4f7f5');
}
