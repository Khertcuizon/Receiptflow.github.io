import { cn } from '@/lib/cn';
import type { BudgetLevel } from '@/lib/budget';

const FILL: Record<BudgetLevel, string> = {
  ok: 'bg-accent',
  near: 'bg-warning',
  over: 'bg-danger',
};

export function ProgressBar({
  value,
  level = 'ok',
  label,
  className,
}: {
  value: number;
  level?: BudgetLevel;
  label: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-sunken', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500', FILL[level])} style={{ width: `${clamped}%` }} />
    </div>
  );
}
