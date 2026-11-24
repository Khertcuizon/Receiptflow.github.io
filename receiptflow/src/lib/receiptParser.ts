import { getLocalDateString } from './dates';

export type ParsedReceipt =
  | { isReceipt: false; reason: string }
  | { isReceipt: true; merchant: string; total: number; date: string; paymentMethod: 'Card' | 'Cash' };

const AMOUNT_PATTERN = /(?:₱|php\s*)\d[\d,]*(?:\.\d{1,2})?|\d[\d,]*\.\d{1,2}/gi;
const DATE_PATTERN = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/;

function amountsIn(value: string): number[] {
  return [...value.matchAll(AMOUNT_PATTERN)]
    .map((match) => Number(match[0].replace(/[₱,\s]|php/gi, '')))
    .filter((amount) => Number.isFinite(amount) && amount > 0);
}

/** Turns OCR text into receipt fields, or explains why it does not look like a receipt. */
export function parseReceiptText(text: string): ParsedReceipt {
  const source = String(text || '').replace(/\u00a0/g, ' ');
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const normalized = source.toLowerCase();

  const totalLine = lines.find(
    (line) =>
      /\b(grand\s+total|total\s+due|amount\s+due|balance\s+due|total)\b/i.test(line) &&
      !/\b(subtotal|taxable total)\b/i.test(line),
  );
  const totalAmounts = totalLine ? amountsIn(totalLine) : [];
  if (!totalAmounts.length && totalLine) {
    const integerTotal = totalLine.match(/(\d[\d,]*(?:\.\d{1,2})?)\s*$/);
    if (integerTotal?.[1]) totalAmounts.push(Number(integerTotal[1].replace(/,/g, '')));
  }
  const allAmounts = amountsIn(source);
  const total = totalAmounts.length
    ? totalAmounts[totalAmounts.length - 1]!
    : allAmounts.length
      ? Math.max(...allAmounts)
      : 0;

  const receiptSignals = [
    /\b(receipt|invoice|tax invoice|official receipt|sales invoice|cashier|transaction|subtotal|grand total|amount due|balance due)\b/i.test(normalized),
    /\b(qty|quantity|unit price|description|items?)\b/i.test(normalized),
    /\b(cash|change|visa|mastercard|amex|debit|credit|payment method)\b/i.test(normalized),
    Boolean(totalLine),
    allAmounts.length >= 2,
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/.test(source),
  ];
  const evidenceCount = receiptSignals.filter(Boolean).length;
  const hasAmount = allAmounts.length > 0 || totalAmounts.length > 0;
  const isReceipt = lines.length >= 3 && hasAmount && ((Boolean(totalLine) && evidenceCount >= 2) || evidenceCount >= 4);

  if (!isReceipt) {
    return {
      isReceipt: false,
      reason: 'This image does not look like a receipt. Use a clear receipt image with item details and a total.',
    };
  }

  const excludedMerchantLine =
    /\b(receipt|invoice|tax|subtotal|total|amount|balance|cashier|transaction|date|time|qty|quantity|description|item|cash|change|visa|mastercard|debit|credit|phone|tel|address|thank)\b/i;
  const merchant =
    lines
      .slice(0, 8)
      .find(
        (line) =>
          /[A-Za-z]/.test(line) &&
          line.replace(/[^A-Za-z]/g, '').length >= 3 &&
          !excludedMerchantLine.test(line) &&
          !/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(line),
      ) ?? '';

  const dateMatch = source.match(DATE_PATTERN);
  const paymentMethod = /visa|mastercard|amex|debit|credit|card/i.test(source)
    ? 'Card'
    : /cash|wallet/i.test(source)
      ? 'Cash'
      : 'Card';

  return {
    isReceipt: true,
    merchant,
    total,
    date: dateMatch?.[1] ? normalizeDate(dateMatch[1]) : getLocalDateString(),
    paymentMethod,
  };
}

/** Normalises YYYY-MM-DD, MM/DD/YYYY and DD/MM/YYYY (when the first part is > 12) to YYYY-MM-DD. */
export function normalizeDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [first = 0, second = 0, yearPart = 0] = value.split(/[/-]/).map(Number);
  const year = yearPart < 100 ? (yearPart >= 70 ? 1900 + yearPart : 2000 + yearPart) : yearPart;
  const month = first > 12 ? second : first;
  const day = first > 12 ? first : second;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return getLocalDateString();
  }
  return date.toISOString().slice(0, 10);
}
