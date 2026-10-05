import { addDays, diffDays, MONTHS, type ISODate } from '../../domain/dates';
import type { CycleRow } from '../../domain/history';
import type { Prediction, PredictionRange } from '../../domain/predict';

export interface ComingUp {
  period: { date: ISODate; inDays: number; late: number; range: PredictionRange | null } | null;
  fertile: { start: ISODate; end: ISODate; inDays: number; now: boolean } | null;
  last: { date: ISODate; length: number };
}

export function comingUp(p: Prediction): ComingUp {
  const last = { date: p.lastStart, length: p.lastPeriodLength };
  if (p.irregular || p.stale) return { period: null, fertile: null, last };
  if (p.lateBy > 0) return { period: { date: p.nextStart, inDays: 0, late: p.lateBy, range: p.range }, fertile: null, last };

  const period = { date: p.nextStart, inDays: diffDays(p.nextStart, p.today), late: 0, range: p.range };
  let fertile: ComingUp['fertile'];
  if (p.today < p.fertileStart) {
    fertile = { start: p.fertileStart, end: p.fertileEnd, inDays: diffDays(p.fertileStart, p.today), now: false };
  } else if (p.today <= p.fertileEnd) {
    fertile = { start: p.fertileStart, end: p.fertileEnd, inDays: 0, now: true };
  } else {
    // This cycle's window has passed: estimate the next cycle's
    const ovulation = addDays(p.nextStart, p.avgCycle - 14);
    const start = addDays(ovulation, -5);
    fertile = { start, end: addDays(ovulation, 1), inDays: diffDays(start, p.today), now: false };
  }
  return { period, fertile, last };
}

export interface Bar {
  start: ISODate;
  length: number;
  label: string;
  current: boolean;
  excluded: boolean;
}

/** The last `count` completed cycles, oldest first, then the current cycle so far. */
export function recentBars(rows: readonly CycleRow[], today: ISODate, count = 8): Bar[] {
  const completed = rows.filter((r) => !r.current);
  if (completed.length < 2) return [];
  const label = (d: ISODate) => MONTHS[Number(d.slice(5, 7)) - 1].slice(0, 3);
  const bars: Bar[] = completed
    .slice(0, count)
    .reverse()
    .map((r) => ({ start: r.start, length: r.length!, label: label(r.start), current: false, excluded: r.excluded }));
  const current = rows.find((r) => r.current);
  if (current) bars.push({ start: current.start, length: diffDays(today, current.start) + 1, label: 'Now', current: true, excluded: false });
  return bars;
}
