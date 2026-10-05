import { addDays, diffDays, formatDayMonth, formatShort, MONTHS, type ISODate } from '../../domain/dates';
import type { Prediction } from '../../domain/predict';

export type TileKind = 'period' | 'fertile' | 'ovulation' | 'past' | 'future' | 'today';

export interface Tile {
  day: number;
  date: ISODate;
  kind: TileKind;
}

export function ribbonTiles(p: Prediction): Tile[] {
  return Array.from({ length: p.cycleSpan }, (_, i) => {
    const day = i + 1;
    const date = addDays(p.lastStart, i);
    let kind: TileKind;
    if (day === p.cycleDay) kind = 'today';
    else if (day <= p.lastPeriodLength) kind = 'period';
    else if (date === p.ovulation) kind = 'ovulation';
    else if (date >= p.fertileStart && date <= p.fertileEnd) kind = 'fertile';
    else kind = day < p.cycleDay ? 'past' : 'future';
    return { day, date, kind };
  });
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function fullDate(d: ISODate): string {
  const [y, m, day] = d.split('-').map(Number);
  return `${day} ${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

export function rangeText(earliest: ISODate, latest: ISODate): string {
  if (earliest.slice(0, 7) === latest.slice(0, 7)) return `${Number(earliest.slice(8))}–${formatDayMonth(latest)}`;
  return `${formatDayMonth(earliest)} – ${formatDayMonth(latest)}`;
}

export function statusLine(p: Prediction): string {
  if (p.stale) return `No period logged since ${fullDate(p.lastStart)}.`;
  if (p.irregular) return 'Predictions are off for irregular cycles.';
  if (p.lateBy > 0) return `Period ${plural(p.lateBy, 'day')} late.`;
  const until = diffDays(p.nextStart, p.today);
  if (until === 0) return 'Period expected today.';
  if (until === 1) return 'Period expected tomorrow.';
  const likely = p.range ? ` (likely ${rangeText(p.range.earliest, p.range.latest)})` : '';
  return `Period expected in ${plural(until, 'day')}, around ${formatShort(p.nextStart)}${likely}.`;
}

export function fertileStatus(p: Prediction): string {
  if (p.today < p.fertileStart) return `Starts ${formatDayMonth(p.fertileStart)}`;
  if (p.today <= p.fertileEnd) return `Until ${formatDayMonth(p.fertileEnd)}`;
  return `Ended ${formatDayMonth(p.fertileEnd)}`;
}

export function ribbonLabel(p: Prediction): string {
  const fertile = fertileStatus(p).replace(/^\w/, (c) => c.toLowerCase());
  return `Day ${p.cycleDay} of ${p.avgCycle}. Fertile window ${fertile}. Open calendar.`;
}
