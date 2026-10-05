import { describe, expect, it } from 'vitest';
import { comingUp, recentBars } from './comingUp';
import type { Prediction } from '../../domain/predict';
import type { CycleRow } from '../../domain/history';

const p: Prediction = {
  today: '2026-10-05', lastStart: '2026-09-19', cycleDay: 17, avgCycle: 28, avgPeriod: 5, lastPeriodLength: 5,
  nextStart: '2026-10-17', ovulation: '2026-10-03', fertileStart: '2026-09-28', fertileEnd: '2026-10-04',
  predictedPeriodEnd: '2026-10-21', lateBy: 0, cyclesLogged: 42, cycleSpan: 28, stale: false, range: null, irregular: false,
};

describe('comingUp', () => {
  it('counts down to the next period', () => {
    expect(comingUp(p).period).toEqual({ date: '2026-10-17', inDays: 12, late: 0, range: null });
  });

  it('points to the next cycle\'s fertile window once this one has passed', () => {
    expect(comingUp(p).fertile).toEqual({ start: '2026-10-26', end: '2026-11-01', inDays: 21, now: false });
  });

  it('marks the fertile window as now while it is happening', () => {
    expect(comingUp({ ...p, today: '2026-09-30', cycleDay: 12 }).fertile).toEqual({ start: '2026-09-28', end: '2026-10-04', inDays: 0, now: true });
  });

  it('shows a late period and no fertile window when late', () => {
    const c = comingUp({ ...p, today: '2026-10-20', lateBy: 3 });
    expect(c.period).toEqual({ date: '2026-10-17', inDays: 0, late: 3, range: null });
    expect(c.fertile).toBeNull();
  });

  it('predicts nothing for irregular or stale history but keeps the last period', () => {
    for (const q of [{ ...p, irregular: true }, { ...p, stale: true }]) {
      const c = comingUp(q);
      expect(c.period).toBeNull();
      expect(c.fertile).toBeNull();
      expect(c.last).toEqual({ date: '2026-09-19', length: 5 });
    }
  });
});

describe('recentBars', () => {
  const row = (start: string, length: number | null, extra: Partial<CycleRow> = {}): CycleRow =>
    ({ start, length, periodLength: 5, excluded: false, flag: null, current: length === null, ...extra });

  it('takes the last completed cycles oldest first, then the current cycle so far', () => {
    const rows = [row('2026-09-19', null), ...Array.from({ length: 10 }, (_, i) => row(`2026-0${(i % 8) + 1}-01`, 26 + i))];
    const bars = recentBars(rows, '2026-10-05', 8);
    expect(bars).toHaveLength(9);
    expect(bars[0].length).toBe(33);
    expect(bars[7].length).toBe(26);
    expect(bars[8]).toMatchObject({ current: true, length: 17 });
  });

  it('needs at least two completed cycles', () => {
    expect(recentBars([row('2026-09-19', null), row('2026-08-22', 28)], '2026-10-05')).toEqual([]);
  });
});
