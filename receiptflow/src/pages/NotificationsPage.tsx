import { Bell, CheckCircle2, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import { DataBoundary } from '@/components/common/DataBoundary';
import { NOTIFICATION_TONES } from '@/components/layout/NotificationsMenu';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useData } from '@/context/DataContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFormatters } from '@/hooks/useFormatters';
import { cn } from '@/lib/cn';
import type { NotificationType } from '@/types';

const ICONS: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
  warning: { icon: TriangleAlert, tone: 'bg-warning-soft text-warning-ink' },
  success: { icon: CheckCircle2, tone: 'bg-success-soft text-success-ink' },
  info: { icon: Info, tone: 'bg-accent-soft text-accent-ink' },
};

export function NotificationsPage() {
  useDocumentTitle('Notifications');
  const { notifications } = useData();
  const fmt = useFormatters();

  return (
    <>
      <PageHeader title="Notifications" description="Your recent alerts and reminders." />
      <DataBoundary
        skeleton={
          <Card className="p-5">
            <SkeletonRows rows={4} />
          </Card>
        }
      >
        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications yet" description="When a budget reaches 80% or is exceeded, you'll see an alert here." />
        ) : (
          <Card>
            <ul className="divide-y divide-line">
              {notifications.map((note) => {
                const { icon: Icon, tone } = ICONS[note.type] ?? ICONS.info;
                return (
                  <li key={note.id} className="flex items-start gap-4 px-5 py-4">
                    <span className={cn('mt-0.5 grid size-9 shrink-0 place-items-center rounded-full', tone)}>
                      <Icon className="size-[1.1rem]" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <p className="font-medium">{note.title}</p>
                        <Badge tone={NOTIFICATION_TONES[note.type] ?? 'neutral'}>{note.type || 'info'}</Badge>
                      </div>
                      {note.message && <p className="mt-0.5 text-sm text-ink-muted">{note.message}</p>}
                      {note.createdAt && <p className="mt-1 text-xs text-ink-faint">{fmt.date(note.createdAt.slice(0, 10), { month: 'long', day: 'numeric', year: 'numeric' })}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </DataBoundary>
    </>
  );
}
