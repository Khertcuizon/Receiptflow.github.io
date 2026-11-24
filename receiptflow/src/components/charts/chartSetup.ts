import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';

Chart.register(ArcElement, BarController, BarElement, CategoryScale, DoughnutController, LinearScale, Legend, Tooltip);

export { Chart };

export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function chartFont(): string {
  return getComputedStyle(document.body).fontFamily;
}

/** Splits a long label onto several lines so axis labels don't collide on narrow screens. */
export function wrapLabel(label: string, maxChars = 11): string | string[] {
  if (label.length <= maxChars) return label;
  const lines: string[] = [];
  let line = '';
  for (const word of label.split(' ')) {
    if (line && `${line} ${word}`.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.length > 3 ? [...lines.slice(0, 2), `${lines.slice(2).join(' ').slice(0, maxChars - 1)}…`] : lines;
}
