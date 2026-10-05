import { addDays, daysInMonth, MONTHS, pad2, weekdayIndex, type ISODate } from '../../domain/dates';
import { buildCycles } from '../../domain/cycles';
import { averagePeriodLength, periodLengthOf, upcomingPeriods, type Prediction } from '../../domain/predict';
import type { NewEntry, Settings } from '../../domain/types';

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
  const idx: CalendarIndex = { period: new Set(), predicted: new Set(), fertile: new Set(), intimacy: new Set(), note: new Set() };
  const cycles = buildCycles(entries, today);
  const avgPeriod = averagePeriodLength(cycles, settings);
  for (const c of cycles) {
    const len = periodLengthOf(c, avgPeriod);
    for (let i = 0; i < len; i++) {
      const d = addDays(c.start, i);
      if (d <= today) idx.period.add(d);
      else if (!prediction?.stale) idx.predicted.add(d);
    }
  }
  if (prediction && !prediction.stale) {
    for (const p of upcomingPeriods(prediction)) eachDay(p.start, p.end, (d) => { if (!idx.period.has(d)) idx.predicted.add(d); });
    eachDay(prediction.fertileStart, prediction.fertileEnd, (d) => idx.fertile.add(d));
  }
  for (const e of entries) {
    if (e.type === 'intimacy') idx.intimacy.add(e.date);
    if (e.type === 'note') idx.note.add(e.date);
  }
  return idx;
}

export interface DayInfo {
  period: boolean;
  predicted: boolean;
  fertile: boolean;
  intimacy: boolean;
  note: boolean;
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
  if (info.fertile) parts.push('fertile');
  if (info.intimacy) parts.push('intimacy');
  if (info.note) parts.push('note');
  return parts.join(', ');
}
