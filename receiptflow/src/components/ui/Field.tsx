import { useId, type ComponentProps, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FieldChrome {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  hideLabel?: boolean;
  wrapperClassName?: string;
}

export const controlClass =
  'w-full rounded-control border border-line-strong bg-surface text-sm text-ink transition-colors ' +
  'placeholder:text-ink-faint hover:border-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 ' +
  'disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-faint aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/25';

function Shell({
  id,
  label,
  hint,
  error,
  optional,
  hideLabel,
  wrapperClassName,
  children,
}: FieldChrome & { id: string; children: ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
      <label htmlFor={id} className={cn('text-sm font-medium text-ink', hideLabel && 'sr-only')}>
        {label}
        {optional && <span className="ml-1.5 font-normal text-ink-faint">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] text-danger-ink">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, { error, hint }: Pick<FieldChrome, 'error' | 'hint'>) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

type InputProps = Omit<ComponentProps<'input'>, 'size'> & FieldChrome;

export function Input({ label, hint, error, optional, hideLabel, wrapperClassName, className, id, ...props }: InputProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <Shell id={fieldId} {...{ label, hint, error, optional, hideLabel, wrapperClassName }}>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, { error, hint })}
        className={cn(controlClass, 'h-10 px-3', className)}
        {...props}
      />
    </Shell>
  );
}

type SelectProps = ComponentProps<'select'> & FieldChrome;

export function Select({ label, hint, error, optional, hideLabel, wrapperClassName, className, id, children, ...props }: SelectProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <Shell id={fieldId} {...{ label, hint, error, optional, hideLabel, wrapperClassName }}>
      <div className="relative">
        <select
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, { error, hint })}
          className={cn(controlClass, 'h-10 appearance-none pl-3 pr-9', className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
      </div>
    </Shell>
  );
}

type TextareaProps = ComponentProps<'textarea'> & FieldChrome;

export function Textarea({ label, hint, error, optional, hideLabel, wrapperClassName, className, id, ...props }: TextareaProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <Shell id={fieldId} {...{ label, hint, error, optional, hideLabel, wrapperClassName }}>
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, { error, hint })}
        className={cn(controlClass, 'min-h-24 resize-y px-3 py-2.5', className)}
        {...props}
      />
    </Shell>
  );
}
