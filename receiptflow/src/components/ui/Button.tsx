import type { ComponentProps, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface StyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-fg shadow-sm hover:bg-[color-mix(in_oklab,var(--accent),black_9%)] active:bg-[color-mix(in_oklab,var(--accent),black_16%)]',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-sunken active:bg-line',
  ghost: 'text-ink-muted hover:bg-sunken hover:text-ink active:bg-line',
  subtle: 'bg-accent-soft text-accent-ink hover:bg-accent-line/60 active:bg-accent-line',
  danger: 'bg-danger-ink text-surface shadow-sm hover:opacity-90 active:opacity-80',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-[13px]',
  md: 'h-10 gap-2 rounded-control px-4 text-sm',
  lg: 'h-12 gap-2.5 rounded-xl px-6 text-base',
};

export function buttonStyles({ variant = 'primary', size = 'md', fullWidth, className }: StyleOptions = {}): string {
  return cn(
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-colors',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    fullWidth && 'w-full',
    className,
  );
}

interface ButtonProps extends ComponentProps<'button'>, StyleOptions {
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant, size, fullWidth, className, loading, icon, children, disabled, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, fullWidth, className })}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends LinkProps, StyleOptions {
  icon?: ReactNode;
}

export function ButtonLink({ variant, size, fullWidth, className, icon, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonStyles({ variant, size, fullWidth, className })} {...props}>
      {icon}
      {children}
    </Link>
  );
}

interface IconButtonProps extends ComponentProps<'button'> {
  label: string;
  tone?: 'default' | 'danger';
  size?: 'sm' | 'md';
}

/** Square icon-only button. `label` becomes the accessible name and tooltip. */
export function IconButton({ label, tone = 'default', size = 'md', className, children, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'grid shrink-0 place-items-center rounded-lg text-ink-muted transition-colors disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'size-8' : 'size-9',
        tone === 'danger' ? 'hover:bg-danger-soft hover:text-danger-ink' : 'hover:bg-sunken hover:text-ink',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
