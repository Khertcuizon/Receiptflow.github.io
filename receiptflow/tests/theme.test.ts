import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { contrastRatio, hexToOklch, normalizeHex, oklchToHex } from '@/lib/color';
import {
  ACCENT_PRESETS,
  BACKGROUND_PRESETS,
  DEFAULT_THEME,
  buildThemeVars,
  resolveMode,
  sanitizeTheme,
  type ResolvedMode,
} from '@/lib/theme';

describe('color toolkit', () => {
  it('normalises hex values', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex(' #17805A ')).toBe('#17805a');
    expect(normalizeHex('red')).toBeNull();
    expect(normalizeHex(undefined)).toBeNull();
  });

  it('round-trips hex through OKLCH', () => {
    for (const hex of ['#17805a', '#ffffff', '#000000', '#c8325f', '#2563c9']) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex);
    }
  });

  it('matches known WCAG contrast ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
  });

  it('never returns out-of-gamut garbage for extreme chroma', () => {
    expect(oklchToHex({ l: 0.7, c: 0.9, h: 140 })).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('theme tokens', () => {
  const modes: ResolvedMode[] = ['light', 'dark'];
  const combos = ACCENT_PRESETS.flatMap((accent) => BACKGROUND_PRESETS.map((tint) => ({ accent, tint })));

  it.each(modes)('keeps text readable (WCAG AA) for every accent x background in %s mode', (mode) => {
    for (const { accent, tint } of combos) {
      const v = buildThemeVars(mode, accent.value, tint.value);
      const label = `${accent.id}/${tint.id}/${mode}`;
      // Body text on every surface it can appear on.
      for (const surface of ['--canvas', '--surface', '--sunken']) {
        expect(contrastRatio(v['--ink']!, v[surface]!), `ink on ${surface} ${label}`).toBeGreaterThanOrEqual(7);
        expect(contrastRatio(v['--ink-muted']!, v[surface]!), `muted on ${surface} ${label}`).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrastRatio(v['--ink-faint']!, v['--surface']!), `faint ${label}`).toBeGreaterThanOrEqual(3);
      // Primary button label and accent text on its soft tint.
      expect(contrastRatio(v['--accent-fg']!, v['--accent']!), `button ${label}`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(v['--accent-ink']!, v['--accent-soft']!), `accent-ink ${label}`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(v['--accent-ink']!, v['--surface']!), `accent-ink on surface ${label}`).toBeGreaterThanOrEqual(4.5);
      // Status badges.
      for (const tone of ['success', 'warning', 'danger']) {
        expect(contrastRatio(v[`--${tone}-ink`]!, v[`--${tone}-soft`]!), `${tone} badge ${label}`).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrastRatio(v['--danger-ink']!, v['--surface']!), `danger button ${label}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('stays readable with arbitrary custom colours', () => {
    const picks = ['#ffff00', '#00ffff', '#ff00ff', '#111111', '#fefefe', '#7f7f7f', '#0000ff'];
    for (const mode of modes) {
      for (const accent of picks) {
        for (const tint of picks) {
          const v = buildThemeVars(mode, accent, tint);
          expect(contrastRatio(v['--accent-fg']!, v['--accent']!), `${accent}/${mode}`).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(v['--ink']!, v['--canvas']!), `${tint}/${mode}`).toBeGreaterThanOrEqual(7);
          expect(contrastRatio(v['--accent-ink']!, v['--surface']!), `accent-ink ${accent}/${tint}/${mode}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it('keeps the static defaults in styles/index.css in sync with buildThemeVars()', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');
    for (const mode of modes) {
      const block = css.split(mode === 'light' ? ':root {' : ':root.dark {')[1]!.split('}')[0]!;
      const vars = buildThemeVars(mode, DEFAULT_THEME.accent, DEFAULT_THEME.tint);
      for (const [name, value] of Object.entries(vars)) {
        expect(block, `${name} (${mode})`).toContain(`${name}: ${value};`);
      }
    }
  });

  it('resolves and sanitises theme settings', () => {
    expect(resolveMode('system', true)).toBe('dark');
    expect(resolveMode('light', true)).toBe('light');
    expect(sanitizeTheme({ mode: 'bogus' as never, accent: 'nope', tint: '#ABC' })).toEqual({
      mode: 'system',
      accent: DEFAULT_THEME.accent,
      tint: '#aabbcc',
    });
    expect(sanitizeTheme(null)).toEqual(DEFAULT_THEME);
  });
});
