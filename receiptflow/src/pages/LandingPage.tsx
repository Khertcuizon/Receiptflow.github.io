import { CalendarCheck, ChartColumn, Lock, PiggyBank, ScanLine, ShieldCheck, Wallet } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/common/Logo';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { ReceiptScan } from '@/components/marketing/ReceiptScan';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const STEPS = [
  { title: 'Upload a photo', body: 'Pick or drop a receipt image — JPEG, PNG, WebP or GIF, up to 10 MB.' },
  { title: 'Check what was read', body: 'The merchant, date and total are filled in for you. Fix anything before you save.' },
  { title: 'See it in your spending', body: 'The receipt and its expense are saved together, so budgets and reports stay current.' },
];

const FEATURES = [
  { icon: ScanLine, title: 'Scan receipts', body: 'Extract receipt details with OCR, review them, and save the image with the entry.' },
  { icon: Wallet, title: 'Track expenses', body: 'Add expenses by hand and organize them by date and category.' },
  { icon: PiggyBank, title: 'Set budgets', body: 'Set weekly or monthly limits per category and get alerted at 80%.' },
  { icon: ChartColumn, title: 'View reports', body: 'Review monthly breakdowns by category and export them as CSV.' },
];

const PRIVACY = [
  { icon: ShieldCheck, title: 'Only you can see your data', body: 'Row-level security scopes every record to your account.' },
  { icon: Lock, title: 'Private receipt images', body: 'Images live in a private bucket and open through short-lived links.' },
  { icon: CalendarCheck, title: 'OCR runs in your browser', body: 'Text is read on your device before anything is saved.' },
];

export function LandingPage() {
  useDocumentTitle('Receipt and expense tracker');
  const { state } = useAuth();
  const signedIn = state.status === 'authenticated';

  return (
    <div className="min-h-dvh bg-canvas">
      <MarketingHeader />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-28 lg:pt-20">
          <div>
            <h1 className="font-display text-[2.5rem] font-semibold leading-[1.05] sm:text-5xl lg:text-[3.5rem]">Turn receipts into tracked spending.</h1>
            <p className="mt-5 max-w-xl text-lg text-ink-muted">
              Upload a photo and ReceiptFlow reads the merchant, date and total. Review it, pick a category, and it lands in your expense log — with an alert when a
              budget is close to its limit.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {signedIn ? (
                <ButtonLink to="/dashboard" size="lg">
                  Open dashboard
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink to="/register" size="lg">
                    Create account with Google
                  </ButtonLink>
                  <ButtonLink to="/login" variant="secondary" size="lg">
                    Log in
                  </ButtonLink>
                </>
              )}
            </div>
            <p className="mt-4 text-sm text-ink-muted">Gmail sign-in only. Create an account before logging in.</p>
          </div>
          <ReceiptScan />
        </section>

        <section id="how-it-works" className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
            <div>
              <h2 className="font-display text-3xl font-semibold">From paper to expense in three steps</h2>
              <p className="mt-3 max-w-sm text-ink-muted">No retyping totals. You stay in control of what gets saved.</p>
            </div>
            <ol className="flex flex-col divide-y divide-line">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-5 py-5 first:pt-0 last:pb-0">
                  <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft font-display text-base font-semibold text-accent-ink">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold">{step.title}</h3>
                    <p className="mt-1 text-ink-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
          <h2 className="max-w-xl font-display text-3xl font-semibold">Everything you need to keep spending in view</h2>
          <div className="mt-10 grid gap-x-12 gap-y-10 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article key={title} className="border-t border-line-strong pt-5">
                <Icon className="size-6 text-accent" aria-hidden="true" />
                <h3 className="mt-3 font-display text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 max-w-md text-ink-muted">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="privacy" className="scroll-mt-20 border-t border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3">
            {PRIVACY.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent-ink">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {!signedIn && (
          <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 lg:py-24">
            <h2 className="mx-auto max-w-xl font-display text-3xl font-semibold">Start with your next receipt</h2>
            <p className="mx-auto mt-3 max-w-md text-ink-muted">It takes one Google sign-in. Empty accounts start with no demo records.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <ButtonLink to="/register" size="lg">
                Create account with Google
              </ButtonLink>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-ink-muted sm:px-6">
          <Logo />
          <nav aria-label="Footer" className="flex gap-5">
            <a href="/login" className="transition-colors hover:text-ink">
              Log in
            </a>
            <a href="/register" className="transition-colors hover:text-ink">
              Create account
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
