import { useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { createFormatters, type Formatters } from '@/lib/format';

/** Money/date formatters that follow the signed-in person's currency setting. */
export function useFormatters(): Formatters {
  const { settings } = useData();
  return useMemo(() => createFormatters(settings.currency, settings.locale), [settings.currency, settings.locale]);
}
