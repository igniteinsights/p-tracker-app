import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { cycleHistory } from './history';
import { DEFAULT_SETTINGS, type NewEntry } from './types';

const sp = (date: string): NewEntry => ({ date, type: 'period-start' });
function startsEvery(first: string, gaps: number[]): NewEntry[] {
  const out = [sp(first)];
  let d = first;
  for (const g of gaps) { d = addDays(d, g); out.push(sp(d)); }
  return out;
}

const entries = [...startsEvery('2026-01-10', [65, 28, 26, 30, 28]), { date: '2026-08-30', type: 'period-end' } as NewEntry];
// starts: 01-10, 03-16 (65 days), 04-13, 05-09, 06-08, 07-06 (current)

describe('cycleHistory', () => {
  it('lists cycles newest first with lengths and flags', () => {
    const { rows } = cycleHistory(entries, DEFAULT_SETTINGS, '2026-07-20');
    expect(rows.map((r) => [r.start, r.length, r.flag, r.current])).toEqual([
      ['2026-07-06', null, null, true],
      ['2026-06-08', 28, null, false],
      ['2026-05-09', 30, null, false],
      ['2026-04-13', 26, null, false],
      ['2026-03-16', 28, null, false],
      ['2026-01-10', 65, 'long', false],
    ]);
  });

  it('summarises completed cycles and counts exclusions', () => {
    const settings = { ...DEFAULT_SETTINGS, excludedCycles: ['2026-05-09'] };
    const { rows, summary } = cycleHistory(entries, settings, '2026-07-20');
    expect(rows.find((r) => r.start === '2026-05-09')!.excluded).toBe(true);
    expect(summary).toEqual({ typical: 28, low: 28, high: 28, shortest: 26, longest: 65, completed: 5, excluded: 1 });
  });
});
