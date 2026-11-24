import { useState, type FormEvent } from 'react';
import { Monitor, Moon, RotateCcw, Sun, Trash2 } from 'lucide-react';
import { SwatchPicker } from '@/components/common/SwatchPicker';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Segmented';
import { useAuth } from '@/context/AuthContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { CURRENCY_OPTIONS } from '@/lib/format';
import { ACCENT_PRESETS, BACKGROUND_PRESETS, type ThemeMode } from '@/lib/theme';

export function SettingsPage() {
  useDocumentTitle('Settings');
  const { state } = useAuth();
  const { settings, saveSettings, deleteAllData, status } = useData();
  const { theme, setMode, setAccent, setTint, reset, isCustomized } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();

  // The select shows the saved currency until the person picks another one.
  const [draftCurrency, setDraftCurrency] = useState<string | null>(null);
  const currency = draftCurrency ?? settings.currency;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const user = state.user;
  const options = CURRENCY_OPTIONS.some((option) => option.code === currency)
    ? CURRENCY_OPTIONS
    : [...CURRENCY_OPTIONS, { code: currency, label: currency }];

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveSettings({ currency, locale: settings.locale });
      setDraftCurrency(null);
      toast.success('Settings saved.');
    } catch (cause) {
      toast.error(`Could not save settings: ${cause instanceof Error ? cause.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: 'Delete all account data?',
      description:
        'This permanently deletes your receipts, expenses, categories, budgets, notifications, settings and receipt images. Your login account stays active.',
      confirmLabel: 'Delete everything',
      tone: 'danger',
      requireText: 'DELETE',
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteAllData();
      toast.success('Account data deleted.');
    } catch (cause) {
      toast.error(`Could not delete account data: ${cause instanceof Error ? cause.message : 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" description="Control how ReceiptFlow looks and works for you." />

      <div className="flex max-w-3xl flex-col gap-6">
        <Card>
          <CardHeader title="Account" description="You signed in with Google." />
          <CardBody>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-ink-muted">Name</dt>
                <dd className="mt-0.5 font-medium">{user?.name}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-sm text-ink-muted">Email</dt>
                <dd className="mt-0.5 truncate font-medium">{user?.email}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Appearance"
            description="Changes apply immediately and are remembered on this device."
            action={
              isCustomized && (
                <Button variant="ghost" size="sm" onClick={reset} icon={<RotateCcw className="size-4" aria-hidden="true" />}>
                  Reset
                </Button>
              )
            }
          />
          <CardBody className="flex flex-col gap-6">
            <div>
              <p className="mb-2 text-sm font-medium">Theme</p>
              <Segmented<ThemeMode>
                label="Theme"
                value={theme.mode}
                onChange={setMode}
                options={[
                  { value: 'light', label: 'Light', icon: <Sun className="size-4" aria-hidden="true" /> },
                  { value: 'dark', label: 'Dark', icon: <Moon className="size-4" aria-hidden="true" /> },
                  { value: 'system', label: 'System', icon: <Monitor className="size-4" aria-hidden="true" /> },
                ]}
              />
            </div>
            <SwatchPicker label="Accent colour" value={theme.accent} onChange={setAccent} swatches={ACCENT_PRESETS} />
            <SwatchPicker label="Background tint" value={theme.tint} onChange={setTint} swatches={BACKGROUND_PRESETS} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Preferences" />
          <CardBody>
            <form onSubmit={(event) => void onSave(event)} className="flex flex-col gap-4 sm:max-w-sm">
              <Select label="Currency" value={currency} onChange={(event) => setDraftCurrency(event.target.value)} hint="Used for amounts across the app." disabled={status !== 'ready'}>
                {options.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <div>
                <Button type="submit" loading={saving} disabled={status !== 'ready' || currency === settings.currency}>
                  Save settings
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card className="border-danger/30">
          <CardHeader title="Delete account data" description="Removes everything ReceiptFlow stores for you. This can't be undone." />
          <CardBody>
            <Button variant="danger" onClick={() => void onDelete()} loading={deleting} disabled={status !== 'ready'} icon={!deleting && <Trash2 className="size-4" aria-hidden="true" />}>
              Delete account data
            </Button>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
