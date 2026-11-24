import { NavLink } from 'react-router';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { NAV_ITEMS } from '@/lib/navigation';
import { cn } from '@/lib/cn';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Mobile drawer state. */
  open: boolean;
  onClose: () => void;
  isDesktop: boolean;
}

export function Sidebar({ collapsed, onToggleCollapsed, open, onClose, isDesktop }: SidebarProps) {
  const slim = isDesktop && collapsed;

  return (
    <>
      {!isDesktop && open && (
        <div className="fixed inset-0 z-40 bg-[rgb(8_14_11/0.5)] backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        id="app-sidebar"
        aria-label="Primary"
        // Off-screen drawers must not be reachable by keyboard or screen readers.
        inert={!isDesktop && !open}
        className={cn(
          'flex h-dvh flex-col border-r border-line bg-surface transition-[width,transform] duration-200 ease-out',
          isDesktop ? 'sticky top-0 shrink-0' : 'fixed inset-y-0 left-0 z-50 w-72 shadow-pop',
          isDesktop && (slim ? 'w-[4.75rem]' : 'w-64'),
          !isDesktop && !open && '-translate-x-full',
        )}
      >
        <div className={cn('flex h-16 shrink-0 items-center border-b border-line', slim ? 'justify-center px-2' : 'justify-between px-4')}>
          <Logo to="/dashboard" showName={!slim} />
          {!isDesktop && (
            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
              aria-label="Close navigation"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={() => !isDesktop && onClose()}
                  title={slim ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group flex h-10 items-center gap-3 rounded-control text-sm font-medium transition-colors',
                      slim ? 'justify-center px-0' : 'px-3',
                      isActive ? 'bg-accent-soft text-accent-ink' : 'text-ink-muted hover:bg-sunken hover:text-ink',
                    )
                  }
                >
                  <Icon className="size-[1.15rem] shrink-0" aria-hidden="true" />
                  <span className={cn(slim && 'sr-only')}>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {isDesktop && (
          <div className="shrink-0 border-t border-line p-3">
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-pressed={collapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={cn(
                'flex h-10 w-full items-center gap-3 rounded-control text-sm font-medium text-ink-muted transition-colors hover:bg-sunken hover:text-ink',
                slim ? 'justify-center' : 'px-3',
              )}
            >
              {collapsed ? <PanelLeftOpen className="size-[1.15rem]" aria-hidden="true" /> : <PanelLeftClose className="size-[1.15rem]" aria-hidden="true" />}
              <span className={cn(slim && 'sr-only')}>{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
