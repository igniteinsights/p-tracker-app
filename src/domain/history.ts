import type { ISODate } from './dates';
import { buildCycles } from './cycles';
import { averageCycleLength, averagePeriodLength, periodLengthOf, typicalCycleRange } from './predict';
import { CYCLE_RANGE, type NewEntry, type Settings } from './types';

export interface CycleRow {
  start: ISODate;
  /** null for the current, unfinished cycle */
  length: number | null;
  periodLength: number;
  excluded: boolean;
  /** Outside the plausible 18–45 day range, so never used for predictions */
  flag: 'long' | 'short' | null;
  current: boolean;
}

export interface CycleSummary {
  typical: number;
  low: number;
  high: number;
  shortest: number | null;
  longest: number | null;
  completed: number;
  excluded: number;
}

export function cycleHistory(entries: readonly Pick<NewEntry, 'date' | 'type'>[], settings: Settings, today: ISODate) {
  const cycles = buildCycles(entries, today);
  const avgPeriod = averagePeriodLength(cycles, settings);
  const rows: CycleRow[] = cycles
    .map((c) => ({
      start: c.start,
      length: c.length,
      periodLength: periodLengthOf(c, avgPeriod),
      excluded: settings.excludedCycles.includes(c.start),
      flag: c.length === null ? null : c.length > CYCLE_RANGE.max ? ('long' as const) : c.length < CYCLE_RANGE.min ? ('short' as const) : null,
      current: c.length === null,
    }))
    .reverse();

  const counted = rows.filter((r) => !r.current && !r.excluded).map((r) => r.length!);
  const typical = averageCycleLength(cycles, settings);
  const range = typicalCycleRange(cycles, settings);
  const summary: CycleSummary = {
    typical,
    low: range?.low ?? typical,
    high: range?.high ?? typical,
    shortest: counted.length ? Math.min(...counted) : null,
    longest: counted.length ? Math.max(...counted) : null,
    completed: rows.filter((r) => !r.current).length,
    excluded: rows.filter((r) => r.excluded).length,
  };
  return { rows, summary };
}
