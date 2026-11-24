import { ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/common/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useAuth } from '@/context/AuthContext';

export function MarketingHeader() {
  const { state } = useAuth();
  const signedIn = state.status === 'authenticated';
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Site" className="hidden items-center gap-6 text-sm font-medium text-ink-muted md:flex">
          <a href="#how-it-works" className="rounded transition-colors hover:text-ink">
            How it works
          </a>
          <a href="#features" className="rounded transition-colors hover:text-ink">
            Features
          </a>
          <a href="#privacy" className="rounded transition-colors hover:text-ink">
            Privacy
          </a>
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {signedIn ? (
            <ButtonLink to="/dashboard" size="sm">
              Open dashboard
            </ButtonLink>
          ) : (
            <>
              <ButtonLink to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Log in
              </ButtonLink>
              <ButtonLink to="/register" size="sm">
                Create account
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
