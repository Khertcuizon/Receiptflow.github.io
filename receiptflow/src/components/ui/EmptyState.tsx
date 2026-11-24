import type { ElementType, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: ElementType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-panel border border-dashed border-line-strong text-center',
        compact ? 'gap-1 px-4 py-8' : 'gap-1.5 px-6 py-12',
        className,
      )}
    >
      {Icon && (
        <span className="mb-2 grid size-11 place-items-center rounded-full bg-accent-soft text-accent-ink">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      )}
      <p className="font-display text-base font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center gap-1.5 rounded-panel border border-danger/30 bg-danger-soft px-6 py-10 text-center', className)}
    >
      <span className="mb-2 grid size-11 place-items-center rounded-full bg-surface text-danger-ink">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </span>
      <p className="font-display text-base font-semibold text-danger-ink">{title}</p>
      <p className="max-w-md text-sm text-danger-ink/90">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
