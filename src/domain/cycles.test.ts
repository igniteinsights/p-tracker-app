import { describe, expect, it } from 'vitest';
import { buildCycles, nearbyStartGap } from './cycles';
import type { NewEntry } from './types';

const sp = (date: string): NewEntry => ({ date, type: 'period-start' });

describe('buildCycles', () => {
  it('builds cycles from consecutive starts with explicit ends', () => {
    const cycles = buildCycles(
      [sp('2026-08-22'), sp('2026-09-19'), { date: '2026-08-26', type: 'period-end' }],
      '2026-10-05',
    );
    expect(cycles).toEqual([
      { start: '2026-08-22', next: '2026-09-19', length: 28, periodEnd: '2026-08-26' },
      { start: '2026-09-19', next: null, length: null, periodEnd: null },
    ]);
  });

  it('ignores period starts after today (future-dated imports)', () => {
    const cycles = buildCycles([sp('2026-09-19'), sp('2026-12-01')], '2026-10-05');
    expect(cycles.map((c) => c.start)).toEqual(['2026-09-19']);
  });

  it('dedupes repeated starts', () => {
    expect(buildCycles([sp('2026-09-19'), sp('2026-09-19')], '2026-10-05')).toHaveLength(1);
  });
});

describe('nearbyStartGap', () => {
  const es = [sp('2026-09-19')];
  it('reports a start within 10 days on either side', () => {
    expect(nearbyStartGap(es, '2026-09-25')).toBe(6);
    expect(nearbyStartGap(es, '2026-09-13')).toBe(6);
  });
  it('returns null when far enough or the same day', () => {
    expect(nearbyStartGap(es, '2026-09-29')).toBeNull();
    expect(nearbyStartGap(es, '2026-09-19')).toBeNull();
  });
});
