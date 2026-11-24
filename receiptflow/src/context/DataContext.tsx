import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type {
  AppNotification,
  AppUser,
  Budget,
  BudgetPeriod,
  Category,
  CollectionKey,
  Expense,
  Receipt,
  Settings,
} from '@/types';
import { createApi, type Api } from '@/services/api';
import { toError } from '@/services/supabase';
import { computeBudgetAlerts } from '@/lib/budget';
import { getLocalDateString } from '@/lib/dates';
import { createFormatters, DEFAULT_CURRENCY, DEFAULT_LOCALE } from '@/lib/format';
import { generateId } from '@/lib/ids';

interface Collections {
  categories: Category[];
  receipts: Receipt[];
  expenses: Expense[];
  budgets: Budget[];
  notifications: AppNotification[];
}

const ALL_KEYS: CollectionKey[] = ['categories', 'receipts', 'expenses', 'budgets', 'notifications'];
const EMPTY: Collections = { categories: [], receipts: [], expenses: [], budgets: [], notifications: [] };
const DEFAULT_SETTINGS: Settings = { currency: DEFAULT_CURRENCY, locale: DEFAULT_LOCALE };
const STALE_AFTER_MS = 60_000;

export interface NewExpenseInput {
  title: string;
  amount: number;
  category: string;
  date: string;
  notes: string;
}

export interface NewBudgetInput {
  name: string;
  categoryId: string;
  amount: number;
  period: BudgetPeriod;
}

export interface ScannedReceiptInput {
  file: File;
  merchant: string;
  date: string;
  total: number;
  categoryId: string;
  paymentMethod: string;
  reference: string;
}

/** A write that succeeded, possibly with a follow-up step that did not. */
export interface MutationResult {
  warning?: string;
}

export interface DataContextValue extends Collections {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  settings: Settings;
  reload: (keys?: CollectionKey[]) => Promise<void>;
  addCategory: (input: { name: string; color: string }) => Promise<void>;
  updateCategory: (id: string, input: { name: string; color: string }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addExpense: (input: NewExpenseInput) => Promise<MutationResult>;
  deleteExpense: (id: string) => Promise<void>;
  addBudget: (input: NewBudgetInput) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  saveScannedReceipt: (input: ScannedReceiptInput) => Promise<MutationResult>;
  deleteReceipt: (id: string) => Promise<MutationResult>;
  saveSettings: (settings: Settings) => Promise<void>;
  deleteAllData: () => Promise<void>;
  getReceiptImageUrl: (path: string) => Promise<string>;
}

const DataContext = createContext<DataContextValue | null>(null);

async function fetchCollections(api: Api, keys: CollectionKey[]): Promise<Partial<Collections>> {
  const entries = await Promise.all(keys.map(async (key) => [key, await api.list(key)] as const));
  return Object.fromEntries(entries) as Partial<Collections>;
}

export function DataProvider({ user, children }: { user: AppUser; children: ReactNode }) {
  const api = useMemo(() => createApi(user.id), [user.id]);
  const [data, setData] = useState<Collections>(EMPTY);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const loadedAt = useRef(0);

  const merge = useCallback((partial: Partial<Collections>) => setData((prev) => ({ ...prev, ...partial })), []);

  const reload = useCallback(
    async (keys: CollectionKey[] = ALL_KEYS) => {
      merge(await fetchCollections(api, keys));
      loadedAt.current = Date.now();
    },
    [api, merge],
  );

  const initialLoad = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [collections, savedSettings] = await Promise.all([fetchCollections(api, ALL_KEYS), api.getSettings()]);
      setData({ ...EMPTY, ...collections });
      if (savedSettings) setSettings(savedSettings);
      loadedAt.current = Date.now();
      setStatus('ready');
    } catch (cause) {
      setError(toError(cause, 'Could not load your data.').message);
      setStatus('error');
    }
  }, [api]);

  useEffect(() => {
    void initialLoad();
  }, [initialLoad]);

  // Pick up changes made in another tab or device when the person comes back.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && status === 'ready' && Date.now() - loadedAt.current > STALE_AFTER_MS) {
        reload().catch(() => undefined);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload, status]);

  /**
   * After an expense is written: refresh the lists, then create any budget
   * alerts it triggered. Failures here don't undo the save, so they come back
   * as a warning instead of an error.
   */
  const afterExpenseSaved = useCallback(
    async (category: string, extraKeys: CollectionKey[] = []): Promise<MutationResult> => {
      const keys = Array.from(new Set<CollectionKey>(['expenses', 'budgets', 'notifications', ...extraKeys]));
      let fresh: Partial<Collections>;
      try {
        fresh = await fetchCollections(api, keys);
        merge(fresh);
      } catch (cause) {
        return { warning: `Saved, but the lists could not refresh: ${toError(cause).message}` };
      }
      try {
        const format = createFormatters(settings.currency, settings.locale);
        const alerts = computeBudgetAlerts({
          expenseCategory: category,
          budgets: fresh.budgets ?? [],
          expenses: fresh.expenses ?? [],
          notifications: fresh.notifications ?? [],
          money: format.money,
        });
        if (alerts.length) {
          try {
            await api.insert('notifications', alerts);
          } catch (cause) {
            // Another tab may have created the same alert first (unique per budget and period).
            if ((cause as { message?: string }).message !== 'An item with this name already exists.') throw cause;
          }
          merge({ notifications: await api.list('notifications') });
        }
        return {};
      } catch (cause) {
        return { warning: `Saved, but budget alerts failed: ${toError(cause).message}` };
      }
    },
    [api, merge, settings.currency, settings.locale],
  );

  const addCategory = useCallback(
    async ({ name, color }: { name: string; color: string }) => {
      await api.insert('categories', [{ id: generateId('category'), name: name.trim(), type: 'expense', color }]);
      await reload(['categories']);
    },
    [api, reload],
  );

  const updateCategory = useCallback(
    async (id: string, { name, color }: { name: string; color: string }) => {
      await api.update('categories', id, { name: name.trim(), color });
      await reload(['categories']);
    },
    [api, reload],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      const [expenses, budgets] = await Promise.all([api.list('expenses'), api.list('budgets')]);
      if (expenses.some((item) => item.category === id) || budgets.some((item) => item.categoryId === id)) {
        throw new Error('Remove this category from its expenses and budgets before deleting it.');
      }
      await api.remove('categories', id);
      await reload(['categories', 'receipts']);
    },
    [api, reload],
  );

  const addExpense = useCallback(
    async (input: NewExpenseInput): Promise<MutationResult> => {
      const expense: Expense = {
        id: generateId('expense'),
        title: input.title.trim(),
        amount: input.amount,
        category: input.category,
        date: input.date || getLocalDateString(),
        notes: input.notes.trim(),
        receiptId: null,
      };
      await api.insert('expenses', [expense]);
      return afterExpenseSaved(expense.category);
    },
    [api, afterExpenseSaved],
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      await api.remove('expenses', id);
      setData((prev) => ({ ...prev, expenses: prev.expenses.filter((item) => item.id !== id) }));
    },
    [api],
  );

  const addBudget = useCallback(
    async (input: NewBudgetInput) => {
      await api.insert('budgets', [{ id: generateId('budget'), ...input, name: input.name.trim() }]);
      await reload(['budgets']);
    },
    [api, reload],
  );

  const deleteBudget = useCallback(
    async (id: string) => {
      await api.remove('budgets', id);
      setData((prev) => ({ ...prev, budgets: prev.budgets.filter((item) => item.id !== id) }));
    },
    [api],
  );

  const saveScannedReceipt = useCallback(
    async (input: ScannedReceiptInput): Promise<MutationResult> => {
      const receiptId = generateId('receipt');
      const expenseId = generateId('expense');
      let imagePath: string | null = null;
      try {
        imagePath = await api.uploadReceiptImage(receiptId, input.file);
        await api.saveReceiptWithExpense({
          receiptId,
          expenseId,
          merchant: input.merchant.trim(),
          date: input.date || getLocalDateString(),
          total: input.total,
          categoryId: input.categoryId,
          paymentMethod: input.paymentMethod,
          imagePath,
          notes: input.reference.trim() ? `Saved from scan · Ref: ${input.reference.trim()}` : 'Saved from scan',
        });
      } catch (cause) {
        if (imagePath) {
          try {
            await api.removeReceiptImages([imagePath]);
          } catch (cleanup) {
            console.error('Could not remove the uploaded receipt after the save failed.', cleanup);
          }
        }
        throw cause;
      }
      return afterExpenseSaved(input.categoryId, ['receipts']);
    },
    [api, afterExpenseSaved],
  );

  const deleteReceipt = useCallback(
    async (id: string): Promise<MutationResult> => {
      const receipt = data.receipts.find((item) => item.id === id);
      await api.remove('receipts', id);
      setData((prev) => ({
        ...prev,
        receipts: prev.receipts.filter((item) => item.id !== id),
        expenses: prev.expenses.map((item) => (item.receiptId === id ? { ...item, receiptId: null } : item)),
      }));
      if (receipt?.imagePath) {
        try {
          await api.removeReceiptImages([receipt.imagePath]);
        } catch (cause) {
          return { warning: `Receipt deleted, but its image could not be removed: ${toError(cause).message}` };
        }
      }
      return {};
    },
    [api, data.receipts],
  );

  const saveSettings = useCallback(
    async (next: Settings) => {
      await api.saveSettings(next);
      setSettings(next);
    },
    [api],
  );

  const deleteAllData = useCallback(async () => {
    await api.deleteAllUserData();
    setData(EMPTY);
    setSettings(DEFAULT_SETTINGS);
  }, [api]);

  const value = useMemo<DataContextValue>(
    () => ({
      ...data,
      status,
      error,
      settings,
      reload: async (keys) => {
        if (status === 'error' && !keys) await initialLoad();
        else await reload(keys);
      },
      addCategory,
      updateCategory,
      deleteCategory,
      addExpense,
      deleteExpense,
      addBudget,
      deleteBudget,
      saveScannedReceipt,
      deleteReceipt,
      saveSettings,
      deleteAllData,
      getReceiptImageUrl: (path) => api.createReceiptImageUrl(path),
    }),
    [
      data,
      status,
      error,
      settings,
      initialLoad,
      reload,
      addCategory,
      updateCategory,
      deleteCategory,
      addExpense,
      deleteExpense,
      addBudget,
      deleteBudget,
      saveScannedReceipt,
      deleteReceipt,
      saveSettings,
      deleteAllData,
      api,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const value = useContext(DataContext);
  if (!value) throw new Error('useData must be used inside <DataProvider>.');
  return value;
}
