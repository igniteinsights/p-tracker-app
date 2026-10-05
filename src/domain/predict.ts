import { addDays, diffDays, type ISODate } from './dates';
import { buildCycles, type Cycle } from './cycles';
import { CYCLE_RANGE, PERIOD_RANGE, type NewEntry, type Settings } from './types';

export const STALE_DAYS = 60;
const RECENT_CYCLES = 12;
const MIN_CYCLES_FOR_AUTO = 3;

export interface Prediction {
  today: ISODate;
  lastStart: ISODate;
  cycleDay: number;
  avgCycle: number;
  avgPeriod: number;
  lastPeriodLength: number;
  nextStart: ISODate;
  ovulation: ISODate;
  fertileStart: ISODate;
  fertileEnd: ISODate;
  predictedPeriodEnd: ISODate;
  lateBy: number;
  cyclesLogged: number;
  /** Ribbon length: max(avgCycle, cycleDay) */
  cycleSpan: number;
  /** No period logged for more than STALE_DAYS; predictions are not meaningful. */
  stale: boolean;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function averageCycleLength(cycles: readonly Cycle[], settings: Settings): number {
  if (settings.cycleLength.mode === 'fixed') return settings.cycleLength.value;
  const plausible = cycles
    .map((c) => c.length)
    .filter((l): l is number => l !== null && l >= CYCLE_RANGE.min && l <= CYCLE_RANGE.max)
    .slice(-RECENT_CYCLES);
  if (plausible.length < MIN_CYCLES_FOR_AUTO) return CYCLE_RANGE.fallback;
  return Math.round(median(plausible));
}

export function averagePeriodLength(cycles: readonly Cycle[], settings: Settings): number {
  if (settings.periodLength.mode === 'fixed') return settings.periodLength.value;
  const lengths = cycles
    .filter((c) => c.periodEnd !== null)
    .map((c) => diffDays(c.periodEnd!, c.start) + 1)
    .filter((l) => l >= PERIOD_RANGE.min && l <= PERIOD_RANGE.max);
  if (!lengths.length) return PERIOD_RANGE.fallback;
  return Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
}

export function periodLengthOf(cycle: Cycle, avgPeriod: number): number {
  if (cycle.periodEnd) return Math.max(1, diffDays(cycle.periodEnd, cycle.start) + 1);
  return Math.min(avgPeriod, cycle.length ?? Infinity);
}

export function predict(entries: readonly Pick<NewEntry, 'date' | 'type'>[], settings: Settings, today: ISODate): Prediction | null {
  const cycles = buildCycles(entries, today);
  const last = cycles.at(-1);
  if (!last) return null;
  const avgCycle = averageCycleLength(cycles, settings);
  const avgPeriod = averagePeriodLength(cycles, settings);
  const nextStart = addDays(last.start, avgCycle);
  const ovulation = addDays(nextStart, -14);
  const cycleDay = diffDays(today, last.start) + 1;
  return {
    today,
    lastStart: last.start,
    cycleDay,
    avgCycle,
    avgPeriod,
    lastPeriodLength: periodLengthOf(last, avgPeriod),
    nextStart,
    ovulation,
    fertileStart: addDays(ovulation, -5),
    fertileEnd: addDays(ovulation, 1),
    predictedPeriodEnd: addDays(nextStart, avgPeriod - 1),
    lateBy: Math.max(0, diffDays(today, nextStart)),
    cyclesLogged: cycles.length,
    cycleSpan: Math.max(avgCycle, cycleDay),
    stale: cycleDay > STALE_DAYS,
  };
}

export function upcomingPeriods(p: Prediction, count = 3): { start: ISODate; end: ISODate }[] {
  if (p.stale) return [];
  const base = p.lateBy > 0 ? p.today : p.nextStart;
  return Array.from({ length: count }, (_, k) => {
    const start = addDays(base, k * p.avgCycle);
    return { start, end: addDays(start, p.avgPeriod - 1) };
  });
}
