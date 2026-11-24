import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { PiggyBank, Plus, Trash2 } from 'lucide-react';
import { DataBoundary } from '@/components/common/DataBoundary';
import { Badge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Select } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useConfirm } from '@/context/ConfirmContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFormatters } from '@/hooks/useFormatters';
import { getBudgetLevel, getBudgetSpent, getUsedPercent } from '@/lib/budget';
import { getCategoryName } from '@/lib/categories';
import type { Budget, BudgetPeriod } from '@/types';

interface Errors {
  name?: string;
  categoryId?: string;
  amount?: string;
}

const LEVEL_TONE = { ok: 'success', near: 'warning', over: 'danger' } as const;
const LEVEL_LABEL = { ok: 'On track', near: 'Near limit', over: 'Over budget' } as const;

export function BudgetsPage() {
  useDocumentTitle('Budgets');
  const { budgets, categories, expenses, addBudget, deleteBudget } = useData();
  const fmt = useFormatters();
  const toast = useToast();
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      budgets.map((budget) => {
        const spent = getBudgetSpent(budget, expenses);
        return { budget, spent, percent: getUsedPercent(spent, budget.amount), level: getBudgetLevel(spent, budget.amount) };
      }),
    [budgets, expenses],
  );

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    if (!name.trim()) next.name = 'Enter a name for this budget.';
    if (!categoryId) next.categoryId = 'Choose a category for this budget.';
    const limit = Number(amount);
    if (!amount.trim() || !Number.isFinite(limit) || limit <= 0) next.amount = 'Enter a limit greater than zero.';
    setErrors(next);
    if (Object.keys(next).length) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setSaving(true);
    try {
      await addBudget({ name, categoryId, amount: limit, period });
      setName('');
      setAmount('');
      setCategoryId('');
      toast.success('Budget saved.');
    } catch (cause) {
      toast.error(`Could not save budget: ${cause instanceof Error ? cause.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (budget: Budget) => {
    const ok = await confirm({
      title: `Delete "${budget.name}"?`,
      description: 'Your expenses are not affected. Alerts for this budget stop.',
      confirmLabel: 'Delete budget',
      tone: 'danger',
    });
    if (!ok) return;
    setBusyId(budget.id);
    try {
      await deleteBudget(budget.id);
      toast.success('Budget deleted.');
    } catch (cause) {
      toast.error(`Could not delete budget: ${cause instanceof Error ? cause.message : 'Unknown error'}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader title="Budgets" description="Set spending limits and get alerted at 80%." />

      <div className="grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Add budget" />
          <CardBody>
            {categories.length === 0 && (
              <p className="mb-4 rounded-control bg-warning-soft px-3.5 py-3 text-sm text-warning-ink">
                Add a category before creating a budget.{' '}
                <Link to="/categories" className="font-medium underline underline-offset-2">
                  Go to categories
                </Link>
              </p>
            )}
            <form ref={formRef} noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
              <Input label="Budget name" value={name} onChange={(event) => setName(event.target.value)} error={errors.name} placeholder="e.g. Weekly groceries" maxLength={80} autoComplete="off" />
              <Select label="Category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} error={errors.categoryId} disabled={categories.length === 0}>
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <Input
                label={`Limit (${fmt.currency})`}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                error={errors.amount}
                placeholder="0.00"
              />
              <Select label="Period" value={period} onChange={(event) => setPeriod(event.target.value as BudgetPeriod)}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
              <Button type="submit" loading={saving} disabled={categories.length === 0} icon={!saving && <Plus className="size-4" aria-hidden="true" />}>
                Save budget
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Budget overview" description="Spending in the current week or month" />
          <div className="p-5 pt-4">
            <DataBoundary skeleton={<SkeletonRows rows={3} />}>
              {rows.length === 0 ? (
                <EmptyState compact icon={PiggyBank} title="No budgets yet" description="Create a budget to see how much of it you've used." />
              ) : (
                <ul className="flex flex-col divide-y divide-line">
                  {rows.map(({ budget, spent, percent, level }) => (
                    <li key={budget.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{budget.name}</p>
                          <p className="text-[13px] capitalize text-ink-muted">
                            {getCategoryName(budget.categoryId, categories)} · {budget.period}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Badge tone={LEVEL_TONE[level]}>{LEVEL_LABEL[level]}</Badge>
                          <IconButton label={`Delete ${budget.name}`} tone="danger" disabled={busyId === budget.id} onClick={() => void onDelete(budget)}>
                            <Trash2 className="size-4" aria-hidden="true" />
                          </IconButton>
                        </div>
                      </div>
                      <ProgressBar className="mt-3" value={percent} level={level} label={`${budget.name} budget used`} />
                      <div className="mt-2 flex justify-between text-[13px] tabular-nums text-ink-muted">
                        <span>
                          {fmt.money(spent)} spent · {percent}%
                        </span>
                        <span>of {fmt.money(budget.amount)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </DataBoundary>
          </div>
        </Card>
      </div>
    </>
  );
}
