/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * In-memory stand-in for @supabase/supabase-js, used by `npm run dev:mock` and
 * the test suite. It persists to localStorage so page reloads (like the Google
 * redirect) keep working. It mimics only what ReceiptFlow uses: Google OAuth,
 * query builders with RLS-style user scoping, unique/check constraints,
 * foreign-key cascades, signed storage URLs and the save_receipt_with_expense RPC.
 */

const DB_KEY = 'rf-mock-db';
const SESSION_KEY = 'rf-mock-session';
const FILES_KEY = 'rf-mock-files';
const NEXT_EMAIL_KEY = 'rf-mock-next-email';

type Row = Record<string, any>;
type Db = Record<string, Row[]>;

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));

const loadDb = (): Db => read<Db>(DB_KEY, {});
const saveDb = (db: Db) => write(DB_KEY, db);

const listeners = new Set<(event: string, session: any) => void>();
const emit = (event: string, session: any) => listeners.forEach((listener) => listener(event, session));

const currentSession = (): any => read<any>(SESSION_KEY, null);
const err = (message: string, code = ''): { message: string; code: string } => ({ message, code });
const delay = <T,>(value: T, ms = 15) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Sample data created for a newly registered demo account. */
export function seedFor(userId: string) {
  const db = loadDb();
  const add = (table: string, rows: Row[]) => {
    db[table] = [...(db[table] ?? []), ...rows.map((row, i) => ({ user_id: userId, created_at: new Date(Date.now() - i * 1000).toISOString(), ...row }))];
  };
  add('categories', [
    { id: 'c-food', name: 'Food & Drinks', type: 'expense', color: '#1d8d5f' },
    { id: 'c-transport', name: 'Transport', type: 'expense', color: '#1d8d5f' },
    { id: 'c-school', name: 'School', type: 'expense', color: '#1d8d5f' },
    { id: 'c-bills', name: 'Bills', type: 'expense', color: '#1d8d5f' },
  ]);
  add('expenses', [
    { id: 'e1', title: 'Kape Kabisera', amount: 291, category_id: 'c-food', expense_date: day(0), notes: 'Saved from scan', receipt_id: 'r1' },
    { id: 'e2', title: 'Jeepney fare', amount: 24, category_id: 'c-transport', expense_date: day(0), notes: '', receipt_id: null },
    { id: 'e3', title: 'Groceries', amount: 1420.5, category_id: 'c-food', expense_date: day(1), notes: 'Weekly market run', receipt_id: null },
    { id: 'e4', title: 'Notebook and pens', amount: 186, category_id: 'c-school', expense_date: day(2), notes: '', receipt_id: null },
    { id: 'e5', title: 'Internet bill', amount: 1299, category_id: 'c-bills', expense_date: day(3), notes: 'Monthly plan', receipt_id: null },
    { id: 'e6', title: 'Tricycle', amount: 60, category_id: 'c-transport', expense_date: day(4), notes: '', receipt_id: null },
    { id: 'e7', title: 'Lunch', amount: 135, category_id: 'c-food', expense_date: day(5), notes: '', receipt_id: null },
    { id: 'e8', title: 'Printing', amount: 48, category_id: 'c-school', expense_date: day(6), notes: '', receipt_id: null },
    { id: 'e9', title: 'Groceries', amount: 980, category_id: 'c-food', expense_date: day(34), notes: '', receipt_id: null },
    { id: 'e10', title: 'Electric bill', amount: 2210, category_id: 'c-bills', expense_date: day(38), notes: '', receipt_id: null },
    { id: 'e11', title: 'Misc', amount: 75, category_id: null, expense_date: day(2), notes: '', receipt_id: null },
  ]);
  add('receipts', [
    { id: 'r1', merchant: 'Kape Kabisera', receipt_date: day(0), total: 291, category_id: 'c-food', payment_method: 'Cash', status: 'approved', source: 'scanner', image_path: null },
    { id: 'r2', merchant: 'Corner Pharmacy', receipt_date: day(9), total: 412.75, category_id: null, payment_method: 'Card', status: 'approved', source: 'scanner', image_path: null },
  ]);
  add('budgets', [
    { id: 'b1', name: 'Eating out', category_id: 'c-food', amount: 4000, period: 'monthly' },
    { id: 'b2', name: 'Weekly transport', category_id: 'c-transport', amount: 100, period: 'weekly' },
    { id: 'b3', name: 'School supplies', category_id: 'c-school', amount: 150, period: 'monthly' },
  ]);
  add('notifications', [
    { id: 'n1', budget_id: 'b3', period_key: day(0).slice(0, 7), title: 'School supplies budget exceeded', message: 'You have spent ₱234.00 of ₱150.00 this month.', type: 'warning' },
    { id: 'n2', budget_id: 'b2', period_key: 'x', title: 'Weekly transport budget near limit', message: 'You have spent ₱84.00 of ₱100.00 this week.', type: 'warning' },
  ]);
  saveDb(db);
}

const UNIQUE_CATEGORY = (rows: Row[], row: Row) =>
  rows.some((r) => r.user_id === row.user_id && r.id !== row.id && String(r.name).trim().toLowerCase() === String(row.name).trim().toLowerCase());

function validate(table: string, db: Db, row: Row): { message: string; code: string } | null {
  if (table === 'categories' && UNIQUE_CATEGORY(db.categories ?? [], row)) return err('duplicate key value violates unique constraint', '23505');
  if (['expenses', 'receipts', 'budgets'].includes(table)) {
    const amount = table === 'receipts' ? row.total : row.amount;
    if (!(Number(amount) > 0)) return err('check constraint violated', '23514');
  }
  if (table === 'budgets' && !(db.categories ?? []).some((c) => c.user_id === row.user_id && c.id === row.category_id)) {
    return err('foreign key violation', '23503');
  }
  return null;
}

function cascadeDelete(table: string, db: Db, removed: Row[]) {
  for (const row of removed) {
    if (table === 'categories') {
      db.budgets = (db.budgets ?? []).filter((b) => !(b.user_id === row.user_id && b.category_id === row.id));
      for (const t of ['expenses', 'receipts']) for (const r of db[t] ?? []) if (r.user_id === row.user_id && r.category_id === row.id) r.category_id = null;
    }
    if (table === 'receipts') for (const e of db.expenses ?? []) if (e.user_id === row.user_id && e.receipt_id === row.id) e.receipt_id = null;
    if (table === 'budgets') for (const n of db.notifications ?? []) if (n.user_id === row.user_id && n.budget_id === row.id) n.budget_id = null;
  }
}

class Query {
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private filters: Array<[string, any]> = [];
  private payload: any;
  private orders: Array<{ column: string; ascending: boolean }> = [];
  private window: [number, number] | null = null;
  private single = false;
  private conflict = '';

  constructor(private table: string) {}

  select() { return this; }
  insert(rows: Row | Row[]) { this.op = 'insert'; this.payload = Array.isArray(rows) ? rows : [rows]; return this; }
  update(patch: Row) { this.op = 'update'; this.payload = patch; return this; }
  delete() { this.op = 'delete'; return this; }
  upsert(row: Row, opts?: { onConflict?: string }) { this.op = 'upsert'; this.payload = row; this.conflict = opts?.onConflict ?? 'id'; return this; }
  eq(column: string, value: any) { this.filters.push([column, value]); return this; }
  order(column: string, opts?: { ascending?: boolean }) { this.orders.push({ column, ascending: opts?.ascending !== false }); return this; }
  range(from: number, to: number) { this.window = [from, to]; return this; }
  maybeSingle() { this.single = true; return this; }

  then(resolve: (value: any) => any, reject?: (reason: any) => any) {
    return delay(this.run()).then(resolve, reject);
  }

  private run(): { data: any; error: any } {
    const session = currentSession();
    if (!session) return { data: null, error: err('JWT expired', 'PGRST301') };
    const uid = session.user.id;
    const db = loadDb();
    const rows = (db[this.table] ??= []);
    const matches = (row: Row) => row.user_id === uid && this.filters.every(([c, v]) => row[c] === v);

    if (this.op === 'insert') {
      if (this.table === 'account_profiles') {
        if (rows.some((r) => r.user_id === uid)) return { data: null, error: err('duplicate key', '23505') };
        if (!/@gmail\.com$/i.test(session.user.email)) return { data: null, error: err('new row violates row-level security policy', '42501') };
      }
      const created: Row[] = [];
      for (const input of this.payload as Row[]) {
        const row: Row = { created_at: new Date().toISOString(), ...input, user_id: uid };
        if (rows.some((r) => r.user_id === uid && r.id === row.id && this.table !== 'account_profiles')) return { data: null, error: err('duplicate key', '23505') };
        const bad = validate(this.table, db, row);
        if (bad) return { data: null, error: bad };
        if (this.table === 'notifications' && row.budget_id && rows.some((r) => r.user_id === uid && r.budget_id === row.budget_id && r.period_key === row.period_key)) {
          return { data: null, error: err('duplicate key', '23505') };
        }
        created.push(row);
      }
      rows.push(...created);
      saveDb(db);
      if (this.table === 'account_profiles' && !(db.categories ?? []).some((c) => c.user_id === uid)) seedFor(uid);
      return { data: created, error: null };
    }

    if (this.op === 'upsert') {
      const key = this.conflict;
      const existing = rows.find((r) => r[key] === this.payload[key]);
      if (existing) Object.assign(existing, this.payload);
      else rows.push({ created_at: new Date().toISOString(), ...this.payload });
      saveDb(db);
      return { data: null, error: null };
    }

    if (this.op === 'update') {
      const targets = rows.filter(matches);
      for (const row of targets) {
        const next = { ...row, ...this.payload };
        const bad = validate(this.table, db, next);
        if (bad) return { data: null, error: bad };
        Object.assign(row, this.payload);
      }
      saveDb(db);
      return { data: targets, error: null };
    }

    if (this.op === 'delete') {
      const removed = rows.filter(matches);
      db[this.table] = rows.filter((row) => !matches(row));
      cascadeDelete(this.table, db, removed);
      saveDb(db);
      return { data: removed, error: null };
    }

    let result = rows.filter(matches);
    for (const { column, ascending } of [...this.orders].reverse()) {
      result = [...result].sort((a, b) => (a[column] > b[column] ? 1 : a[column] < b[column] ? -1 : 0) * (ascending ? 1 : -1));
    }
    if (this.window) result = result.slice(this.window[0], this.window[1] + 1);
    if (this.single) return { data: result[0] ?? null, error: null };
    return { data: result, error: null };
  }
}

const toUser = (email: string) => ({
  id: `user-${email.replace(/[^a-z0-9]/gi, '')}`,
  email,
  app_metadata: { providers: ['google'] },
  user_metadata: { full_name: email.startsWith('demo') ? 'Khert Demo' : email.split('@')[0] },
});

export function createClient(_url: string, _key: string) {
  const auth = {
    async getSession() {
      return delay({ data: { session: currentSession() }, error: null });
    },
    async getUser() {
      const session = currentSession();
      return delay({ data: { user: session?.user ?? null }, error: null });
    },
    async signInWithOAuth({ options }: { provider: string; options?: { redirectTo?: string } }) {
      const email = localStorage.getItem(NEXT_EMAIL_KEY) || 'demo@gmail.com';
      write(SESSION_KEY, { user: toUser(email) });
      setTimeout(() => window.location.assign(options?.redirectTo ?? window.location.origin), 30);
      return { data: {}, error: null };
    },
    async signOut() {
      localStorage.removeItem(SESSION_KEY);
      emit('SIGNED_OUT', null);
      return delay({ error: null });
    },
    onAuthStateChange(callback: (event: string, session: any) => void) {
      listeners.add(callback);
      return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
    },
  };

  const storage = {
    from(bucket: string) {
      const files = () => read<Record<string, string>>(FILES_KEY, {});
      return {
        async upload(path: string, file: File) {
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.readAsDataURL(file);
          });
          write(FILES_KEY, { ...files(), [`${bucket}/${path}`]: dataUrl });
          return delay({ data: { path }, error: null });
        },
        async createSignedUrl(path: string) {
          const url = files()[`${bucket}/${path}`];
          return delay(url ? { data: { signedUrl: url }, error: null } : { data: null, error: err('Object not found') });
        },
        async remove(paths: string[]) {
          const next = files();
          for (const path of paths) delete next[`${bucket}/${path}`];
          write(FILES_KEY, next);
          return delay({ data: [], error: null });
        },
        async list(prefix: string) {
          const names = Object.keys(files())
            .filter((key) => key.startsWith(`${bucket}/${prefix}/`))
            .map((key) => ({ id: key, name: key.slice(`${bucket}/${prefix}/`.length) }));
          return delay({ data: names, error: null });
        },
      };
    },
  };

  return {
    auth,
    storage,
    from: (table: string) => new Query(table),
    async rpc(name: string, args: Row) {
      if (name !== 'save_receipt_with_expense') return { data: null, error: err('unknown function') };
      const session = currentSession();
      if (!session) return { data: null, error: err('JWT expired') };
      const uid = session.user.id;
      const db = loadDb();
      if (!(Number(args.p_total) > 0)) return delay({ data: null, error: err('check constraint', '23514') });
      db.receipts = [
        ...(db.receipts ?? []),
        {
          user_id: uid, id: args.p_receipt_id, merchant: args.p_merchant, receipt_date: args.p_receipt_date, total: args.p_total,
          category_id: args.p_category_id || null, payment_method: args.p_payment_method || 'Card', status: 'approved', source: 'scanner',
          image_path: args.p_image_path, created_at: new Date().toISOString(),
        },
      ];
      db.expenses = [
        ...(db.expenses ?? []),
        {
          user_id: uid, id: args.p_expense_id, title: args.p_merchant, amount: args.p_total, category_id: args.p_category_id || null,
          expense_date: args.p_receipt_date, notes: args.p_notes ?? '', receipt_id: args.p_receipt_id, created_at: new Date().toISOString(),
        },
      ];
      saveDb(db);
      return delay({ data: null, error: null });
    },
  };
}

export type SupabaseClient = ReturnType<typeof createClient>;
export type User = any;
export type PostgrestError = any;

// Handy in the browser console: __mock.reset(), __mock.nextEmail('x@yahoo.com').
if (typeof window !== 'undefined') {
  (window as any).__mock = {
    reset: () => [DB_KEY, SESSION_KEY, FILES_KEY, NEXT_EMAIL_KEY].forEach((key) => localStorage.removeItem(key)),
    nextEmail: (email: string) => localStorage.setItem(NEXT_EMAIL_KEY, email),
  };
}
