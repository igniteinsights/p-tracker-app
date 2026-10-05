import { diffDays, type ISODate } from './dates';
import type { NewEntry } from './types';

export interface Cycle {
  start: ISODate;
  next: ISODate | null;
  length: number | null;
  periodEnd: ISODate | null;
}

export const TOO_SOON_DAYS = 10;

type DatedEntry = Pick<NewEntry, 'date' | 'type'>;

function uniqueSortedDates(entries: readonly DatedEntry[], type: NewEntry['type'], today: ISODate): ISODate[] {
  return [...new Set(entries.filter((e) => e.type === type && e.date <= today).map((e) => e.date))].sort();
}

export function buildCycles(entries: readonly DatedEntry[], today: ISODate): Cycle[] {
  const starts = uniqueSortedDates(entries, 'period-start', today);
  const ends = uniqueSortedDates(entries, 'period-end', today);
  return starts.map((start, i) => {
    const next = starts[i + 1] ?? null;
    const periodEnd = ends.find((e) => e >= start && (next === null || e < next)) ?? null;
    return { start, next, length: next ? diffDays(next, start) : null, periodEnd };
  });
}

/** Days to the closest other period start within TOO_SOON_DAYS, or null. */
export function nearbyStartGap(entries: readonly DatedEntry[], date: ISODate): number | null {
  let best: number | null = null;
  for (const e of entries) {
    if (e.type !== 'period-start' || e.date === date) continue;
    const gap = Math.abs(diffDays(date, e.date));
    if (gap < TOO_SOON_DAYS && (best === null || gap < best)) best = gap;
  }
  return best;
}
