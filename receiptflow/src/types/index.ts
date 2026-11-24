export type CategoryType = 'expense' | 'income';
export type BudgetPeriod = 'weekly' | 'monthly';
export type ReceiptStatus = 'pending' | 'approved' | 'rejected';
export type ReceiptSource = 'scanner' | 'manual';
export type NotificationType = 'info' | 'success' | 'warning';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
}

export interface Receipt {
  id: string;
  merchant: string;
  date: string;
  total: number;
  /** Category id, or '' when uncategorised. */
  category: string;
  paymentMethod: string;
  status: ReceiptStatus;
  source: ReceiptSource;
  imagePath: string | null;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  /** Category id, or '' when uncategorised. */
  category: string;
  date: string;
  notes: string;
  receiptId: string | null;
}

export interface Budget {
  id: string;
  name: string;
  categoryId: string;
  amount: number;
  period: BudgetPeriod;
}

export interface AppNotification {
  id: string;
  budgetId: string | null;
  periodKey: string | null;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
}

export interface Settings {
  currency: string;
  locale: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
}

export type CollectionKey = 'categories' | 'receipts' | 'expenses' | 'budgets' | 'notifications';

export interface CollectionMap {
  categories: Category;
  receipts: Receipt;
  expenses: Expense;
  budgets: Budget;
  notifications: AppNotification;
}
