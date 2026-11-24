import { useMemo } from 'react';
import { Link } from 'react-router';
import { Wallet } from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';
import { CategoryDot } from '@/components/common/CategoryDot';
import { DataBoundary } from '@/components/common/DataBoundary';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFormatters } from '@/hooks/useFormatters';
import { overallBudgetLevel } from '@/lib/budget';
import { buildCategoryColorMap, getCategoryName, UNCATEGORIZED_COLOR } from '@/lib/categories';
import { getLocalDateString, getWeekStart, lastDays } from '@/lib/dates';

const STATUS = {
  ok: { label: 'On track', tone: 'success' },
  near: { label: 'Near limit', tone: 'warning' },
  over: { label: 'Over budget', tone: 'danger' },
} as const;

export function DailyTrackerPage() {
  useDocumentTitle('Daily Tracker');
  const { expenses, budgets, categories } = useData();
  const { accentColor, accentLine } = useTheme();
  const fmt = useFormatters();

  const today = getLocalDateString();
  const stats = useMemo(() => {
    const weekStart = getWeekStart();
    const sum = (items: typeof expenses) => items.reduce((total, item) => total + Number(item.amount || 0), 0);
    const todays = expenses.filter((item) => item.date === today);
    return {
      todays,
      dailyTotal: sum(todays),
      weeklyTotal: sum(expenses.filter((item) => item.date >= weekStart && item.date <= today)),
      level: overallBudgetLevel(budgets, expenses),
    };
  }, [expenses, budgets, today]);

  const colors = useMemo(() => buildCategoryColorMap(categories), [categories]);
  const week = useMemo(() => {
    const days = lastDays(7);
    const totals = days.map((day) => expenses.filter((item) => item.date === day).reduce((sum, item) => sum + item.amount, 0));
    return {
      labels: days.map((day) => fmt.date(day, { weekday: 'short' })),
      values: totals,
      colors: days.map((day) => (day === today ? accentColor : accentLine)),
    };
  }, [expenses, fmt, today, accentColor, accentLine]);

  const status = STATUS[stats.level];

  return (
    <>
      <PageHeader title="Daily Tracker" description="Track activity across your day and week." />
      <DataBoundary
        skeleton={
          <div className="grid gap-6 lg:grid-cols-2" role="status" aria-label="Loading">
            <Skeleton className="h-40 rounded-panel" />
            <Skeleton className="h-40 rounded-panel" />
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Today" description={fmt.date(today, { weekday: 'long', month: 'long', day: 'numeric' })} />
              <dl className="grid grid-cols-2 gap-4 p-5">
                <div>
                  <dt className="text-sm text-ink-muted">Daily spend</dt>
                  <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">{fmt.money(stats.dailyTotal)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-ink-muted">Weekly spend</dt>
                  <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">{fmt.money(stats.weeklyTotal)}</dd>
                </div>
              </dl>
            </Card>
            <Card>
              <CardHeader title="Snapshot" description="Across everything you've tracked" />
              <dl className="grid grid-cols-2 gap-4 p-5">
                <div>
                  <dt className="text-sm text-ink-muted">Tracked entries</dt>
                  <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">{expenses.length}</dd>
                </div>
                <div>
                  <dt className="text-sm text-ink-muted">Budget status</dt>
                  <dd className="mt-2">
                    <Badge tone={status.tone} className="px-3 py-1 text-sm">
                      {status.label}
                    </Badge>
                    {budgets.length === 0 && (
                      <p className="mt-1.5 text-[13px] text-ink-muted">
                        <Link to="/budgets" className="font-medium text-accent-ink hover:underline">
                          Set a budget
                        </Link>{' '}
                        to track this.
                      </p>
                    )}
                  </dd>
                </div>
              </dl>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader title="Last 7 days" description="Daily spending, today highlighted" />
              <div className="p-5">
                <BarChart
                  labels={week.labels}
                  values={week.values}
                  colors={week.colors}
                  formatValue={fmt.money}
                  formatAxis={fmt.moneyCompact}
                  ariaLabel={`Spending over the last 7 days: ${week.labels.map((label, index) => `${label} ${fmt.money(week.values[index] ?? 0)}`).join(', ')}`}
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Today's entries" />
              <div className="p-5 pt-3">
                {stats.todays.length === 0 ? (
                  <EmptyState compact icon={Wallet} title="Nothing logged today" description="Expenses you add for today appear here." />
                ) : (
                  <ul className="divide-y divide-line">
                    {stats.todays.map((expense) => (
                      <li key={expense.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{expense.title}</p>
                          <p className="flex items-center gap-1.5 text-[13px] text-ink-muted">
                            <CategoryDot color={expense.category ? (colors.get(expense.category) ?? UNCATEGORIZED_COLOR) : UNCATEGORIZED_COLOR} />
                            {getCategoryName(expense.category, categories)}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">{fmt.money(expense.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </div>
        </div>
      </DataBoundary>
    </>
  );
}

