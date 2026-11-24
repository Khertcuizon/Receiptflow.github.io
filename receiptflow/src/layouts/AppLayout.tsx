import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export function AppLayout() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [collapsed, setCollapsed] = useLocalStorage<boolean>('receiptflow:sidebar-collapsed', false);
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);

  const closeNav = useCallback(() => setNavOpen(false), []);

  // Close the drawer when the route changes, and move focus to the new page.
  useEffect(() => {
    setNavOpen(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  // Escape closes the drawer; leaving mobile width resets it.
  useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setNavOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navOpen]);

  useEffect(() => {
    if (isDesktop) setNavOpen(false);
  }, [isDesktop]);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only z-[200] rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((value) => !value)} open={navOpen} onClose={closeNav} isDesktop={isDesktop} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenNav={() => setNavOpen(true)} navOpen={navOpen} isDesktop={isDesktop} />
        <main id="main" ref={main} tabIndex={-1} className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
          <div key={pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
