export type ISODate = string;

const DAY_MS = 86_400_000;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export const pad2 = (n: number): string => String(n).padStart(2, '0');

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidISODate(s: string): boolean {
  const m = ISO_RE.exec(s);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
}

export function toUTC(d: ISODate): number {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day);
}

export function fromUTC(ms: number): ISODate {
  const x = new Date(ms);
  return `${x.getUTCFullYear()}-${pad2(x.getUTCMonth() + 1)}-${pad2(x.getUTCDate())}`;
}

export function addDays(d: ISODate, n: number): ISODate {
  return fromUTC(toUTC(d) + n * DAY_MS);
}

/** Whole days from b to a (a − b). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(a) - toUTC(b)) / DAY_MS);
}

export function todayISO(now: Date = new Date()): ISODate {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** 0 = Monday … 6 = Sunday */
export function weekdayIndex(d: ISODate): number {
  return (new Date(toUTC(d)).getUTCDay() + 6) % 7;
}

function parts(d: ISODate) {
  const [y, m, day] = d.split('-').map(Number);
  return { year: y, month: m, day };
}

export function formatLong(d: ISODate, withYear = false): string {
  const { year, month, day } = parts(d);
  const base = `${WEEKDAYS[weekdayIndex(d)]} ${day} ${MONTHS[month - 1]}`;
  return withYear ? `${base} ${year}` : base;
}

export function formatShort(d: ISODate): string {
  const { month, day } = parts(d);
  return `${WEEKDAYS[weekdayIndex(d)].slice(0, 3)} ${day} ${MONTHS[month - 1].slice(0, 3)}`;
}

export function formatDayMonth(d: ISODate): string {
  const { month, day } = parts(d);
  return `${day} ${MONTHS[month - 1].slice(0, 3)}`;
}

export function formatMonthYear(d: ISODate): string {
  const { year, month } = parts(d);
  return `${MONTHS[month - 1].slice(0, 3)} ${year}`;
}
