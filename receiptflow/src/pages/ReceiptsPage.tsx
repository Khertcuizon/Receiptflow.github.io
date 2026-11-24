import { useMemo, useState } from 'react';
import { ExternalLink, ImageIcon, ReceiptText, ScanLine, Trash2 } from 'lucide-react';
import { CategoryDot } from '@/components/common/CategoryDot';
import { DataBoundary } from '@/components/common/DataBoundary';
import { DataTable, type Column } from '@/components/common/DataTable';
import { SearchInput } from '@/components/common/SearchInput';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button, ButtonLink, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton, SkeletonRows } from '@/components/ui/Skeleton';
import { useConfirm } from '@/context/ConfirmContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFormatters } from '@/hooks/useFormatters';
import { usePagination } from '@/hooks/usePagination';
import { buildCategoryColorMap, getCategoryName, UNCATEGORIZED_COLOR } from '@/lib/categories';
import type { Receipt, ReceiptStatus } from '@/types';

const STATUS_TONES: Record<ReceiptStatus, BadgeTone> = { approved: 'success', pending: 'warning', rejected: 'danger' };

interface Preview {
  receipt: Receipt;
  url: string | null;
  error: string | null;
}

export function ReceiptsPage() {
  useDocumentTitle('Receipts');
  const { receipts, categories, deleteReceipt, getReceiptImageUrl } = useData();
  const fmt = useFormatters();
  const toast = useToast();
  const confirm = useConfirm();
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const colors = useMemo(() => buildCategoryColorMap(categories), [categories]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...receipts]
      .filter((receipt) => (categoryFilter === 'all' ? true : categoryFilter === 'none' ? !receipt.category : receipt.category === categoryFilter))
      .filter((receipt) => !needle || receipt.merchant.toLowerCase().includes(needle))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [receipts, query, categoryFilter]);
  const { visible, hasMore, remaining, showMore } = usePagination(filtered, 20);

  const openImage = async (receipt: Receipt) => {
    if (!receipt.imagePath) return;
    setPreview({ receipt, url: null, error: null });
    try {
      const url = await getReceiptImageUrl(receipt.imagePath);
      setPreview((current) => (current?.receipt.id === receipt.id ? { receipt, url, error: null } : current));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unknown error';
      setPreview((current) => (current?.receipt.id === receipt.id ? { receipt, url: null, error: message } : current));
    }
  };

  const onDelete = async (receipt: Receipt) => {
    const ok = await confirm({
      title: `Delete receipt from ${receipt.merchant || 'this merchant'}?`,
      description: 'The receipt and its image are removed. Its expense stays in your expense log.',
      confirmLabel: 'Delete receipt',
      tone: 'danger',
    });
    if (!ok) return;
    setBusyId(receipt.id);
    try {
      const result = await deleteReceipt(receipt.id);
      if (result.warning) toast.error(result.warning);
      else toast.success('Receipt deleted.');
    } catch (cause) {
      toast.error(`Could not delete receipt: ${cause instanceof Error ? cause.message : 'Unknown error'}`);
    } finally {
      setBusyId(null);
    }
  };

  const categoryCell = (receipt: Receipt) => (
    <span className="inline-flex items-center gap-2">
      <CategoryDot color={receipt.category ? (colors.get(receipt.category) ?? UNCATEGORIZED_COLOR) : UNCATEGORIZED_COLOR} />
      {getCategoryName(receipt.category, categories)}
    </span>
  );

  const imageButton = (receipt: Receipt) =>
    receipt.imagePath ? (
      <Button variant="ghost" size="sm" icon={<ImageIcon className="size-4" aria-hidden="true" />} onClick={() => void openImage(receipt)} aria-label={`View image for ${receipt.merchant}`}>
        View
      </Button>
    ) : (
      <span className="px-3 text-ink-faint" aria-label="No image">
        —
      </span>
    );

  const deleteButton = (receipt: Receipt) => (
    <IconButton label={`Delete receipt from ${receipt.merchant}`} tone="danger" disabled={busyId === receipt.id} onClick={() => void onDelete(receipt)}>
      <Trash2 className="size-4" aria-hidden="true" />
    </IconButton>
  );

  const columns: Column<Receipt>[] = [
    {
      key: 'merchant',
      header: 'Merchant',
      cell: (receipt) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{receipt.merchant || 'Unknown'}</p>
          <p className="text-[13px] text-ink-muted">{receipt.paymentMethod}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', cell: categoryCell },
    { key: 'date', header: 'Date', cell: (receipt) => <span className="whitespace-nowrap">{fmt.date(receipt.date)}</span> },
    { key: 'total', header: 'Total', align: 'right', cell: (receipt) => <span className="font-semibold">{fmt.money(receipt.total)}</span> },
    { key: 'status', header: 'Status', cell: (receipt) => <Badge tone={STATUS_TONES[receipt.status] ?? 'warning'}>{receipt.status || 'pending'}</Badge> },
    { key: 'image', header: 'Image', cell: imageButton },
    { key: 'actions', header: 'Action', align: 'right', cell: deleteButton },
  ];

  return (
    <>
      <PageHeader
        title="Receipts"
        description="Scanned receipts and their images."
        actions={
          <ButtonLink to="/scan-receipt" icon={<ScanLine className="size-4" aria-hidden="true" />}>
            Scan receipt
          </ButtonLink>
        }
      />

      <DataBoundary
        skeleton={
          <Card className="p-5">
            <Skeleton className="mb-5 h-10 w-full max-w-md" />
            <SkeletonRows rows={6} />
          </Card>
        }
      >
        {receipts.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No receipts yet"
            description="Scan a receipt and it will be saved here with its image and a matching expense."
            action={
              <ButtonLink to="/scan-receipt" icon={<ScanLine className="size-4" aria-hidden="true" />}>
                Scan your first receipt
              </ButtonLink>
            }
          />
        ) : (
          <Card>
            <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
              <SearchInput id="receipt-search" label="Search receipts by merchant" placeholder="Search merchants" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-52 flex-1 sm:max-w-xs" />
              <Select
                label="Filter by category"
                hideLabel
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                wrapperClassName="w-full sm:w-52"
              >
                <option value="all">All categories</option>
                <option value="none">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <p className="ml-auto text-sm text-ink-muted" aria-live="polite">
                {filtered.length} {filtered.length === 1 ? 'receipt' : 'receipts'}
              </p>
            </div>

            {filtered.length === 0 ? (
              <EmptyState compact className="m-4" title="No receipts match" description="Try a different search or category." />
            ) : (
              <>
                <DataTable
                  caption="Receipts"
                  rows={visible}
                  rowKey={(receipt) => receipt.id}
                  columns={columns}
                  mobileCard={(receipt) => (
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{receipt.merchant || 'Unknown'}</p>
                          <p className="text-[13px] text-ink-muted">
                            {fmt.date(receipt.date)} · {receipt.paymentMethod}
                          </p>
                        </div>
                        <p className="shrink-0 font-semibold tabular-nums">{fmt.money(receipt.total)}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm text-ink-muted">
                          {categoryCell(receipt)}
                          <Badge tone={STATUS_TONES[receipt.status] ?? 'warning'}>{receipt.status || 'pending'}</Badge>
                        </span>
                        <span className="flex items-center">
                          {receipt.imagePath && imageButton(receipt)}
                          {deleteButton(receipt)}
                        </span>
                      </div>
                    </div>
                  )}
                />
                {hasMore && (
                  <div className="border-t border-line p-4 text-center">
                    <Button variant="secondary" onClick={showMore}>
                      Show {Math.min(20, remaining)} more
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        )}
      </DataBoundary>

      <Modal
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview ? `Receipt from ${preview.receipt.merchant}` : 'Receipt'}
        description={preview ? `${fmt.date(preview.receipt.date)} · ${fmt.money(preview.receipt.total)}` : undefined}
        size="lg"
        footer={
          <>
            {preview?.url && (
              <a
                href={preview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mr-auto inline-flex h-10 items-center gap-2 rounded-control px-3 text-sm font-medium text-accent-ink hover:underline"
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                Open in new tab
              </a>
            )}
            <Button variant="secondary" onClick={() => setPreview(null)}>
              Close
            </Button>
          </>
        }
      >
        <div className="grid min-h-48 place-items-center rounded-control bg-sunken p-2">
          {preview?.error ? (
            <ErrorState title="Couldn't load the image" message={preview.error} className="w-full" />
          ) : preview?.url ? (
            <img src={preview.url} alt={`Receipt from ${preview.receipt.merchant}`} className="max-h-[65dvh] w-auto max-w-full rounded-lg object-contain" />
          ) : (
            <Skeleton className="h-64 w-full" />
          )}
        </div>
      </Modal>
    </>
  );
}
