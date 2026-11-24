import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Plus, Trash2, Wallet } from 'lucide-react';
import { CategoryDot } from '@/components/common/CategoryDot';
import { DataBoundary } from '@/components/common/DataBoundary';
import { DataTable, type Column } from '@/components/common/DataTable';
import { SearchInput } from '@/components/common/SearchInput';
import { Badge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton, SkeletonRows } from '@/components/ui/Skeleton';
import { useConfirm } from '@/context/ConfirmContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFormatters } from '@/hooks/useFormatters';
import { usePagination } from '@/hooks/usePagination';
import { buildCategoryColorMap, getCategoryName, UNCATEGORIZED_COLOR } from '@/lib/categories';
import { getLocalDateString, getMonthKey, getWeekStart } from '@/lib/dates';
import type { Expense } from '@/types';

type Period = 'all' | 'month' | 'week';

interface FormErrors {
  title?: string;
  amount?: string;
  date?: string;
}

export function ExpensesPage() {
  useDocumentTitle('Expenses');
  const { expenses, categories, addExpense, deleteExpense } = useData();
  const fmt = useFormatters();
  const toast = useToast();
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(getLocalDateString);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [period, setPeriod] = useState<Period>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const colors = useMemo(() => buildCategoryColorMap(categories), [categories]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const monthKey = getMonthKey();
    const weekStart = getWeekStart();
    const today = getLocalDateString();
    return [...expenses]
      .filter((item) => (categoryFilter === 'all' ? true : categoryFilter === 'none' ? !item.category : item.category === categoryFilter))
      .filter((item) => (period === 'month' ? item.date.startsWith(monthKey) : period === 'week' ? item.date >= weekStart && item.date <= today : true))
      .filter((item) => !needle || item.title.toLowerCase().includes(needle) || item.notes.toLowerCase().includes(needle))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, query, categoryFilter, period]);
  const filteredTotal = useMemo(() => filtered.reduce((sum, item) => sum + item.amount, 0), [filtered]);
  const { visible, hasMore, remaining, showMore } = usePagination(filtered, 25);

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!title.trim()) next.title = 'Enter a title for this expense.';
    const value = Number(amount);
    if (!amount.trim() || !Number.isFinite(value) || value <= 0) next.amount = 'Enter an amount greater than zero.';
    if (!date) next.date = 'Choose a date.';
    return next;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setSaving(true);
    try {
      const result = await addExpense({ title, amount: Number(amount), category, date, notes });
      setTitle('');
      setAmount('');
      setNotes('');
      setDate(getLocalDateString());
      if (result.warning) toast.error(result.warning);
      else toast.success('Expense saved.');
    } catch (cause) {
      toast.error(`Could not save expense: ${cause instanceof Error ? cause.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (expense: Expense) => {
    const ok = await confirm({
      title: `Delete "${expense.title}"?`,
      description: `This removes the ${fmt.money(expense.amount)} expense from your log and your budgets.`,
      confirmLabel: 'Delete expense',
      tone: 'danger',
    });
    if (!ok) return;
    setBusyId(expense.id);
    try {
      await deleteExpense(expense.id);
      toast.success('Expense deleted.');
    } catch (cause) {
      toast.error(`Could not delete expense: ${cause instanceof Error ? cause.message : 'Unknown error'}`);
    } finally {
      setBusyId(null);
    }
  };

  const categoryCell = (expense: Expense) => (
    <span className="inline-flex items-center gap-2">
      <CategoryDot color={expense.category ? (colors.get(expense.category) ?? UNCATEGORIZED_COLOR) : UNCATEGORIZED_COLOR} />
      {getCategoryName(expense.category, categories)}
    </span>
  );

  const deleteButton = (expense: Expense) => (
    <IconButton label={`Delete ${expense.title}`} tone="danger" disabled={busyId === expense.id} onClick={() => void onDelete(expense)}>
      <Trash2 className="size-4" aria-hidden="true" />
    </IconButton>
  );

  const columns: Column<Expense>[] = [
    {
      key: 'title',
      header: 'Title',
      cell: (expense) => (
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            <span className="truncate">{expense.title || 'Expense'}</span>
            {expense.receiptId && <Badge tone="accent">Receipt</Badge>}
          </p>
          {expense.notes && <p className="max-w-64 truncate text-[13px] text-ink-muted">{expense.notes}</p>}
        </div>
      ),
    },
    { key: 'category', header: 'Category', cell: categoryCell },
    { key: 'date', header: 'Date', cell: (expense) => <span className="whitespace-nowrap">{fmt.date(expense.date)}</span> },
    { key: 'amount', header: 'Amount', align: 'right', cell: (expense) => <span className="font-semibold">{fmt.money(expense.amount)}</span> },
    { key: 'actions', header: 'Action', align: 'right', cell: deleteButton },
  ];

  return (
    <>
      <PageHeader title="Expenses" description="Review and manage your spending log." />

      <div className="grid items-start gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <Card className="xl:sticky xl:top-24">
          <CardHeader title="Add expense" />
          <CardBody>
            <form ref={formRef} noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
              <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} error={errors.title} placeholder="e.g. Groceries" maxLength={200} autoComplete="off" />
              <Input
                label={`Amount (${fmt.currency})`}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                error={errors.amount}
                placeholder="0.00"
              />
              <Select label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">Uncategorized</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
              <Input label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} error={errors.date} />
              <Textarea label="Notes" optional rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
              <Button type="submit" loading={saving} icon={!saving && <Plus className="size-4" aria-hidden="true" />}>
                Save expense
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Expense list" className="pb-4" />
          <DataBoundary
            skeleton={
              <div className="p-5">
                <Skeleton className="mb-5 h-10 w-full max-w-md" />
                <SkeletonRows rows={6} />
              </div>
            }
          >
            {expenses.length === 0 ? (
              <div className="p-5 pt-1">
                <EmptyState compact icon={Wallet} title="No expenses yet" description="Add your first expense with the form, or scan a receipt." />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3 border-y border-line px-5 py-3.5">
                  <SearchInput id="expense-search" label="Search expenses" placeholder="Search expenses" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-44 flex-1" />
                  <Select label="Filter by category" hideLabel value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} wrapperClassName="w-full sm:w-44">
                    <option value="all">All categories</option>
                    <option value="none">Uncategorized</option>
                    {categories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                  <Select label="Filter by period" hideLabel value={period} onChange={(event) => setPeriod(event.target.value as Period)} wrapperClassName="w-full sm:w-36">
                    <option value="all">All time</option>
                    <option value="month">This month</option>
                    <option value="week">This week</option>
                  </Select>
                </div>
                {filtered.length === 0 ? (
                  <div className="p-5">
                    <EmptyState compact title="No expenses match" description="Try a different search, category or period." />
                  </div>
                ) : (
                  <>
                    <DataTable
                      caption="Expenses"
                      rows={visible}
                      rowKey={(expense) => expense.id}
                      columns={columns}
                      mobileCard={(expense) => (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{expense.title || 'Expense'}</p>
                              <p className="text-[13px] text-ink-muted">{fmt.date(expense.date)}</p>
                            </div>
                            <p className="shrink-0 font-semibold tabular-nums">{fmt.money(expense.amount)}</p>
                          </div>
                          {expense.notes && <p className="text-[13px] text-ink-muted">{expense.notes}</p>}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-ink-muted">{categoryCell(expense)}</span>
                            {deleteButton(expense)}
                          </div>
                        </div>
                      )}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5 text-sm">
                      <p className="text-ink-muted" aria-live="polite">
                        {filtered.length} {filtered.length === 1 ? 'expense' : 'expenses'}
                      </p>
                      <p>
                        <span className="text-ink-muted">Total </span>
                        <span className="font-semibold tabular-nums">{fmt.money(filteredTotal)}</span>
                      </p>
                    </div>
                    {hasMore && (
                      <div className="border-t border-line p-4 text-center">
                        <Button variant="secondary" onClick={showMore}>
                          Show {Math.min(25, remaining)} more
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </DataBoundary>
        </Card>
      </div>
    </>
  );
}
