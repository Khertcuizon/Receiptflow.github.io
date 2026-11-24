import { useMemo, useState, type FormEvent } from 'react';
import { Check, Pencil, Plus, Tags, Trash2, X } from 'lucide-react';
import { CategoryDot } from '@/components/common/CategoryDot';
import { DataBoundary } from '@/components/common/DataBoundary';
import { SwatchPicker } from '@/components/common/SwatchPicker';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useConfirm } from '@/context/ConfirmContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { buildCategoryColorMap, CATEGORY_PALETTE, nextCategoryColor } from '@/lib/categories';
import type { Category } from '@/types';

const SWATCHES = CATEGORY_PALETTE.map((value, index) => ({ id: `c${index}`, label: value, value }));

export function CategoriesPage() {
  useDocumentTitle('Categories');
  const { categories, expenses, addCategory, updateCategory, deleteCategory } = useData();
  const toast = useToast();
  const confirm = useConfirm();

  const [name, setName] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const colors = useMemo(() => buildCategoryColorMap(categories), [categories]);
  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const expense of expenses) counts.set(expense.category, (counts.get(expense.category) ?? 0) + 1);
    return counts;
  }, [expenses]);

  const chosenColor = color ?? nextCategoryColor(categories);

  const onAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setNameError('Enter a category name.');
      return;
    }
    setNameError(undefined);
    setSaving(true);
    try {
      await addCategory({ name, color: chosenColor });
      setName('');
      setColor(null);
      toast.success('Category added.');
    } catch (cause) {
      toast.error(`Could not save category: ${cause instanceof Error ? cause.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(colors.get(category.id) ?? category.color);
  };

  const onSaveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingId) return;
    if (!editName.trim()) {
      toast.error('Category name is required.');
      return;
    }
    setEditSaving(true);
    try {
      await updateCategory(editingId, { name: editName, color: editColor });
      setEditingId(null);
      toast.success('Category updated.');
    } catch (cause) {
      toast.error(`Could not update category: ${cause instanceof Error ? cause.message : 'Unknown error'}`);
    } finally {
      setEditSaving(false);
    }
  };

  const onDelete = async (category: Category) => {
    const ok = await confirm({
      title: `Delete "${category.name}"?`,
      description: 'Categories that are still used by expenses or budgets cannot be deleted.',
      confirmLabel: 'Delete category',
      tone: 'danger',
    });
    if (!ok) return;
    setBusyId(category.id);
    try {
      await deleteCategory(category.id);
      toast.success('Category deleted.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not delete category.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader title="Categories" description="Group your spending so budgets and reports make sense." />

      <div className="grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Add category" />
          <CardBody>
            <form noValidate onSubmit={(event) => void onAdd(event)} className="flex flex-col gap-4">
              <Input label="Category name" value={name} onChange={(event) => setName(event.target.value)} error={nameError} placeholder="e.g. Transport" maxLength={80} autoComplete="off" />
              <SwatchPicker label="Colour" value={chosenColor} onChange={setColor} swatches={SWATCHES} />
              <Button type="submit" loading={saving} icon={!saving && <Plus className="size-4" aria-hidden="true" />}>
                Add category
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="All categories" description={categories.length ? `${categories.length} in total` : undefined} />
          <div className="p-5 pt-3">
            <DataBoundary skeleton={<SkeletonRows rows={5} />}>
              {categories.length === 0 ? (
                <EmptyState compact icon={Tags} title="No categories yet" description="Add one to start grouping your expenses." />
              ) : (
                <ul className="divide-y divide-line">
                  {categories.map((category) => {
                    const count = usage.get(category.id) ?? 0;
                    if (editingId === category.id) {
                      return (
                        <li key={category.id} className="py-4">
                          <form noValidate onSubmit={(event) => void onSaveEdit(event)} className="flex flex-col gap-3">
                            <Input label="Category name" value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={80} autoFocus autoComplete="off" />
                            <SwatchPicker label="Colour" value={editColor} onChange={setEditColor} swatches={SWATCHES} />
                            <div className="flex gap-2">
                              <Button type="submit" size="sm" loading={editSaving} icon={!editSaving && <Check className="size-4" aria-hidden="true" />}>
                                Save
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => setEditingId(null)} icon={<X className="size-4" aria-hidden="true" />}>
                                Cancel
                              </Button>
                            </div>
                          </form>
                        </li>
                      );
                    }
                    return (
                      <li key={category.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <CategoryDot color={colors.get(category.id) ?? category.color} className="size-3.5" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{category.name}</p>
                            <p className="text-[13px] text-ink-muted">
                              {count} {count === 1 ? 'expense' : 'expenses'}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center">
                          <IconButton label={`Edit ${category.name}`} onClick={() => startEdit(category)}>
                            <Pencil className="size-4" aria-hidden="true" />
                          </IconButton>
                          <IconButton label={`Delete ${category.name}`} tone="danger" disabled={busyId === category.id} onClick={() => void onDelete(category)}>
                            <Trash2 className="size-4" aria-hidden="true" />
                          </IconButton>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </DataBoundary>
          </div>
        </Card>
      </div>
    </>
  );
}
