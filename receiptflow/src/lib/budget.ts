import type { AppNotification, Budget, Expense } from '@/types';
import { generateId } from './ids';
import { getLocalDateString, getMonthKey, getWeekStart } from './dates';

export type BudgetLevel = 'ok' | 'near' | 'over';

/** First day (YYYY-MM-DD) of the budget's current period. */
export function getPeriodStart(budget: Pick<Budget, 'period'>, now: Date = new Date()): string {
  return budget.period === 'weekly' ? getWeekStart(now) : `${getMonthKey(now)}-01`;
}

/** Key used to de-duplicate alerts: the week start, or YYYY-MM. */
export function getPeriodKey(budget: Pick<Budget, 'period'>, now: Date = new Date()): string {
  return budget.period === 'weekly' ? getWeekStart(now) : getMonthKey(now);
}

export function getBudgetSpent(budget: Budget, expenses: Expense[], now: Date = new Date()): number {
  const start = getPeriodStart(budget, now);
  const end = getLocalDateString(now);
  return expenses
    .filter((expense) => expense.category === budget.categoryId && expense.date >= start && expense.date <= end)
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
}

export function getUsedPercent(spent: number, amount: number): number {
  return Math.min(100, Math.round((spent / Math.max(1, Number(amount || 0))) * 100));
}

export function getBudgetLevel(spent: number, amount: number): BudgetLevel {
  const limit = Number(amount || 0);
  if (limit <= 0) return 'ok';
  if (spent >= limit) return 'over';
  if (spent >= limit * 0.8) return 'near';
  return 'ok';
}

export function overallBudgetLevel(budgets: Budget[], expenses: Expense[], now: Date = new Date()): BudgetLevel {
  const levels = budgets.map((budget) => getBudgetLevel(getBudgetSpent(budget, expenses, now), budget.amount));
  if (levels.includes('over')) return 'over';
  if (levels.includes('near')) return 'near';
  return 'ok';
}

interface AlertInput {
  expenseCategory: string;
  budgets: Budget[];
  expenses: Expense[];
  notifications: AppNotification[];
  money: (value: number) => string;
  now?: Date;
}

/**
 * Builds the notifications that should be created after an expense is saved:
 * one per budget in that category that has reached 80% for the current period
 * and has not already been announced for it.
 */
export function computeBudgetAlerts({
  expenseCategory,
  budgets,
  expenses,
  notifications,
  money,
  now = new Date(),
}: AlertInput): AppNotification[] {
  return budgets
    .filter((budget) => {
      if (!expenseCategory || budget.categoryId !== expenseCategory || Number(budget.amount) <= 0) return false;
      const key = getPeriodKey(budget, now);
      const alreadyNotified = notifications.some((note) => note.budgetId === budget.id && note.periodKey === key);
      return !alreadyNotified && getBudgetSpent(budget, expenses, now) >= Number(budget.amount) * 0.8;
    })
    .map((budget) => {
      const spent = getBudgetSpent(budget, expenses, now);
      const over = spent >= Number(budget.amount);
      return {
        id: generateId('notification'),
        budgetId: budget.id,
        periodKey: getPeriodKey(budget, now),
        title: over ? `${budget.name} budget exceeded` : `${budget.name} budget near limit`,
        message: `You have spent ${money(spent)} of ${money(budget.amount)} this ${budget.period === 'weekly' ? 'week' : 'month'}.`,
        type: 'warning' as const,
        createdAt: now.toISOString(),
      };
    });
}
