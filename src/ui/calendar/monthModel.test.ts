import { describe, expect, it } from 'vitest';
import { buildCalendarIndex, dayAriaLabel, dayInfo, filterCount, matchesFilter, monthCells, monthRange } from './monthModel';
import { addDays } from '../../domain/dates';
import { predict } from '../../domain/predict';
import { DEFAULT_SETTINGS, type NewEntry } from '../../domain/types';

const entries: NewEntry[] = [
  { date: '2026-08-22', type: 'period-start' },
  { date: '2026-09-19', type: 'period-start' },
  { date: '2026-09-23', type: 'period-end' },
  { date: '2026-10-02', type: 'intimacy' },
  { date: '2026-10-03', type: 'note', text: 'x' },
];
const today = '2026-10-05';

describe('monthCells', () => {
  it('pads October 2026 to start on Thursday', () => {
    const cells = monthCells({ year: 2026, month: 10 });
    expect(cells.slice(0, 4)).toEqual([null, null, null, '2026-10-01']);
    expect(cells.at(-1)).toBe('2026-10-31');
    expect(cells).toHaveLength(34);
  });
});

describe('monthRange', () => {
  it('runs from the first entry to three months after today', () => {
    const r = monthRange(entries, today);
    expect(r[0]).toEqual({ year: 2026, month: 8 });
    expect(r.at(-1)).toEqual({ year: 2027, month: 1 });
    expect(r).toHaveLength(6);
  });
  it('shows the current month when there is no data', () => {
    expect(monthRange([], today, 0)).toEqual([{ year: 2026, month: 10 }]);
  });
});

describe('buildCalendarIndex', () => {
  const p = predict(entries, DEFAULT_SETTINGS, today);
  const idx = buildCalendarIndex(entries, p, DEFAULT_SETTINGS, today);

  it('shades logged periods using explicit ends or the average', () => {
    expect(idx.period.has('2026-09-23')).toBe(true);
    expect(idx.period.has('2026-09-24')).toBe(false);
    expect(idx.period.has('2026-08-22')).toBe(true);
  });

  it('marks predicted periods and the current fertile window', () => {
    expect(idx.predicted.has('2026-10-17')).toBe(true);
    expect(idx.fertile.has('2026-10-01')).toBe(true);
  });

  it('describes a day for screen readers', () => {
    const info = dayInfo('2026-10-03', idx, today);
    expect(dayAriaLabel('2026-10-03', info)).toBe('3 October 2026, estimated ovulation, note');
    expect(dayAriaLabel('2026-10-05', dayInfo('2026-10-05', idx, today))).toBe('5 October 2026, today, luteal phase');
  });

  it('shows no predictions for stale history', () => {
    const old: NewEntry[] = [{ date: '2024-03-21', type: 'period-start' }];
    const sp = predict(old, DEFAULT_SETTINGS, today);
    const sidx = buildCalendarIndex(old, sp, DEFAULT_SETTINGS, today);
    expect(sidx.predicted.size).toBe(0);
    expect(sidx.fertile.size).toBe(0);
  });
});

describe('possible start days', () => {
  it('outlines the likely range around the next start without replacing predicted days', () => {
    const starts: NewEntry[] = [];
    let d = '2026-04-01';
    starts.push({ date: d, type: 'period-start' });
    for (const g of [26, 27, 28, 28, 29, 31]) { d = addDays(d, g); starts.push({ date: d, type: 'period-start' }); }
    const p = predict(starts, DEFAULT_SETTINGS, today)!; // next 15 Oct, likely 14–16 Oct
    const idx = buildCalendarIndex(starts, p, DEFAULT_SETTINGS, today);
    expect([...idx.possible]).toEqual(['2026-10-14']);
    expect(idx.predicted.has('2026-10-15')).toBe(true);
    expect(dayAriaLabel('2026-10-14', dayInfo('2026-10-14', idx, today))).toBe('14 October 2026, possible period start, luteal phase');
  });
});

describe('calendar filters', () => {
  const p = predict(entries, DEFAULT_SETTINGS, today);
  const idx = buildCalendarIndex(entries, p, DEFAULT_SETTINGS, today);

  it('matches days for each filter', () => {
    expect(matchesFilter(dayInfo('2026-10-02', idx, today), 'intimacy')).toBe(true);
    expect(matchesFilter(dayInfo('2026-10-03', idx, today), 'intimacy')).toBe(false);
    expect(matchesFilter(dayInfo('2026-10-03', idx, today), 'notes')).toBe(true);
    expect(matchesFilter(dayInfo('2026-09-20', idx, today), 'period')).toBe(true);
    expect(matchesFilter(dayInfo('2026-10-17', idx, today), 'period')).toBe(true); // predicted
  });

  it('counts logged days per month, not predictions', () => {
    expect(filterCount({ year: 2026, month: 10 }, idx, today, 'intimacy')).toBe(1);
    expect(filterCount({ year: 2026, month: 9 }, idx, today, 'period')).toBe(5);
    expect(filterCount({ year: 2026, month: 10 }, idx, today, 'period')).toBe(0);
  });
});

describe('cycle stages', () => {
  const p = predict(entries, DEFAULT_SETTINGS, today);
  const idx = buildCalendarIndex(entries, p, DEFAULT_SETTINGS, today);
  const run = (from: string, to: string) => {
    const out = new Set<string | undefined>();
    for (let d = from; d <= to; d = addDays(d, 1)) out.add(idx.phase.get(d));
    return [...out];
  };

  it('estimates stages for a past cycle from when the next period started', () => {
    expect(run('2026-08-22', '2026-08-26')).toEqual(['period']);
    expect(run('2026-08-27', '2026-08-30')).toEqual(['follicular']);
    expect(run('2026-08-31', '2026-09-04')).toEqual(['fertile']);
    expect(idx.phase.get('2026-09-05')).toBe('ovulation');
    expect(run('2026-09-07', '2026-09-18')).toEqual(['luteal']);
  });

  it('predicts stages for the current and next cycles', () => {
    expect(run('2026-09-19', '2026-09-23')).toEqual(['period']);
    expect(run('2026-09-24', '2026-09-27')).toEqual(['follicular']);
    expect(idx.phase.get('2026-10-03')).toBe('ovulation');
    expect(run('2026-10-05', '2026-10-16')).toEqual(['luteal']);
    expect(run('2026-10-17', '2026-10-21')).toEqual(['period']);
    expect(run('2026-10-22', '2026-10-25')).toEqual(['follicular']);
    expect(idx.phase.get('2026-10-26')).toBe('fertile');
  });

  it('only shades period days when predictions are off', () => {
    const settings = { ...DEFAULT_SETTINGS, irregular: true };
    const irr = buildCalendarIndex(entries, predict(entries, settings, today), settings, today);
    expect(irr.phase.get('2026-09-20')).toBe('period');
    expect(irr.phase.get('2026-10-05')).toBeUndefined();
    expect(irr.phase.get('2026-09-07')).toBe('luteal'); // past completed cycles are still known
  });

  it('only shades period days for implausibly long cycles', () => {
    const gap: NewEntry[] = [{ date: '2026-03-01', type: 'period-start' }, { date: '2026-06-01', type: 'period-start' }];
    const g = buildCalendarIndex(gap, predict(gap, DEFAULT_SETTINGS, '2026-06-10'), DEFAULT_SETTINGS, '2026-06-10');
    expect(g.phase.get('2026-03-02')).toBe('period');
    expect(g.phase.get('2026-04-15')).toBeUndefined();
  });

  it('keeps the current cycle in its luteal stage while a period is late', () => {
    const late = predict(entries, DEFAULT_SETTINGS, '2026-10-20')!;
    const l = buildCalendarIndex(entries, late, DEFAULT_SETTINGS, '2026-10-20');
    expect(l.phase.get('2026-10-18')).toBe('luteal');
    expect(l.phase.get('2026-10-20')).toBe('period'); // predicted from today
  });
});
