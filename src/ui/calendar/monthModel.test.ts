import { describe, expect, it } from 'vitest';
import { buildCalendarIndex, dayAriaLabel, dayInfo, monthCells, monthRange } from './monthModel';
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
    expect(dayAriaLabel('2026-10-03', info)).toBe('3 October 2026, fertile, note');
    expect(dayAriaLabel('2026-10-05', dayInfo('2026-10-05', idx, today))).toBe('5 October 2026, today');
  });

  it('shows no predictions for stale history', () => {
    const old: NewEntry[] = [{ date: '2024-03-21', type: 'period-start' }];
    const sp = predict(old, DEFAULT_SETTINGS, today);
    const sidx = buildCalendarIndex(old, sp, DEFAULT_SETTINGS, today);
    expect(sidx.predicted.size).toBe(0);
    expect(sidx.fertile.size).toBe(0);
  });
});
