import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Bell, PiggyBank, Plus, ReceiptText, ScanLine, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';
import { DataBoundary } from '@/components/common/DataBoundary';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton, SkeletonRows } from '@/components/ui/Skeleton';
import { NOTIFICATION_TONES } from '@/components/layout/NotificationsMenu';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFormatters } from '@/hooks/useFormatters';
import { getBudgetLevel, getBudgetSpent, getUsedPercent } from '@/lib/budget';
import { buildCategoryColorMap, getCategoryName, totalsByCategory } from '@/lib/categories';
import { getLocalDateString, getMonthKey, greeting, shiftMonth } from '@/lib/dates';

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="flex flex-col gap-6">
      <Skeleton className="h-28 w-full rounded-panel" />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-80 rounded-panel" />
        <Card className="p-5">
          <SkeletonRows rows={5} />
        </Card>
      </div>
    </div>
  );
}

export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { state } = useAuth();
  const { expenses, budgets, receipts, categories, notifications } = useData();
  const fmt = useFormatters();
  const [range, setRange] = useState<'all' | 'month'>('all');

  const firstName = state.user?.name.split(' ')[0] ?? '';
  const today = getLocalDateString();
  const monthKey = getMonthKey();

  const stats = useMemo(() => {
    const monthly = expenses.filter((item) => item.date.startsWith(monthKey));
    const previousKey = shiftMonth(monthKey, -1);
    const spent = monthly.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const previous = expenses.filter((item) => item.date.startsWith(previousKey)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const budgetUsed = budgets.length
      ? budgets.reduce((sum, item) => sum + getUsedPercent(getBudgetSpent(item, expenses), item.amount), 0) / budgets.length
      : 0;
    return {
      spent,
      previous,
      count: monthly.length,
      average: monthly.length ? spent / monthly.length : 0,
      receiptsThisMonth: receipts.filter((item) => item.date.startsWith(monthKey)).length,
      budgetUsed,
    };
  }, [expenses, budgets, receipts, monthKey]);

  const colors = useMemo(() => buildCategoryColorMap(categories), [categories]);
  const chart = useMemo(() => {
    const source = range === 'month' ? expenses.filter((item) => item.date.startsWith(monthKey)) : expenses;
    const rows = totalsByCategory(source, categories, colors).filter((row) => row.total > 0);
    return { labels: rows.map((row) => row.name), values: rows.map((row) => row.total), colors: rows.map((row) => row.color) };
  }, [expenses, categories, colors, range, monthKey]);

  const recentReceipts = useMemo(() => [...receipts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [receipts]);

  const delta = stats.spent - stats.previous;
  const deltaText =
    stats.previous === 0
      ? stats.spent === 0
        ? 'No spending yet this month'
        : 'No spending last month'
      : delta === 0
        ? 'Same as last month'
        : `${fmt.money(Math.abs(delta))} ${delta > 0 ? 'more' : 'less'} than last month`;
  const TrendIcon = delta > 0 ? TrendingUp : TrendingDown;

  return (
    <>
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
        description={fmt.date(today, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        breadcrumbs={[]}
        actions={
          <>
            <ButtonLink to="/scan-receipt" icon={<ScanLine className="size-4" aria-hidden="true" />}>
              Scan receipt
            </ButtonLink>
            <ButtonLink to="/expenses" variant="secondary" icon={<Plus className="size-4" aria-hidden="true" />}>
              Add expense
            </ButtonLink>
          </>
        }
      />

      <DataBoundary skeleton={<DashboardSkeleton />}>
        <div className="flex flex-col gap-6">
          <section aria-label="This month at a glance" className="grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-line bg-line shadow-panel lg:grid-cols-4">
            <div className="col-span-2 bg-surface p-5 lg:col-span-1">
              <p className="text-sm text-ink-muted">Spent this month</p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{fmt.money(stats.spent)}</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-ink-muted">
                {stats.previous > 0 && delta !== 0 && (
                  <TrendIcon className={delta > 0 ? 'size-3.5 text-warning-ink' : 'size-3.5 text-success-ink'} aria-hidden="true" />
                )}
                {deltaText}
              </p>
            </div>
            <div className="bg-surface p-5">
              <p className="text-sm text-ink-muted">Average expense</p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{fmt.money(stats.average)}</p>
              <p className="mt-1.5 text-[13px] text-ink-muted">
                {stats.count} {stats.count === 1 ? 'expense' : 'expenses'} this month
              </p>
            </div>
            <div className="bg-surface p-5">
              <p className="text-sm text-ink-muted">Receipts saved</p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{receipts.length}</p>
              <p className="mt-1.5 text-[13px] text-ink-muted">{stats.receiptsThisMonth} this month</p>
            </div>
            <div className="col-span-2 bg-surface p-5 lg:col-span-1">
              <p className="text-sm text-ink-muted">Average budget used</p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{Math.round(stats.budgetUsed)}%</p>
              {budgets.length > 0 ? (
                <ProgressBar className="mt-3" value={stats.budgetUsed} level={stats.budgetUsed >= 100 ? 'over' : stats.budgetUsed >= 80 ? 'near' : 'ok'} label="Average budget used" />
              ) : (
                <p className="mt-1.5 text-[13px] text-ink-muted">No budgets set</p>
              )}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <Card>
              <CardHeader
                title="Spending overview"
                description="Total by category"
                action={
                  <Segmented
                    size="sm"
                    label="Time range"
                    value={range}
                    onChange={setRange}
                    options={[
                      { value: 'all', label: 'All time' },
                      { value: 'month', label: 'This month' },
                    ]}
                  />
                }
              />
              <div className="p-5">
                {chart.values.length === 0 ? (
                  <EmptyState
                    compact
                    icon={Wallet}
                    title={expenses.length === 0 ? 'No spending yet' : 'Nothing spent this month'}
                    description={
                      expenses.length === 0
                        ? 'Add expenses and categories to see your spending overview.'
                        : 'Switch to All time to see earlier spending.'
                    }
                    action={
                      expenses.length === 0 ? (
                        <ButtonLink to="/expenses" size="sm">
                          Add an expense
                        </ButtonLink>
                      ) : undefined
                    }
                  />
                ) : (
                  <BarChart
                    labels={chart.labels}
                    values={chart.values}
                    colors={chart.colors}
                    formatValue={fmt.money}
                    formatAxis={fmt.moneyCompact}
                    ariaLabel={`Spending by category: ${chart.labels.map((label, index) => `${label} ${fmt.money(chart.values[index] ?? 0)}`).join(', ')}`}
                  />
                )}
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Recent receipts"
                action={
                  receipts.length > 0 && (
                    <Link to="/receipts" className="text-[13px] font-medium text-accent-ink hover:underline">
                      View all
                    </Link>
                  )
                }
              />
              <div className="p-5 pt-3">
                {recentReceipts.length === 0 ? (
                  <EmptyState
                    compact
                    icon={ReceiptText}
                    title="No receipts yet"
                    description="Scanned receipts show up here."
                    action={
                      <ButtonLink to="/scan-receipt" size="sm">
                        Scan a receipt
                      </ButtonLink>
                    }
                  />
                ) : (
                  <ul className="divide-y divide-line">
                    {recentReceipts.map((receipt) => (
                      <li key={receipt.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{receipt.merchant || 'Unknown merchant'}</p>
                          <p className="truncate text-[13px] text-ink-muted">
                            {fmt.date(receipt.date, { month: 'short', day: 'numeric' })} · {getCategoryName(receipt.category, categories)}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">{fmt.money(receipt.total)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Budgets"
                description="Current week and month"
                action={
                  <Link to="/budgets" className="text-[13px] font-medium text-accent-ink hover:underline">
                    Manage
                  </Link>
                }
              />
              <div className="p-5 pt-4">
                {budgets.length === 0 ? (
                  <EmptyState
                    compact
                    icon={PiggyBank}
                    title="No budgets yet"
                    description="Set a limit for a category to track it here."
                    action={
                      <ButtonLink to="/budgets" size="sm">
                        Create a budget
                      </ButtonLink>
                    }
                  />
                ) : (
                  <ul className="flex flex-col gap-5">
                    {budgets.slice(0, 5).map((budget) => {
                      const spent = getBudgetSpent(budget, expenses);
                      const percent = getUsedPercent(spent, budget.amount);
                      const level = getBudgetLevel(spent, budget.amount);
                      return (
                        <li key={budget.id}>
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="min-w-0 truncate text-sm font-medium">
                              {budget.name} <span className="font-normal text-ink-muted">· {getCategoryName(budget.categoryId, categories)}</span>
                            </p>
                            <p className="shrink-0 text-[13px] tabular-nums text-ink-muted">
                              {fmt.money(spent)} / {fmt.money(budget.amount)}
                            </p>
                          </div>
                          <ProgressBar className="mt-2" value={percent} level={level} label={`${budget.name} budget used`} />
                          <p className="mt-1 text-xs text-ink-muted tabular-nums">{percent}% used</p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Notifications"
                action={
                  notifications.length > 0 && (
                    <Link to="/notifications" className="text-[13px] font-medium text-accent-ink hover:underline">
                      View all
                    </Link>
                  )
                }
              />
              <div className="p-5 pt-3">
                {notifications.length === 0 ? (
                  <EmptyState compact icon={Bell} title="No notifications yet" description="You'll be alerted when a budget reaches 80%." />
                ) : (
                  <ul className="divide-y divide-line">
                    {notifications.slice(0, 5).map((note) => (
                      <li key={note.id} className="flex items-start justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{note.title}</p>
                          <p className="text-[13px] text-ink-muted">{note.message}</p>
                        </div>
                        <Badge tone={NOTIFICATION_TONES[note.type] ?? 'neutral'}>{note.type || 'info'}</Badge>
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
