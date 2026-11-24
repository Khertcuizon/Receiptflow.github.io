import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { CheckCircle2, CircleAlert, ImagePlus, Info, Loader2, ScanLine, Trash2, X } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFormatters } from '@/hooks/useFormatters';
import { getLocalDateString } from '@/lib/dates';
import { parseReceiptText } from '@/lib/receiptParser';
import { OcrCancelledError, startOcr, type OcrJob } from '@/services/ocr';
import { IMAGE_TYPES } from '@/services/api';
import { cn } from '@/lib/cn';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = Object.values(IMAGE_TYPES).filter((type, index, all) => all.indexOf(type) === index).join(',');

type StatusKind = 'info' | 'error' | 'success' | 'warning';
interface Status {
  kind: StatusKind;
  text: string;
}

const STATUS_STYLES: Record<StatusKind, { icon: typeof Info; tone: string }> = {
  info: { icon: Info, tone: 'bg-sunken text-ink-muted' },
  success: { icon: CheckCircle2, tone: 'bg-success-soft text-success-ink' },
  warning: { icon: CircleAlert, tone: 'bg-warning-soft text-warning-ink' },
  error: { icon: CircleAlert, tone: 'bg-danger-soft text-danger-ink' },
};

const IDLE: Status = { kind: 'info', text: 'Choose or drop a receipt image to begin.' };

/** Returns an error message if the file can't be used, otherwise null. */
function checkFile(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const fallbackType = IMAGE_TYPES[extension];
  const contentType = file.type || fallbackType;
  const allowed = Object.values(IMAGE_TYPES);
  if (!contentType || !allowed.includes(contentType) || (file.type && file.type !== contentType && file.type !== 'application/octet-stream')) {
    return 'Choose a JPEG, PNG, WebP, or GIF image.';
  }
  if (file.size > MAX_BYTES) return 'Image is too large. Choose a file smaller than 10 MB.';
  if (typeof createImageBitmap !== 'function') return 'This browser cannot verify images. Update your browser and try again.';
  return null;
}

export function ScanReceiptPage() {
  useDocumentTitle('Scan Receipt');
  const { categories, saveScannedReceipt } = useData();
  const fmt = useFormatters();
  const toast = useToast();

  const inputRef = useRef<HTMLInputElement>(null);
  const jobRef = useRef<OcrJob | null>(null);
  const fileRef = useRef<File | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>(IDLE);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState(false);

  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(getLocalDateString);
  const [total, setTotal] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [reference, setReference] = useState('');
  const [errors, setErrors] = useState<{ merchant?: string; total?: string }>({});

  // Cancel any running scan and free the preview when leaving the page.
  useEffect(
    () => () => {
      void jobRef.current?.cancel();
    },
    [],
  );
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const resetForm = () => {
    setMerchant('');
    setTotal('');
    setDate(getLocalDateString());
    setPaymentMethod('Card');
    setReference('');
    setErrors({});
  };

  const clearSelection = useCallback((message: Status = IDLE) => {
    void jobRef.current?.cancel();
    jobRef.current = null;
    fileRef.current = null;
    setFile(null);
    setPreviewUrl(null);
    setScannedFile(null);
    setScanning(false);
    setProgress(0);
    setStatus(message);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const selectFile = (next: File | null) => {
    setSaved(false);
    resetForm();
    if (!next) {
      clearSelection();
      return;
    }
    const problem = checkFile(next);
    if (problem) {
      clearSelection({ kind: 'error', text: problem });
      return;
    }
    void jobRef.current?.cancel();
    jobRef.current = null;
    fileRef.current = next;
    setFile(next);
    setScannedFile(null);
    setScanning(false);
    setProgress(0);
    setPreviewUrl(URL.createObjectURL(next));
    setStatus({ kind: 'info', text: 'Image ready. Select Scan receipt to read it.' });
  };

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) selectFile(dropped);
  };

  const scan = async () => {
    const current = file;
    if (!current) {
      setStatus({ kind: 'error', text: 'Choose or drop a receipt image first.' });
      return;
    }
    setScannedFile(null);
    setScanning(true);
    setProgress(0);
    setStatus({ kind: 'info', text: 'Scanning image for receipt details…' });
    try {
      const bitmap = await createImageBitmap(current);
      const bigEnough = bitmap.width >= 100 && bitmap.height >= 100;
      bitmap.close();
      if (!bigEnough) throw new Error('This image is too small to scan. Use a clearer receipt photo.');

      const job = startOcr(current, (update) => {
        if (fileRef.current !== current) return;
        setProgress(update.progress);
        setStatus({ kind: 'info', text: update.label });
      });
      jobRef.current = job;
      const text = await job.promise;
      if (fileRef.current !== current) return;

      const parsed = parseReceiptText(text);
      if (!parsed.isReceipt) throw new Error(parsed.reason);

      setMerchant(parsed.merchant);
      setDate(parsed.date || getLocalDateString());
      setPaymentMethod(parsed.paymentMethod);
      setErrors({});
      setScannedFile(current);
      if (parsed.total > 0) {
        setTotal(String(parsed.total));
        setStatus({ kind: 'success', text: 'Receipt detected. Review the details, then save.' });
        toast.success('OCR completed successfully.');
      } else {
        setTotal('');
        setStatus({ kind: 'warning', text: 'A receipt was detected, but its total could not be read. Enter the total, then save.' });
      }
    } catch (cause) {
      if (cause instanceof OcrCancelledError || fileRef.current !== current) return;
      const message = cause instanceof Error ? cause.message : 'This image could not be verified as a receipt.';
      console.error(cause);
      setStatus({ kind: 'error', text: message });
      toast.error(message);
    } finally {
      if (fileRef.current === current) {
        setScanning(false);
        jobRef.current = null;
      }
    }
  };

  const cancelScan = () => {
    void jobRef.current?.cancel();
    jobRef.current = null;
    setScanning(false);
    setProgress(0);
    setStatus({ kind: 'info', text: 'Scan cancelled. Select Scan receipt to try again.' });
  };

  const canSave = Boolean(file && scannedFile === file) && !scanning && !saving;

  const save = async () => {
    if (!file || scannedFile !== file) {
      setStatus({ kind: 'error', text: 'Scan and verify a receipt image before saving.' });
      return;
    }
    const amount = Number(total);
    const next: typeof errors = {};
    if (!merchant.trim()) next.merchant = 'Enter the merchant name before saving.';
    if (!Number.isFinite(amount) || amount <= 0) next.total = 'Enter a receipt total greater than zero.';
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(next.merchant ? 'merchant' : 'receipt-total')?.focus();
      return;
    }

    setSaving(true);
    try {
      const result = await saveScannedReceipt({ file, merchant, date, total: amount, categoryId: category, paymentMethod, reference });
      if (result.warning) toast.error(result.warning);
      else toast.success('Receipt saved successfully.');
      resetForm();
      setCategory('');
      clearSelection({ kind: 'success', text: 'Receipt saved and added to your expense tracker.' });
      setSaved(true);
    } catch (cause) {
      console.error(cause);
      const message = cause instanceof Error ? cause.message : 'Unknown error';
      setStatus({ kind: 'error', text: 'Receipt could not be saved. Check your Supabase setup and try again.' });
      toast.error(`Could not save receipt: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const StatusIcon = scanning ? Loader2 : STATUS_STYLES[status.kind].icon;

  return (
    <>
      <PageHeader title="Scan Receipt" description="Upload a receipt and review the extracted details before saving." />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Upload receipt" description="JPEG, PNG, WebP or GIF, up to 10 MB." />
          <CardBody className="flex flex-col gap-4">
            <label
              htmlFor="receipt-image"
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
              }}
              onDrop={onDrop}
              className={cn(
                'relative grid min-h-72 cursor-pointer place-items-center overflow-hidden rounded-panel border-2 border-dashed p-4 text-center transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30',
                dragging ? 'border-accent bg-accent-soft' : 'border-line-strong bg-sunken/50 hover:border-ink-faint hover:bg-sunken',
              )}
            >
              <input
                ref={inputRef}
                id="receipt-image"
                type="file"
                accept={ACCEPT}
                className="sr-only"
                onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
              />
              {previewUrl ? (
                <img src={previewUrl} alt="Selected receipt preview" className="max-h-96 w-auto max-w-full rounded-lg object-contain shadow-panel" />
              ) : (
                <span className="flex flex-col items-center gap-2 text-ink-muted">
                  <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-ink">
                    <ImagePlus className="size-6" aria-hidden="true" />
                  </span>
                  <span className="font-medium text-ink">Drop a receipt image here</span>
                  <span className="text-sm">or click to choose a file</span>
                </span>
              )}
              {scanning && (
                <span aria-hidden="true" className="scan-sweep pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-accent shadow-[0_0_14px_2px_var(--accent)] [animation-iteration-count:infinite]" />
              )}
            </label>

            {file && (
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="min-w-0 truncate text-ink-muted">
                  {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button variant="ghost" size="sm" onClick={() => clearSelection()} disabled={saving} icon={<Trash2 className="size-4" aria-hidden="true" />}>
                  Remove
                </Button>
              </div>
            )}

            {scanning && <ProgressBar value={progress * 100} label="Scan progress" />}

            <p role={status.kind === 'error' ? 'alert' : 'status'} className={cn('flex items-start gap-2 rounded-control px-3.5 py-3 text-sm', STATUS_STYLES[status.kind].tone)}>
              <StatusIcon className={cn('mt-0.5 size-4 shrink-0', scanning && 'animate-spin')} aria-hidden="true" />
              <span>{status.text}</span>
            </p>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void scan()} disabled={!file || scanning || saving} loading={scanning} icon={!scanning && <ScanLine className="size-4" aria-hidden="true" />}>
                {scanning ? 'Scanning…' : 'Scan receipt'}
              </Button>
              {scanning && (
                <Button variant="secondary" onClick={cancelScan} icon={<X className="size-4" aria-hidden="true" />}>
                  Cancel
                </Button>
              )}
            </div>

            {saved && (
              <p className="text-sm text-ink-muted">
                Saved. <Link to="/receipts" className="font-medium text-accent-ink hover:underline">View receipts</Link> or{' '}
                <Link to="/expenses" className="font-medium text-accent-ink hover:underline">
                  see the expense
                </Link>
                .
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Review extracted data" description={scannedFile ? 'Check each field, then save.' : 'Scan a receipt to fill these in.'} />
          <CardBody>
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
              className="flex flex-col gap-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="merchant"
                  label="Merchant"
                  value={merchant}
                  onChange={(event) => setMerchant(event.target.value)}
                  error={errors.merchant}
                  maxLength={200}
                  wrapperClassName="sm:col-span-2"
                  autoComplete="off"
                />
                <Input label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                <Input
                  id="receipt-total"
                  label={`Total (${fmt.currency})`}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  value={total}
                  onChange={(event) => setTotal(event.target.value)}
                  error={errors.total}
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
                <Select label="Payment method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                  <option value="Card">Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </Select>
                <Input
                  label="Reference"
                  optional
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="e.g. invoice number"
                  hint="Added to the expense's notes."
                  wrapperClassName="sm:col-span-2"
                  maxLength={120}
                  autoComplete="off"
                />
              </div>
              <div>
                <Button type="submit" loading={saving} disabled={!canSave}>
                  Save receipt
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
