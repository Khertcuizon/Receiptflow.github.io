import { useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Chart, chartFont, cssVar, prefersReducedMotion } from './chartSetup';

interface DoughnutChartProps {
  labels: string[];
  values: number[];
  colors: string[];
  formatValue: (value: number) => string;
  ariaLabel: string;
  className?: string;
}

export function DoughnutChart({ labels, values, colors, formatValue, ariaLabel, className }: DoughnutChartProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { resolved, theme } = useTheme();
  const dataKey = JSON.stringify([labels, values, colors]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return undefined;
    const chart = new Chart(element, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: values, backgroundColor: colors, borderColor: cssVar('--surface'), borderWidth: 3, hoverOffset: 6 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
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
            callbacks: { label: (item) => ` ${item.label}: ${formatValue(Number(item.parsed))}` },
          },
        },
      },
    });
    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, resolved, theme.accent, theme.tint, formatValue]);

  return (
    <div className={className ?? 'h-56'}>
      <canvas ref={canvas} role="img" aria-label={ariaLabel} />
    </div>
  );
}
