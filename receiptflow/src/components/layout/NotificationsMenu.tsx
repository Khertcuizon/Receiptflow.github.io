import { useCallback, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Bell, BellOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useFormatters } from '@/hooks/useFormatters';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useDismiss } from '@/hooks/useOutsideClick';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import type { NotificationType } from '@/types';

export const NOTIFICATION_TONES: Record<NotificationType, BadgeTone> = {
  warning: 'warning',
  success: 'success',
  info: 'neutral',
};

export function NotificationsMenu() {
  const { state } = useAuth();
  const { notifications, status, reload } = useData();
  const fmt = useFormatters();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [seenAt, setSeenAt] = useLocalStorage<number>(`receiptflow:notifications-seen:${state.user?.id ?? 'anon'}`, 0);
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const hasUnread = notifications.some((note) => new Date(note.createdAt).getTime() > seenAt);

  const close = useCallback(() => setOpen(false), []);
  useDismiss(wrapper, open, () => {
    close();
  });

  const toggle = async () => {
    if (open) {
      close();
      return;
    }
    setOpen(true);
    setSeenAt(Date.now());
    setError(null);
    setRefreshing(true);
    try {
      await reload(['notifications']);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load notifications.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div ref={wrapper} className="relative">
      <div className="relative">
        <IconButton
          ref={button}
          label={hasUnread ? 'Notifications (new)' : 'Notifications'}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-haspopup="true"
          onClick={() => void toggle()}
        >
          <Bell className="size-[1.15rem]" aria-hidden="true" />
        </IconButton>
        {hasUnread && !open && <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger ring-2 ring-canvas" />}
      </div>

      {open && (
        <section
          id={panelId}
          aria-label="Notifications"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              close();
              button.current?.focus();
            }
          }}
          className="popover-enter absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-panel border border-line bg-surface shadow-pop"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-display text-base font-semibold">Notifications</h2>
            <Link to="/notifications" onClick={close} className="text-[13px] font-medium text-accent-ink hover:underline">
              View all
            </Link>
          </div>
          <div className="max-h-96 overflow-y-auto" aria-live="polite">
            {error ? (
              <p className="px-4 py-6 text-center text-sm text-danger-ink">{error}</p>
            ) : status === 'loading' || (refreshing && notifications.length === 0) ? (
              <div className="flex flex-col gap-3 p-4">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
                <BellOff className="size-5 text-ink-faint" aria-hidden="true" />
                <p className="text-sm font-medium">You're all caught up</p>
                <p className="text-[13px] text-ink-muted">Budget alerts will show up here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {notifications.slice(0, 6).map((note) => (
                  <li key={note.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium leading-snug">{note.title || 'Notification'}</p>
                      <Badge tone={NOTIFICATION_TONES[note.type] ?? 'neutral'}>{note.type || 'info'}</Badge>
                    </div>
                    {note.message && <p className="mt-1 text-[13px] text-ink-muted">{note.message}</p>}
                    {note.createdAt && <p className="mt-1 text-xs text-ink-faint">{fmt.date(note.createdAt.slice(0, 10))}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
