import type { ComponentProps } from 'react';
import { Search } from 'lucide-react';
import { controlClass } from '@/components/ui/Field';
import { cn } from '@/lib/cn';

export function SearchInput({ label, className, ...props }: Omit<ComponentProps<'input'>, 'type'> & { label: string }) {
  return (
    <div className={cn('relative', className)}>
      <label htmlFor={props.id} className="sr-only">
        {label}
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
      <input type="search" className={cn(controlClass, 'h-10 pl-9 pr-3')} {...props} />
    </div>
  );
}
