import { ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/common/Logo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas p-6">
      <div className="max-w-md text-center">
        <Logo className="mb-8" />
        <p className="font-display text-6xl font-semibold text-accent">404</p>
        <h1 className="mt-3 font-display text-2xl font-semibold">This page isn't on the receipt</h1>
        <p className="mt-2 text-ink-muted">The link may be broken or the page may have moved.</p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink to="/">Go home</ButtonLink>
          <ButtonLink to="/dashboard" variant="secondary">
            Open dashboard
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
