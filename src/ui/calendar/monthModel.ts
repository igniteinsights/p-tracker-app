import { addDays, daysInMonth, diffDays, MONTHS, pad2, weekdayIndex, type ISODate } from '../../domain/dates';
import { buildCycles } from '../../domain/cycles';
import { averagePeriodLength, periodLengthOf, upcomingPeriods, type Prediction } from '../../domain/predict';
import { CYCLE_RANGE, type NewEntry, type Settings, type TrackingType } from '../../domain/types';
import { isTrackingType, trackingSummary, TRACKING_TYPES } from '../../domain/tracking';

export interface MonthRef { year: number; month: number }

export const monthKey = (m: MonthRef) => `${m.year}-${pad2(m.month)}`;

export function monthCells(m: MonthRef): (ISODate | null)[] {
  const first = `${m.year}-${pad2(m.month)}-01`;
  const lead: null[] = Array(weekdayIndex(first)).fill(null);
  const days = Array.from({ length: daysInMonth(m.year, m.month) }, (_, i) => `${m.year}-${pad2(m.month)}-${pad2(i + 1)}`);
  return [...lead, ...days];
}

const toRef = (d: ISODate): MonthRef => ({ year: Number(d.slice(0, 4)), month: Number(d.slice(5, 7)) });

export function monthRange(entries: readonly Pick<NewEntry, 'date'>[], today: ISODate, ahead = 3): MonthRef[] {
  let first = today;
  for (const e of entries) if (e.date < first) first = e.date;
  const start = toRef(first);
  const end = toRef(today);
  const endIndex = end.year * 12 + end.month - 1 + ahead;
  const out: MonthRef[] = [];
  for (let i = start.year * 12 + start.month - 1; i <= endIndex; i++) {
    out.push({ year: Math.floor(i / 12), month: (i % 12) + 1 });
  }
  return out;
}

export interface CalendarIndex {
  period: Set<ISODate>;
  predicted: Set<ISODate>;
  fertile: Set<ISODate>;
  intimacy: Set<ISODate>;
  note: Set<ISODate>;
  /** Days in the likely range for the next start that aren't already predicted period days */
  possible: Set<ISODate>;
  /** Cycle stage of each day, where it can be estimated */
  phase: Map<ISODate, Phase>;
  /** Extra tracking values logged per day */
  tracked: Map<ISODate, Partial<Record<TrackingType, string>>>;
}

export type Phase = 'period' | 'follicular' | 'fertile' | 'ovulation' | 'luteal';

/** Ovulation belongs to the fertile run for banding and labels. */
export const phaseGroup = (p: Phase | null | undefined) => (p === 'ovulation' ? 'fertile' : p ?? null);

export const PHASE_NAMES: Record<Exclude<Phase, 'ovulation'>, string> = {
  period: 'Period',
  follicular: 'Follicular',
  fertile: 'Fertile',
  luteal: 'Luteal',
};

/** Shades one cycle: period days, then (for plausible lengths) follicular, fertile, ovulation and luteal. */
function shadeCycle(phase: Map<ISODate, Phase>, start: ISODate, next: ISODate, periodLength: number) {
  const set = (d: ISODate, p: Phase) => { if (!phase.has(d)) phase.set(d, p); };
  for (let i = 0; i < periodLength; i++) set(addDays(start, i), 'period');
  const length = diffDays(next, start);
  if (length < CYCLE_RANGE.min || length > CYCLE_RANGE.max) return;
  const ovulation = addDays(next, -14);
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);
  for (let d = addDays(start, periodLength); d < next; d = addDays(d, 1)) {
    set(d, d < fertileStart ? 'follicular' : d === ovulation ? 'ovulation' : d <= fertileEnd ? 'fertile' : 'luteal');
  }
}

function eachDay(start: ISODate, end: ISODate, fn: (d: ISODate) => void) {
  for (let d = start; d <= end; d = addDays(d, 1)) fn(d);
}

export function buildCalendarIndex(
  entries: readonly NewEntry[],
  prediction: Prediction | null,
  settings: Settings,
  today: ISODate,
): CalendarIndex {
  const idx: CalendarIndex = { period: new Set(), predicted: new Set(), fertile: new Set(), intimacy: new Set(), note: new Set(), possible: new Set(), phase: new Map(), tracked: new Map() };
  const showPredictions = !!prediction && !prediction.stale && !prediction.irregular;
  const cycles = buildCycles(entries, today);
  const avgPeriod = averagePeriodLength(cycles, settings);
  for (const c of cycles) {
    const len = periodLengthOf(c, avgPeriod);
    for (let i = 0; i < len; i++) {
      const d = addDays(c.start, i);
      if (d <= today) idx.period.add(d);
      else if (showPredictions) idx.predicted.add(d);
    }
  }
  // Stages: completed cycles from when the next period actually started
  for (const c of cycles) {
    if (c.next) shadeCycle(idx.phase, c.start, c.next, periodLengthOf(c, avgPeriod));
    else for (let i = 0; i < periodLengthOf(c, avgPeriod); i++) idx.phase.set(addDays(c.start, i), 'period');
  }
  if (prediction && showPredictions) {
    const upcoming = upcomingPeriods(prediction);
    // Current cycle up to the expected start; while late it stays luteal until today
    idx.phase.forEach((p, d) => { if (d >= prediction.lastStart && p !== 'period') idx.phase.delete(d); });
    shadeCycle(idx.phase, prediction.lastStart, prediction.nextStart, prediction.lastPeriodLength);
    for (let d = prediction.nextStart; prediction.lateBy > 0 && d < prediction.today; d = addDays(d, 1)) idx.phase.set(d, 'luteal');
    for (const p of upcoming) shadeCycle(idx.phase, p.start, addDays(p.start, prediction.avgCycle), prediction.avgPeriod);
    for (const p of upcoming) eachDay(p.start, p.end, (d) => { if (!idx.period.has(d)) idx.predicted.add(d); });
    if (prediction.range && prediction.lateBy === 0) {
      eachDay(prediction.range.earliest, prediction.range.latest, (d) => {
        if (d > today && !idx.predicted.has(d) && !idx.period.has(d)) idx.possible.add(d);
      });
    }
  }
  idx.phase.forEach((p, d) => { if (p === 'fertile' || p === 'ovulation') idx.fertile.add(d); });
  for (const e of entries) {
    if (e.type === 'intimacy') idx.intimacy.add(e.date);
    if (e.type === 'note') idx.note.add(e.date);
    if (isTrackingType(e.type) && e.value) idx.tracked.set(e.date, { ...idx.tracked.get(e.date), [e.type]: e.value });
  }
  return idx;
}

export interface DayInfo {
  period: boolean;
  predicted: boolean;
  fertile: boolean;
  intimacy: boolean;
  note: boolean;
  possible: boolean;
  phase: Phase | null;
  tracked: Partial<Record<TrackingType, string>> | null;
  today: boolean;
  future: boolean;
}

export function dayInfo(date: ISODate, idx: CalendarIndex, today: ISODate): DayInfo {
  return {
    period: idx.period.has(date),
    predicted: idx.predicted.has(date),
    fertile: idx.fertile.has(date),
    intimacy: idx.intimacy.has(date),
    note: idx.note.has(date),
    possible: idx.possible.has(date),
    phase: idx.phase.get(date) ?? null,
    tracked: idx.tracked.get(date) ?? null,
    today: date === today,
    future: date > today,
  };
}

export function dayAriaLabel(date: ISODate, info: DayInfo): string {
  const [y, m, d] = date.split('-').map(Number);
  const parts = [`${d} ${MONTHS[m - 1]} ${y}`];
  if (info.today) parts.push('today');
  if (info.period) parts.push('period');
  if (info.predicted) parts.push('predicted period');
  if (info.possible) parts.push('possible period start');
  if (info.phase === 'follicular') parts.push('follicular phase');
  if (info.phase === 'luteal') parts.push('luteal phase');
  if (info.phase === 'fertile') parts.push('fertile');
  if (info.phase === 'ovulation') parts.push('estimated ovulation');
  if (info.intimacy) parts.push('intimacy');
  for (const t of TRACKING_TYPES) if (info.tracked?.[t]) parts.push(trackingSummary(t, info.tracked[t]!));
  if (info.note) parts.push('note');
  return parts.join(', ');
}

export type CalendarFilter = 'all' | 'period' | 'intimacy' | 'notes';

export function matchesFilter(info: DayInfo, filter: CalendarFilter): boolean {
  switch (filter) {
    case 'period': return info.period || info.predicted;
    case 'intimacy': return info.intimacy;
    case 'notes': return info.note;
    default: return true;
  }
}

/** Logged days in the month that match the filter (predictions are not counted). */
export function filterCount(month: MonthRef, idx: CalendarIndex, today: ISODate, filter: CalendarFilter): number {
  return monthCells(month).filter((d): d is ISODate => {
    if (!d) return false;
    const info = dayInfo(d, idx, today);
    return filter === 'period' ? info.period : filter !== 'all' && matchesFilter(info, filter);
  }).length;
}
