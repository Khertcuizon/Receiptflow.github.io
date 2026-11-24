import { useEffect, useState } from 'react';

/** Client-side "show more" paging that resets whenever the underlying list changes. */
export function usePagination<T>(items: T[], pageSize = 20) {
  const [visible, setVisible] = useState(pageSize);
  useEffect(() => setVisible(pageSize), [items, pageSize]);
  return {
    visible: items.slice(0, visible),
    hasMore: visible < items.length,
    remaining: Math.max(0, items.length - visible),
    showMore: () => setVisible((count) => count + pageSize),
  };
}
