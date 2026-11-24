import type { Category } from '@/types';
import { normalizeHex } from './color';

export const CATEGORY_PALETTE = [
  '#17805a',
  '#3b82c4',
  '#d9822b',
  '#8b5cf6',
  '#d1495b',
  '#14a3a3',
  '#c2a12f',
  '#e0679f',
  '#6b7f2a',
  '#5b6ee1',
];

export const UNCATEGORIZED_COLOR = '#8a948e';
export const UNCATEGORIZED_LABEL = 'Uncategorized';

/**
 * Colour per category id. Older data gave every category the same green, so
 * when colours collide we fall back to the palette to keep charts readable.
 */
export function buildCategoryColorMap(categories: Category[]): Map<string, string> {
  const counts = new Map<string, number>();
  for (const category of categories) {
    const hex = normalizeHex(category.color);
    if (hex) counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  const map = new Map<string, string>();
  categories.forEach((category, index) => {
    const hex = normalizeHex(category.color);
    map.set(category.id, hex && counts.get(hex) === 1 ? hex : CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]!);
  });
  return map;
}

export function nextCategoryColor(categories: Category[]): string {
  const used = new Set(categories.map((category) => normalizeHex(category.color)));
  return CATEGORY_PALETTE.find((color) => !used.has(color)) ?? CATEGORY_PALETTE[categories.length % CATEGORY_PALETTE.length]!;
}

export function getCategoryName(categoryId: string | null | undefined, categories: Category[]): string {
  if (!categoryId) return UNCATEGORIZED_LABEL;
  return categories.find((entry) => entry.id === categoryId || entry.name === categoryId)?.name ?? categoryId;
}

export interface CategoryTotal {
  id: string;
  name: string;
  color: string;
  total: number;
  count: number;
}

/** Sums `items` per category (including an "Uncategorized" bucket when needed). */
export function totalsByCategory<T extends { category: string; amount: number }>(
  items: T[],
  categories: Category[],
  colors: Map<string, string>,
): CategoryTotal[] {
  const rows: CategoryTotal[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    color: colors.get(category.id) ?? UNCATEGORIZED_COLOR,
    total: 0,
    count: 0,
  }));
  const byId = new Map(rows.map((row) => [row.id, row]));
  const loose: CategoryTotal = { id: '', name: UNCATEGORIZED_LABEL, color: UNCATEGORIZED_COLOR, total: 0, count: 0 };
  for (const item of items) {
    const row = byId.get(item.category) ?? loose;
    row.total += Number(item.amount || 0);
    row.count += 1;
  }
  if (loose.count > 0) rows.push(loose);
  return rows;
}
