import { describe, expect, it } from 'vitest';
import { computeBudgetAlerts, getBudgetLevel, getBudgetSpent, getPeriodKey, getUsedPercent, overallBudgetLevel } from '@/lib/budget';
import { buildCategoryColorMap, CATEGORY_PALETTE, nextCategoryColor, totalsByCategory } from '@/lib/categories';
import { buildCsv } from '@/lib/csv';
import { getLocalDateString, getMonthKey, getWeekStart, lastDays, lastMonths, parseLocalDate, shiftMonth } from '@/lib/dates';
import { createFormatters } from '@/lib/format';
import { normalizeDate, parseReceiptText } from '@/lib/receiptParser';
import type { Budget, Category, Expense } from '@/types';

const expense = (over: Partial<Expense>): Expense => ({
  id: Math.random().toString(36), title: 't', amount: 10, category: 'food', date: '2026-11-18', notes: '', receiptId: null, ...over,
});
const budget = (over: Partial<Budget> = {}): Budget => ({ id: 'b1', name: 'Food', categoryId: 'food', amount: 1000, period: 'monthly', ...over });

describe('dates', () => {
  it('parses YYYY-MM-DD as a local date (no timezone shift)', () => {
    const d = parseLocalDate('2026-11-01')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 1]);
    expect(parseLocalDate('')).toBeNull();
    expect(parseLocalDate('garbage')).toBeNull();
  });
  it('finds the Monday of a week', () => {
    expect(getWeekStart(new Date(2026, 10, 22))).toBe('2026-11-16'); // Sunday -> previous Monday
    expect(getWeekStart(new Date(2026, 10, 16))).toBe('2026-11-16');
  });
  it('shifts months across year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(lastMonths(3, new Date(2026, 0, 15))).toEqual(['2025-11', '2025-12', '2026-01']);
  });
  it('lists the last N days oldest first', () => {
    expect(lastDays(3, new Date(2026, 2, 1))).toEqual(['2026-02-27', '2026-02-28', '2026-03-01']);
    expect(getMonthKey(new Date(2026, 4, 9))).toBe('2026-05');
    expect(getLocalDateString(new Date(2026, 4, 9))).toBe('2026-05-09');
  });
});

describe('budgets', () => {
  const now = new Date(2026, 10, 22); // Sun 22 Nov 2026
  it('sums only the matching category within the period', () => {
    const items = [
      expense({ amount: 300 }), expense({ amount: 200, date: '2026-11-02' }),
      expense({ amount: 999, category: 'other' }), expense({ amount: 500, date: '2026-10-31' }), expense({ amount: 50, date: '2026-11-30' }),
    ];
    expect(getBudgetSpent(budget(), items, now)).toBe(500);
    expect(getBudgetSpent(budget({ period: 'weekly' }), items, now)).toBe(300);
  });
  it('classifies levels at 80% and 100%', () => {
    expect(getBudgetLevel(799, 1000)).toBe('ok');
    expect(getBudgetLevel(800, 1000)).toBe('near');
    expect(getBudgetLevel(1000, 1000)).toBe('over');
    expect(getBudgetLevel(50, 0)).toBe('ok');
    expect(getUsedPercent(1500, 1000)).toBe(100);
    expect(getUsedPercent(5, 0)).toBe(100); // guarded against divide-by-zero
  });
  it('rolls up the overall level', () => {
    const items = [expense({ amount: 850, date: '2026-11-20' })];
    expect(overallBudgetLevel([budget()], items, now)).toBe('near');
    expect(overallBudgetLevel([], items, now)).toBe('ok');
  });
  it('creates one alert per budget and period, only at >= 80%', () => {
    const money = (v: number) => `P${v}`;
    const base = { expenseCategory: 'food', budgets: [budget()], notifications: [], money, now };
    expect(computeBudgetAlerts({ ...base, expenses: [expense({ amount: 700 })] })).toHaveLength(0);
    const [alert] = computeBudgetAlerts({ ...base, expenses: [expense({ amount: 800 })] });
    expect(alert).toMatchObject({ title: 'Food budget near limit', periodKey: '2026-11', budgetId: 'b1', type: 'warning' });
    expect(alert!.message).toBe('You have spent P800 of P1000 this month.');
    const [over] = computeBudgetAlerts({ ...base, expenses: [expense({ amount: 1200 })] });
    expect(over!.title).toBe('Food budget exceeded');
    // Already announced for this period -> none.
    expect(computeBudgetAlerts({ ...base, expenses: [expense({ amount: 1200 })], notifications: [{ ...over!, id: 'x' }] })).toHaveLength(0);
    // A different category, or uncategorised, never alerts.
    expect(computeBudgetAlerts({ ...base, expenseCategory: 'other', expenses: [expense({ amount: 5000 })] })).toHaveLength(0);
    expect(computeBudgetAlerts({ ...base, expenseCategory: '', expenses: [expense({ amount: 5000 })] })).toHaveLength(0);
    expect(getPeriodKey({ period: 'weekly' }, now)).toBe('2026-11-16');
  });
});

describe('categories', () => {
  const cats: Category[] = ['a', 'b', 'c'].map((id) => ({ id, name: id, type: 'expense', color: '#1d8d5f' }));
  it('falls back to the palette when colours collide, keeps unique ones', () => {
    const map = buildCategoryColorMap(cats);
    expect(new Set(map.values()).size).toBe(3);
    const mixed = buildCategoryColorMap([{ ...cats[0]!, color: '#123456' }, cats[1]!, cats[2]!]);
    expect(mixed.get('a')).toBe('#123456');
  });
  it('suggests the next unused palette colour', () => {
    expect(nextCategoryColor([])).toBe(CATEGORY_PALETTE[0]);
    expect(nextCategoryColor([{ ...cats[0]!, color: CATEGORY_PALETTE[0]! }])).toBe(CATEGORY_PALETTE[1]);
  });
  it('totals per category including an Uncategorized bucket', () => {
    const rows = totalsByCategory([expense({ category: 'a', amount: 5 }), expense({ category: 'a', amount: 7 }), expense({ category: '', amount: 3 })], cats, buildCategoryColorMap(cats));
    expect(rows.find((r) => r.id === 'a')).toMatchObject({ total: 12, count: 2 });
    expect(rows.at(-1)).toMatchObject({ name: 'Uncategorized', total: 3 });
  });
});

describe('csv', () => {
  it('quotes cells and escapes quotes', () => {
    expect(buildCsv([['a', 'b"c', 3]])).toBe('"a","b""c","3"');
  });
  it('neutralises spreadsheet formulas', () => {
    for (const bad of ['=SUM(A1)', '+1', '-1', '@cmd', '\tx']) expect(buildCsv([[bad]])).toBe(`"'${bad}"`);
    expect(buildCsv([['normal']])).toBe('"normal"');
  });
});

describe('formatters', () => {
  it('formats PHP by default and other currencies on request', () => {
    expect(createFormatters().money(1234.5)).toBe('₱1,234.50');
    expect(createFormatters('USD', 'en-US').money(5)).toBe('$5.00');
    expect(createFormatters().money(null)).toBe('₱0.00');
  });
  it('survives invalid currency/locale input', () => {
    expect(() => createFormatters('???', 'xx-invalid-locale').money(1)).not.toThrow();
  });
  it('formats dates without timezone drift and handles bad input', () => {
    const f = createFormatters();
    expect(f.date('2026-11-01', { day: 'numeric', month: 'short' })).toBe('Nov 1');
    expect(f.date(null)).toBe('—');
  });
});

describe('receipt parser', () => {
  const sample = `Kape Kabisera
Official Receipt No. 004281
Date: 21/11/2026
Iced latte x2   190.00
Subtotal        291.00
Total           ₱291.00
Cash            300.00`;
  it('extracts merchant, total, date and payment', () => {
    expect(parseReceiptText(sample)).toEqual({ isReceipt: true, merchant: 'Kape Kabisera', total: 291, date: '2026-11-21', paymentMethod: 'Cash' });
  });
  it('prefers the grand total over subtotal and ignores change', () => {
    const r = parseReceiptText('Store\nCashier Ann\nSubtotal 100.00\nGrand Total 112.00\nVisa 112.00\n2026-03-04');
    expect(r).toMatchObject({ isReceipt: true, total: 112, date: '2026-03-04', paymentMethod: 'Card' });
  });
  it('rejects text that is not a receipt', () => {
    expect(parseReceiptText('hello world')).toMatchObject({ isReceipt: false });
    expect(parseReceiptText('')).toMatchObject({ isReceipt: false });
    expect(parseReceiptText('Meeting notes\nbuy milk\ncall mom')).toMatchObject({ isReceipt: false });
  });
  it('reports a zero total so the UI can ask for the real one', () => {
    const r = parseReceiptText('Store Name\nOfficial Receipt\nCoffee 50.00\nTotal 0.00\nCash');
    expect(r).toMatchObject({ isReceipt: true, total: 0 });
  });
  it('does not treat a page with no amounts as a receipt', () => {
    expect(parseReceiptText('Store Name\nOfficial Receipt\nItems three\nCash\nTotal')).toMatchObject({ isReceipt: false });
  });
  it('normalises dates', () => {
    expect(normalizeDate('2026-01-02')).toBe('2026-01-02');
    expect(normalizeDate('11/21/2026')).toBe('2026-11-21');
    expect(normalizeDate('21-11-26')).toBe('2026-11-21');
    expect(normalizeDate('31/02/2026')).toBe(getLocalDateString()); // invalid -> today
  });
});
