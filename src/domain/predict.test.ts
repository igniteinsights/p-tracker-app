import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { buildCycles } from './cycles';
import { averageCycleLength, averagePeriodLength, predict, upcomingPeriods } from './predict';
import { DEFAULT_SETTINGS, type NewEntry, type Settings } from './types';

const sp = (date: string): NewEntry => ({ date, type: 'period-start' });
function startsEvery(first: string, gaps: number[]): NewEntry[] {
  const out = [sp(first)];
  let d = first;
  for (const g of gaps) { d = addDays(d, g); out.push(sp(d)); }
  return out;
}

describe('averageCycleLength', () => {
  it('uses the median of plausible cycles and ignores gaps', () => {
    const es = startsEvery('2025-01-01', [28, 31, 79, 24, 28, 52, 27, 29]);
    const cycles = buildCycles(es, '2026-10-05');
    expect(averageCycleLength(cycles, DEFAULT_SETTINGS)).toBe(28);
  });

  it('only looks at the most recent 12 plausible cycles', () => {
    const es = startsEvery('2020-01-01', [...Array(12).fill(40), ...Array(12).fill(26)]);
    expect(averageCycleLength(buildCycles(es, '2026-10-05'), DEFAULT_SETTINGS)).toBe(26);
  });

  it('falls back to 28 with fewer than 3 plausible cycles', () => {
    const cycles = buildCycles(startsEvery('2026-06-01', [30, 31]), '2026-10-05');
    expect(averageCycleLength(cycles, DEFAULT_SETTINGS)).toBe(28);
  });

  it('honours a fixed setting', () => {
    const s: Settings = { ...DEFAULT_SETTINGS, cycleLength: { mode: 'fixed', value: 31 } };
    expect(averageCycleLength([], s)).toBe(31);
  });
});

describe('averagePeriodLength', () => {
  it('averages explicit period lengths and falls back to 5', () => {
    const withEnds = buildCycles(
      [sp('2026-08-01'), { date: '2026-08-04', type: 'period-end' }, sp('2026-08-29'), { date: '2026-09-02', type: 'period-end' }, sp('2026-09-26')],
      '2026-10-05',
    );
    expect(averagePeriodLength(withEnds, DEFAULT_SETTINGS)).toBe(5); // (4 + 5) / 2 = 4.5 → 5
    expect(averagePeriodLength(buildCycles([sp('2026-09-26')], '2026-10-05'), DEFAULT_SETTINGS)).toBe(5);
  });
});

describe('predict', () => {
  const es = startsEvery('2026-05-02', [28, 28, 28, 28, 28]); // last start 2026-09-19

  it('returns null with no period starts', () => {
    expect(predict([], DEFAULT_SETTINGS, '2026-10-05')).toBeNull();
  });

  it('predicts the mockup day', () => {
    const p = predict(es, DEFAULT_SETTINGS, '2026-10-05')!;
    expect(p.lastStart).toBe('2026-09-19');
    expect(p.cycleDay).toBe(17);
    expect(p.avgCycle).toBe(28);
    expect(p.nextStart).toBe('2026-10-17');
    expect(p.ovulation).toBe('2026-10-03');
    expect(p.fertileStart).toBe('2026-09-28');
    expect(p.fertileEnd).toBe('2026-10-04');
    expect(p.predictedPeriodEnd).toBe('2026-10-21');
    expect(p.lateBy).toBe(0);
    expect(p.cycleSpan).toBe(28);
    expect(p.cyclesLogged).toBe(6);
    expect(p.stale).toBe(false);
  });

  it('is not late on the expected day, then counts late days', () => {
    expect(predict(es, DEFAULT_SETTINGS, '2026-10-17')!.lateBy).toBe(0);
    const late = predict(es, DEFAULT_SETTINGS, '2026-10-20')!;
    expect(late.lateBy).toBe(3);
    expect(late.cycleSpan).toBe(32);
  });

  it('marks history older than 60 days as stale', () => {
    const p = predict([sp('2024-03-21')], DEFAULT_SETTINGS, '2026-10-05')!;
    expect(p.stale).toBe(true);
    expect(upcomingPeriods(p)).toEqual([]);
  });

  it('never yields a negative cycle day for future-dated starts', () => {
    const p = predict([...es, sp('2026-12-25')], DEFAULT_SETTINGS, '2026-10-05')!;
    expect(p.cycleDay).toBe(17);
  });
});

describe('upcomingPeriods', () => {
  it('returns the next three predicted periods', () => {
    const p = predict(startsEvery('2026-05-02', [28, 28, 28, 28, 28]), DEFAULT_SETTINGS, '2026-10-05')!;
    expect(upcomingPeriods(p)).toEqual([
      { start: '2026-10-17', end: '2026-10-21' },
      { start: '2026-11-14', end: '2026-11-18' },
      { start: '2026-12-12', end: '2026-12-16' },
    ]);
  });

  it('starts from today when late', () => {
    const p = predict(startsEvery('2026-05-02', [28, 28, 28, 28, 28]), DEFAULT_SETTINGS, '2026-10-20')!;
    expect(upcomingPeriods(p, 1)).toEqual([{ start: '2026-10-20', end: '2026-10-24' }]);
  });
});

describe('excluded cycles', () => {
  it('leaves excluded cycles out of the average', () => {
    const es = startsEvery('2026-01-01', [30, 30, 40, 40, 40]);
    const cycles = buildCycles(es, '2026-10-05');
    expect(averageCycleLength(cycles, DEFAULT_SETTINGS)).toBe(40);
    const excludedCycles = [cycles[2].start, cycles[3].start];
    expect(averageCycleLength(cycles, { ...DEFAULT_SETTINGS, excludedCycles })).toBe(30);
  });
});

describe('prediction range', () => {
  it('gives the middle half of recent cycle lengths when they vary', () => {
    const es = startsEvery('2026-04-01', [26, 27, 28, 28, 29, 31]); // last start 2026-09-17
    const p = predict(es, DEFAULT_SETTINGS, '2026-10-05')!;
    expect(p.avgCycle).toBe(28);
    expect(p.range).toEqual({ low: 27, high: 29, earliest: '2026-10-14', latest: '2026-10-16' });
  });

  it('has no range when cycles are steady or the length is fixed', () => {
    const steady = startsEvery('2026-05-02', [28, 28, 28, 28, 28]);
    expect(predict(steady, DEFAULT_SETTINGS, '2026-10-05')!.range).toBeNull();
    const varied = startsEvery('2026-04-01', [24, 27, 28, 28, 30, 33]);
    const fixed = { ...DEFAULT_SETTINGS, cycleLength: { mode: 'fixed' as const, value: 28 } };
    expect(predict(varied, fixed, '2026-10-05')!.range).toBeNull();
  });
});

describe('irregular cycles switch', () => {
  it('turns predictions off', () => {
    const p = predict(startsEvery('2026-05-02', [28, 28, 28, 28, 28]), { ...DEFAULT_SETTINGS, irregular: true }, '2026-10-05')!;
    expect(p.irregular).toBe(true);
    expect(p.range).toBeNull();
    expect(upcomingPeriods(p)).toEqual([]);
  });
});
