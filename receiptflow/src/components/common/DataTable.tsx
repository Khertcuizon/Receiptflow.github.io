import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** How each row renders below the `md` breakpoint, where tables become cards. */
  mobileCard: (row: T) => ReactNode;
  caption: string;
}

/** A table on tablets and up; a stacked card list on phones. */
export function DataTable<T>({ rows, columns, rowKey, mobileCard, caption }: DataTableProps<T>) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line text-[13px] text-ink-muted">
              {columns.map((column) => (
                <th key={column.key} scope="col" className={cn('px-4 py-2.5 font-medium', column.align === 'right' && 'text-right', column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="transition-colors hover:bg-sunken/60">
                {columns.map((column) => (
                  <td key={column.key} className={cn('px-4 py-3 align-middle', column.align === 'right' && 'text-right tabular-nums', column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-line md:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={rowKey(row)} className="px-4 py-3.5">
            {mobileCard(row)}
          </li>
        ))}
      </ul>
    </>
  );
}
