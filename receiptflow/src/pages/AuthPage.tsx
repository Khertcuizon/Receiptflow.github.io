import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CheckCircle2, CircleAlert, Info, Loader2 } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { GoogleIcon } from '@/components/common/GoogleIcon';
import { ReceiptScan } from '@/components/marketing/ReceiptScan';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { completeGoogleOAuth, getPendingIntent, startGoogleOAuth, type AuthIntent } from '@/services/auth';
import { supabaseConfigError } from '@/services/supabase';
import { cn } from '@/lib/cn';

type Message = { kind: 'success' | 'error' | 'info'; text: string };

const COPY = {
  login: {
    title: 'Welcome back',
    lead: 'Log in with the Gmail account you used to register.',
    button: 'Continue with Google',
    footerPrompt: 'New here?',
    footerLink: 'Create an account first',
    footerTo: '/register',
    failure: 'Could not complete Google login',
    start: 'Could not start Google login',
  },
  register: {
    title: 'Create your account',
    lead: 'Create an account with your Gmail address. You’ll be able to log in after registration.',
    button: 'Create account with Google',
    footerPrompt: 'Already have an account?',
    footerLink: 'Log in',
    footerTo: '/login',
    failure: 'Could not complete account setup',
    start: 'Could not start Google registration',
  },
} as const;

const TONES = {
  success: 'bg-success-soft text-success-ink',
  error: 'bg-danger-soft text-danger-ink',
  info: 'bg-accent-soft text-accent-ink',
} as const;

export function AuthPage({ mode }: { mode: AuthIntent }) {
  const copy = COPY[mode];
  useDocumentTitle(mode === 'login' ? 'Log in' : 'Create account');
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState<Message | null>(supabaseConfigError ? { kind: 'error', text: supabaseConfigError } : null);
  const [busy, setBusy] = useState(false);
  const [finishing, setFinishing] = useState(() => !supabaseConfigError && getPendingIntent() === mode);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (supabaseConfigError) return undefined;
    let active = true;

    completeGoogleOAuth(mode)
      .then((result) => {
        if (!active) return;
        setFinishing(false);
        if (!result.handled) return;
        if (!result.success) {
          setMessage({ kind: 'error', text: result.message });
        } else if (mode === 'register') {
          setMessage({ kind: 'success', text: 'Account created. Redirecting to login…' });
          timer.current = window.setTimeout(() => navigate('/login', { replace: true }), 900);
        } else {
          setMessage({ kind: 'success', text: 'Login successful. Redirecting…' });
          timer.current = window.setTimeout(() => {
            void refresh().then((check) => {
              if (check.ok) navigate('/dashboard', { replace: true });
              else setMessage({ kind: 'error', text: check.reason === 'error' ? check.message : 'Your account could not be verified. Please try again.' });
            });
          }, 700);
        }
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setFinishing(false);
        setMessage({ kind: 'error', text: `${copy.failure}: ${cause instanceof Error ? cause.message : 'Unknown error'}` });
      });

    return () => {
      active = false;
      window.clearTimeout(timer.current);
    };
  }, [mode, navigate, refresh, copy.failure]);

  const onGoogle = async () => {
    setBusy(true);
    setMessage({ kind: 'info', text: 'Redirecting to Google…' });
    try {
      await startGoogleOAuth(mode);
    } catch (cause) {
      setBusy(false);
      setMessage({ kind: 'error', text: `${copy.start}: ${cause instanceof Error ? cause.message : 'Unknown error'}` });
    }
  };

  const Icon = message?.kind === 'success' ? CheckCircle2 : message?.kind === 'error' ? CircleAlert : Info;

  return (
    <div className="grid min-h-dvh bg-canvas lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="font-display text-3xl font-semibold">{copy.title}</h1>
          <p className="mt-2 text-ink-muted">{copy.lead}</p>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            className="mt-7 gap-3 border-line-strong"
            onClick={() => void onGoogle()}
            disabled={busy || finishing || Boolean(supabaseConfigError)}
            icon={finishing ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <GoogleIcon />}
          >
            {finishing ? 'Finishing sign-in…' : copy.button}
          </Button>

          <p className="mt-5 text-center text-sm text-ink-muted">
            {copy.footerPrompt}{' '}
            <Link to={copy.footerTo} className="font-medium text-accent-ink underline-offset-4 hover:underline">
              {copy.footerLink}
            </Link>
          </p>

          {mode === 'register' && (
            <p className="mt-5 rounded-control bg-sunken px-3.5 py-3 text-sm text-ink-muted">
              <strong className="font-semibold text-ink">Gmail only:</strong> use a Google account with an @gmail.com address.
            </p>
          )}

          <div aria-live="polite" className="mt-5 min-h-6">
            {message && (
              <p className={cn('flex items-start gap-2 rounded-control px-3.5 py-3 text-sm', TONES[message.kind])}>
                <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{message.text}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <aside aria-hidden="true" className="relative hidden overflow-hidden border-l border-line bg-sunken lg:grid lg:place-items-center">
        <div className="px-12">
          <ReceiptScan />
          <p className="mx-auto mt-14 max-w-xs text-center font-display text-xl font-medium leading-snug">Your receipts, read and filed before you finish your coffee.</p>
        </div>
      </aside>
    </div>
  );
}

export const LoginPage = () => <AuthPage mode="login" />;
export const RegisterPage = () => <AuthPage mode="register" />;
