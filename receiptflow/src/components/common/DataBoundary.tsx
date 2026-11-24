import type { ReactNode } from 'react';
import { useData } from '@/context/DataContext';
import { ErrorState } from '@/components/ui/EmptyState';

/** Shows `skeleton` while the person's data loads, an error with retry if it fails, else `children`. */
export function DataBoundary({ skeleton, children }: { skeleton: ReactNode; children: ReactNode }) {
  const { status, error, reload } = useData();
  if (status === 'loading') return <>{skeleton}</>;
  if (status === 'error') {
    return <ErrorState title="Couldn't load your data" message={error ?? 'Check your connection and try again.'} onRetry={() => void reload()} />;
  }
  return <>{children}</>;
}
