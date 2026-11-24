/** Small colour toolkit (sRGB hex <-> OKLCH, WCAG contrast). No dependencies. */

export interface Oklch {
  l: number; // 0..1
  c: number; // 0..~0.37
  h: number; // 0..360
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const fromLinear = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

export function normalizeHex(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  const short = v.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  return null;
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = normalizeHex(hex) ?? '#000000';
  return [parseInt(n.slice(1, 3), 16), parseInt(n.slice(3, 5), 16), parseInt(n.slice(5, 7), 16)];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const part = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function hexToOklch(hex: string): Oklch {
  const [r8, g8, b8] = hexToRgb(hex);
  const r = toLinear(r8 / 255);
  const g = toLinear(g8 / 255);
  const b = toLinear(b8 / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.sqrt(a * a + bb * bb);
  const h = c < 1e-4 ? 0 : ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

function oklchToLinearRgb({ l, c, h }: Oklch): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const inGamut = (rgb: [number, number, number]) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);

/** Converts OKLCH to hex, reducing chroma until the colour fits in sRGB. */
export function oklchToHex(color: Oklch): string {
  const l = clamp(color.l, 0, 1);
  let c = Math.max(0, color.c);
  let rgb = oklchToLinearRgb({ l, c, h: color.h });
  for (let i = 0; i < 40 && !inGamut(rgb); i += 1) {
    c *= 0.93;
    rgb = oklchToLinearRgb({ l, c, h: color.h });
  }
  const [r, g, b] = rgb.map((v) => fromLinear(clamp(v, 0, 1)) * 255) as [number, number, number];
  return rgbToHex(r, g, b);
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => toLinear(v / 255)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Returns whichever of black-ish or white gives the better contrast on `background`. */
export function readableOn(background: string, dark = '#0d1411', light = '#ffffff'): string {
  return contrastRatio(background, light) >= contrastRatio(background, dark) ? light : dark;
}

/** Nudges lightness until `colour` reaches `target` contrast against `background`. */
export function ensureContrast(colour: string, background: string, target: number): string {
  if (contrastRatio(colour, background) >= target) return colour;
  const base = hexToOklch(colour);
  const bgDark = relativeLuminance(background) < 0.4;
  let l = base.l;
  for (let i = 0; i < 80; i += 1) {
    l = clamp(l + (bgDark ? 0.01 : -0.01), 0, 1);
    const next = oklchToHex({ ...base, l });
    if (contrastRatio(next, background) >= target) return next;
  }
  return bgDark ? '#ffffff' : '#000000';
}
