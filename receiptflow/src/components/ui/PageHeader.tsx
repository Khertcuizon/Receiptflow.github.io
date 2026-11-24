import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Parent crumbs shown before the current page, e.g. [{ label: 'Dashboard', to: '/dashboard' }]. */
  breadcrumbs?: { label: string; to: string }[];
}

export function PageHeader({ title, description, actions, breadcrumbs = [{ label: 'Dashboard', to: '/dashboard' }] }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-1.5">
            <ol className="flex flex-wrap items-center gap-1 text-[13px] text-ink-muted">
              {breadcrumbs.map((crumb) => (
                <li key={crumb.to} className="flex items-center gap-1">
                  <Link to={crumb.to} className="rounded transition-colors hover:text-ink hover:underline">
                    {crumb.label}
                  </Link>
                  <ChevronRight className="size-3.5 text-ink-faint" aria-hidden="true" />
                </li>
              ))}
              <li aria-current="page" className="font-medium text-ink">
                {title}
              </li>
            </ol>
          </nav>
        )}
        <h1 className="font-display text-[1.75rem] font-semibold leading-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
