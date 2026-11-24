import { useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Chart, chartFont, cssVar, prefersReducedMotion, wrapLabel } from './chartSetup';

interface BarChartProps {
  labels: string[];
  values: number[];
  colors: string[];
  /** Full value shown in the tooltip. */
  formatValue: (value: number) => string;
  /** Short value shown on the axis. */
  formatAxis: (value: number) => string;
  ariaLabel: string;
  className?: string;
}

export function BarChart({ labels, values, colors, formatValue, formatAxis, ariaLabel, className }: BarChartProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { resolved, theme } = useTheme();
  const dataKey = JSON.stringify([labels, values, colors]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return undefined;
    const muted = cssVar('--ink-muted');
    const grid = cssVar('--line');
    const chart = new Chart(element, {
      type: 'bar',
      data: {
        labels: labels.map((label) => wrapLabel(label)),
        datasets: [{ data: values, backgroundColor: colors, borderRadius: 6, borderSkipped: false, maxBarThickness: 48 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: prefersReducedMotion() ? false : { duration: 450 },
        font: { family: chartFont() },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: cssVar('--ink'),
            titleColor: cssVar('--surface'),
            bodyColor: cssVar('--surface'),
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            callbacks: { label: (item) => formatValue(Number(item.parsed.y)) },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: muted, maxRotation: 0, autoSkip: labels.length > 8, font: { size: 12 } } },
          y: {
            beginAtZero: true,
            grid: { color: grid },
            border: { display: false },
            ticks: { color: muted, maxTicksLimit: 5, callback: (value) => formatAxis(Number(value)) },
          },
        },
      },
    });
    return () => chart.destroy();
    // dataKey covers labels/values/colors; formatters are stable per currency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, resolved, theme.accent, theme.tint, formatValue, formatAxis]);

  return (
    <div className={className ?? 'h-64'}>
      <canvas ref={canvas} role="img" aria-label={ariaLabel} />
    </div>
  );
}
