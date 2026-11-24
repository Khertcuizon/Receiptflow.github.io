import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: ComponentProps<'section'>) {
  return <section className={cn('rounded-panel border border-line bg-surface shadow-panel', className)} {...props} />;
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  as?: 'h2' | 'h3';
}

export function CardHeader({ title, description, action, className, as: Heading = 'h2' }: CardHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5', className)}>
      <div className="min-w-0">
        <Heading className="font-display text-base font-semibold leading-tight">{title}</Heading>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('p-5', className)} {...props} />;
}
