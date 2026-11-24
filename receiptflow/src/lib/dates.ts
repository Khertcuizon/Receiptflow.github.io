const pad = (n: number) => String(n).padStart(2, '0');

export function getLocalDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses "YYYY-MM-DD" as a *local* date (new Date("YYYY-MM-DD") would be UTC). */
export function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match && value.length === 10) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Monday of the week containing `date`, as YYYY-MM-DD. */
export function getWeekStart(date: Date = new Date()): string {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return getLocalDateString(start);
}

/** "YYYY-MM" for the given date. */
export function getMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [year = 1970, month = 1] = monthKey.split('-').map(Number);
  return getMonthKey(new Date(year, month - 1 + delta, 1));
}

export function monthKeyToDate(monthKey: string): Date {
  const [year = 1970, month = 1] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

/** The last `count` calendar days ending at `end`, oldest first. */
export function lastDays(count: number, end: Date = new Date()): string[] {
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    days.push(getLocalDateString(new Date(end.getFullYear(), end.getMonth(), end.getDate() - i)));
  }
  return days;
}

/** The last `count` month keys ending at `end`, oldest first. */
export function lastMonths(count: number, end: Date = new Date()): string[] {
  const months: string[] = [];
  const endKey = getMonthKey(end);
  for (let i = count - 1; i >= 0; i -= 1) months.push(shiftMonth(endKey, -i));
  return months;
}

export function greeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
