import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';
import { DoughnutChart } from '@/components/charts/DoughnutChart';
import { CategoryDot } from '@/components/common/CategoryDot';
import { DataBoundary } from '@/components/common/DataBoundary';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFormatters } from '@/hooks/useFormatters';
import { buildCategoryColorMap, getCategoryName, totalsByCategory } from '@/lib/categories';
import { buildCsv, downloadCsv } from '@/lib/csv';
import { getMonthKey, lastMonths, monthKeyToDate, shiftMonth } from '@/lib/dates';

export function ReportsPage() {
  useDocumentTitle('Reports');
  const { expenses, categories } = useData();
  const { accentColor, accentLine } = useTheme();
  const fmt = useFormatters();
  const toast = useToast();

  const currentKey = getMonthKey();
  const [monthKey, setMonthKey] = useState(currentKey);
  const monthLabel = fmt.date(`${monthKey}-01`, { month: 'long', year: 'numeric' });

  const colors = useMemo(() => buildCategoryColorMap(categories), [categories]);
  const monthExpenses = useMemo(() => expenses.filter((item) => item.date.startsWith(monthKey)), [expenses, monthKey]);
  const total = useMemo(() => monthExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0), [monthExpenses]);
  const breakdown = useMemo(
    () => totalsByCategory(monthExpenses, categories, colors).filter((row) => row.total > 0).sort((a, b) => b.total - a.total),
    [monthExpenses, categories, colors],
  );

  const trend = useMemo(() => {
    const months = lastMonths(6, monthKeyToDate(monthKey));
    return {
      labels: months.map((key) => fmt.date(`${key}-01`, { month: 'short' })),
      values: months.map((key) => expenses.filter((item) => item.date.startsWith(key)).reduce((sum, item) => sum + item.amount, 0)),
      colors: months.map((key) => (key === monthKey ? accentColor : accentLine)),
    };
  }, [expenses, monthKey, fmt, accentColor, accentLine]);

  const exportCsv = () => {
    const rows: Array<Array<string | number>> = [
      ['Date', 'Title', 'Category', 'Notes', `Amount (${fmt.currency})`],
      ...[...monthExpenses]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((expense) => [expense.date, expense.title, getCategoryName(expense.category, categories), expense.notes, Number(expense.amount || 0).toFixed(2)]),
    ];
    downloadCsv(`receiptflow-report-${monthKey}.csv`, buildCsv(rows));
    toast.success(`Exported ${monthExpenses.length} ${monthExpenses.length === 1 ? 'expense' : 'expenses'} for ${monthLabel}.`);
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description="Monthly spending breakdown."
        actions={
          <Button variant="secondary" icon={<Download className="size-4" aria-hidden="true" />} onClick={exportCsv} disabled={monthExpenses.length === 0}>
            Export CSV
          </Button>
        }
      />

      <DataBoundary
        skeleton={
          <div role="status" aria-label="Loading" className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-panel" />
            <Skeleton className="h-72 rounded-panel" />
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-1" role="group" aria-label="Choose month">
            <IconButton label="Previous month" onClick={() => setMonthKey((key) => shiftMonth(key, -1))}>
              <ChevronLeft className="size-5" aria-hidden="true" />
            </IconButton>
            <p className="min-w-40 text-center font-display text-lg font-semibold" aria-live="polite">
              {monthLabel}
            </p>
            <IconButton label="Next month" disabled={monthKey >= currentKey} onClick={() => setMonthKey((key) => shiftMonth(key, 1))}>
              <ChevronRight className="size-5" aria-hidden="true" />
            </IconButton>
            {monthKey !== currentKey && (
              <Button variant="ghost" size="sm" onClick={() => setMonthKey(currentKey)}>
                This month
              </Button>
            )}
          </div>

          <section aria-label="Summary" className="grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-line bg-line shadow-panel lg:grid-cols-4">
            <div className="col-span-2 bg-surface p-5 lg:col-span-1">
              <p className="text-sm text-ink-muted">Total spent</p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{fmt.money(total)}</p>
            </div>
            <div className="bg-surface p-5">
              <p className="text-sm text-ink-muted">Expenses</p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{monthExpenses.length}</p>
            </div>
            <div className="bg-surface p-5">
              <p className="text-sm text-ink-muted">Categories used</p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{breakdown.length}</p>
            </div>
            <div className="col-span-2 bg-surface p-5 lg:col-span-1">
              <p className="text-sm text-ink-muted">Top category</p>
              <p className="mt-1 truncate font-display text-2xl font-semibold">{breakdown[0]?.name ?? '—'}</p>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <Card>
              <CardHeader title="Category breakdown" description={monthLabel} />
              <div className="p-5">
                {breakdown.length === 0 ? (
                  <EmptyState compact title="No spending in this month" description="Add expenses to see how they split across categories." />
                ) : (
                  <DoughnutChart
                    labels={breakdown.map((row) => row.name)}
                    values={breakdown.map((row) => row.total)}
                    colors={breakdown.map((row) => row.color)}
                    formatValue={fmt.money}
                    ariaLabel={`Spending by category in ${monthLabel}: ${breakdown.map((row) => `${row.name} ${fmt.money(row.total)}`).join(', ')}`}
                  />
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="By category" description="Share of the month's spending" />
              <div className="p-5 pt-3">
                {breakdown.length === 0 ? (
                  <EmptyState compact title="Nothing to show yet" />
                ) : (
                  <ul className="divide-y divide-line">
                    {breakdown.map((row) => (
                      <li key={row.id || 'none'} className="flex items-center justify-between gap-3 py-3">
                        <span className="flex min-w-0 items-center gap-2.5 text-sm">
                          <CategoryDot color={row.color} />
                          <span className="truncate font-medium">{row.name}</span>
                          <span className="shrink-0 text-ink-muted">
                            · {row.count} {row.count === 1 ? 'expense' : 'expenses'}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm tabular-nums">
                          <span className="font-semibold">{fmt.money(row.total)}</span>
                          <span className="ml-2 inline-block w-10 text-right text-ink-muted">{total > 0 ? fmt.percent((row.total / total) * 100) : '0%'}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Last 6 months" description="Total spending per month" />
            <div className="p-5">
              <BarChart
                labels={trend.labels}
                values={trend.values}
                colors={trend.colors}
                formatValue={fmt.money}
                formatAxis={fmt.moneyCompact}
                className="h-56"
                ariaLabel={`Spending over the last six months: ${trend.labels.map((label, index) => `${label} ${fmt.money(trend.values[index] ?? 0)}`).join(', ')}`}
              />
            </div>
          </Card>
        </div>
      </DataBoundary>
    </>
  );
}
