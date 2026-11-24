import { Menu } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { IconButton } from '@/components/ui/Button';
import { NotificationsMenu } from './NotificationsMenu';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export function Topbar({ onOpenNav, navOpen, isDesktop }: { onOpenNav: () => void; navOpen: boolean; isDesktop: boolean }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        {!isDesktop && (
          <>
            <IconButton label="Open navigation" aria-expanded={navOpen} aria-controls="app-sidebar" onClick={onOpenNav}>
              <Menu className="size-5" aria-hidden="true" />
            </IconButton>
            <Logo to="/dashboard" />
          </>
        )}
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationsMenu />
        <UserMenu />
      </div>
    </header>
  );
}
