import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useToast } from '@/context/ToastContext';

/** Confirms, signs out, and returns to the login page. */
export function useLogout() {
  const { signOut } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();

  return useCallback(async () => {
    const ok = await confirm({
      title: 'Log out of ReceiptFlow?',
      description: 'You can log back in any time with your Google account.',
      confirmLabel: 'Log out',
    });
    if (!ok) return;
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (cause) {
      toast.error(`Could not sign out: ${cause instanceof Error ? cause.message : 'Unknown error'}`);
    }
  }, [confirm, navigate, signOut, toast]);
}
