import { useCallback, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ChevronDown, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLogout } from '@/hooks/useLogout';
import { useDismiss } from '@/hooks/useOutsideClick';

export function UserMenu() {
  const { state } = useAuth();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(wrapper, open, close);

  const user = state.user;
  if (!user) return null;
  const firstName = user.name.split(' ')[0] ?? user.name;
  const initial = (firstName[0] ?? '?').toUpperCase();

  return (
    <div ref={wrapper} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 items-center gap-2 rounded-control pl-1.5 pr-2 transition-colors hover:bg-sunken sm:pr-2.5"
      >
        <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-accent text-[13px] font-semibold text-accent-fg">
          {initial}
        </span>
        <span className="hidden text-sm font-medium sm:inline">Hi, {firstName}</span>
        <span className="sr-only sm:hidden">Account menu for {firstName}</span>
        <ChevronDown className="hidden size-4 text-ink-muted sm:block" aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              close();
              button.current?.focus();
            }
          }}
          className="popover-enter absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 overflow-hidden rounded-panel border border-line bg-surface shadow-pop"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-[13px] text-ink-muted">{user.email}</p>
          </div>
          <div className="p-1.5">
            <Link to="/settings" onClick={close} className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors hover:bg-sunken">
              <Settings className="size-4 text-ink-muted" aria-hidden="true" />
              Settings
            </Link>
            <button
              type="button"
              onClick={() => {
                close();
                void logout();
              }}
              className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-danger-soft hover:text-danger-ink"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
