import type { PostgrestError } from '@supabase/supabase-js';
import type {
  AppNotification,
  Budget,
  Category,
  CollectionKey,
  CollectionMap,
  Expense,
  Receipt,
  Settings,
} from '@/types';
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from '@/lib/format';
import { getSupabase, toError } from './supabase';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

interface Mapper<T> {
  table: string;
  toRow: (item: T) => Row;
  fromRow: (row: Row) => T;
}

// Each collection maps to a table in supabase/schema.sql. The mappers convert
// between the app's camelCase objects and the typed columns.
const MAPPERS: { [K in CollectionKey]: Mapper<CollectionMap[K]> } = {
  categories: {
    table: 'categories',
    toRow: (item: Category) => ({
      id: item.id,
      name: item.name,
      type: item.type || 'expense',
      color: item.color || '#17805a',
    }),
    fromRow: (row): Category => ({ id: row.id, name: row.name, type: row.type, color: row.color }),
  },
  receipts: {
    table: 'receipts',
    toRow: (item: Receipt) => ({
      id: item.id,
      merchant: item.merchant,
      receipt_date: item.date,
      total: Number(item.total),
      category_id: item.category || null,
      payment_method: item.paymentMethod || 'Card',
      status: item.status || 'approved',
      source: item.source || 'manual',
      image_path: item.imagePath || null,
    }),
    fromRow: (row): Receipt => ({
      id: row.id,
      merchant: row.merchant,
      date: row.receipt_date,
      total: Number(row.total),
      category: row.category_id || '',
      paymentMethod: row.payment_method,
      status: row.status,
      source: row.source,
      imagePath: row.image_path,
    }),
  },
  expenses: {
    table: 'expenses',
    toRow: (item: Expense) => ({
      id: item.id,
      title: item.title,
      amount: Number(item.amount),
      category_id: item.category || null,
      expense_date: item.date,
      notes: item.notes || '',
      receipt_id: item.receiptId || null,
    }),
    fromRow: (row): Expense => ({
      id: row.id,
      title: row.title,
      amount: Number(row.amount),
      category: row.category_id || '',
      date: row.expense_date,
      notes: row.notes || '',
      receiptId: row.receipt_id || null,
    }),
  },
  budgets: {
    table: 'budgets',
    toRow: (item: Budget) => ({
      id: item.id,
      name: item.name,
      category_id: item.categoryId,
      amount: Number(item.amount),
      period: item.period,
    }),
    fromRow: (row): Budget => ({
      id: row.id,
      name: row.name,
      categoryId: row.category_id,
      amount: Number(row.amount),
      period: row.period,
    }),
  },
  notifications: {
    table: 'notifications',
    toRow: (item: AppNotification) => ({
      id: item.id,
      budget_id: item.budgetId || null,
      period_key: item.periodKey || null,
      title: item.title,
      message: item.message || '',
      type: item.type || 'info',
      created_at: item.createdAt || new Date().toISOString(),
    }),
    fromRow: (row): AppNotification => ({
      id: row.id,
      budgetId: row.budget_id,
      periodKey: row.period_key,
      title: row.title,
      message: row.message,
      type: row.type,
      createdAt: row.created_at,
    }),
  },
};

const PAGE_SIZE = 1000;
const RECEIPT_BUCKET = 'receipts';

export const IMAGE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

/** Turns database constraint violations into messages a person can act on. */
export function translateStorageError(error: PostgrestError | Error | unknown): Error {
  const code = (error as { code?: string } | null)?.code;
  if (code === '23505') return new Error('An item with this name already exists.');
  if (code === '23514') return new Error('One of the values is not valid. Check the amount and required fields.');
  if (code === '23503') return new Error('A linked item no longer exists. Refresh the page and try again.');
  return toError(error);
}

export interface SaveReceiptInput {
  receiptId: string;
  expenseId: string;
  merchant: string;
  date: string;
  total: number;
  categoryId: string;
  paymentMethod: string;
  imagePath: string | null;
  notes: string;
}

/** All Supabase access for one signed-in user. */
export function createApi(userId: string) {
  const client = () => getSupabase();

  async function list<K extends CollectionKey>(key: K): Promise<CollectionMap[K][]> {
    const { table, fromRow } = MAPPERS[key] as Mapper<CollectionMap[K]>;
    const items: CollectionMap[K][] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await client()
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw translateStorageError(error);
      items.push(...(data ?? []).map(fromRow));
      if (!data || data.length < PAGE_SIZE) break;
    }
    return items;
  }

  // Inserts only: existing rows are never overwritten, so two tabs cannot clobber each other.
  async function insert<K extends CollectionKey>(key: K, items: CollectionMap[K][]): Promise<void> {
    if (!items.length) return;
    const { table, toRow } = MAPPERS[key] as Mapper<CollectionMap[K]>;
    const { error } = await client()
      .from(table)
      .insert(items.map((item) => ({ ...toRow(item), user_id: userId })));
    if (error) throw translateStorageError(error);
  }

  async function update(key: 'categories', id: string, patch: Partial<Pick<Category, 'name' | 'color'>>): Promise<void> {
    const { error } = await client()
      .from(MAPPERS[key].table)
      .update(patch)
      .eq('user_id', userId)
      .eq('id', id);
    if (error) throw translateStorageError(error);
  }

  // Foreign keys do the rest: deleting a receipt unlinks its expense, deleting a category cascades to budgets.
  async function remove(key: CollectionKey, id: string): Promise<void> {
    const { error } = await client().from(MAPPERS[key].table).delete().eq('user_id', userId).eq('id', id);
    if (error) throw translateStorageError(error);
  }

  async function getSettings(): Promise<Settings | null> {
    const { data, error } = await client()
      .from('user_settings')
      .select('currency, locale')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw toError(error);
    return data ? { currency: data.currency, locale: data.locale } : null;
  }

  async function saveSettings(settings: Settings): Promise<void> {
    const { error } = await client()
      .from('user_settings')
      .upsert(
        { user_id: userId, currency: settings.currency || DEFAULT_CURRENCY, locale: settings.locale || DEFAULT_LOCALE },
        { onConflict: 'user_id' },
      );
    if (error) throw toError(error);
  }

  async function uploadReceiptImage(receiptId: string, file: File): Promise<string> {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    const path = `${userId}/${receiptId}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error } = await client()
      .storage.from(RECEIPT_BUCKET)
      .upload(path, file, { contentType: file.type || IMAGE_TYPES[extension], upsert: false });
    if (error) throw toError(error);
    return path;
  }

  async function removeReceiptImages(paths: string[]): Promise<void> {
    if (!paths.length) return;
    const { error } = await client().storage.from(RECEIPT_BUCKET).remove(paths);
    if (error) throw toError(error);
  }

  async function createReceiptImageUrl(path: string, expiresInSeconds = 60 * 60): Promise<string> {
    const { data, error } = await client().storage.from(RECEIPT_BUCKET).createSignedUrl(path, expiresInSeconds);
    if (error) throw toError(error);
    return data.signedUrl;
  }

  async function saveReceiptWithExpense(input: SaveReceiptInput): Promise<void> {
    const { error } = await client().rpc('save_receipt_with_expense', {
      p_receipt_id: input.receiptId,
      p_merchant: input.merchant,
      p_receipt_date: input.date,
      p_total: input.total,
      p_category_id: input.categoryId || null,
      p_payment_method: input.paymentMethod,
      p_image_path: input.imagePath,
      p_expense_id: input.expenseId,
      p_notes: input.notes,
    });
    if (error) throw translateStorageError(error);
  }

  async function deleteAllUserData(): Promise<void> {
    const bucket = client().storage.from(RECEIPT_BUCKET);
    const imagePaths: string[] = [];
    for (let offset = 0; ; offset += 100) {
      const { data: files, error } = await bucket.list(userId, {
        limit: 100,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw toError(error);
      for (const file of files ?? []) {
        if (file.id && file.name) imagePaths.push(`${userId}/${file.name}`);
      }
      if (!files || files.length < 100) break;
    }
    for (let index = 0; index < imagePaths.length; index += 100) {
      const { error } = await bucket.remove(imagePaths.slice(index, index + 100));
      if (error) throw toError(error);
    }

    // Child tables first, so the order is explicit even though foreign keys cascade.
    for (const table of ['expenses', 'receipts', 'notifications', 'budgets', 'categories', 'user_settings']) {
      const { error } = await client().from(table).delete().eq('user_id', userId);
      if (error) throw toError(error);
    }
  }

  return {
    list,
    insert,
    update,
    remove,
    getSettings,
    saveSettings,
    uploadReceiptImage,
    removeReceiptImages,
    createReceiptImageUrl,
    saveReceiptWithExpense,
    deleteAllUserData,
  };
}

export type Api = ReturnType<typeof createApi>;
