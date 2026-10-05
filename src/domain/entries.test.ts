import { describe, expect, it } from 'vitest';
import { normaliseEntries, sortEntries } from './entries';
import type { NewEntry } from './types';

describe('entries', () => {
  it('sorts by date then type order', () => {
    const es: NewEntry[] = [
      { date: '2024-01-02', type: 'note', text: 'b' },
      { date: '2024-01-02', type: 'period-start' },
      { date: '2024-01-01', type: 'intimacy' },
    ];
    expect(sortEntries(es).map((e) => `${e.date} ${e.type}`)).toEqual([
      '2024-01-01 intimacy', '2024-01-02 period-start', '2024-01-02 note',
    ]);
  });

  it('dedupes flags and merges same-day notes', () => {
    const out = normaliseEntries([
      { date: '2024-01-01', type: 'intimacy' },
      { date: '2024-01-01', type: 'intimacy' },
      { date: '2024-01-01', type: 'note', text: 'one' },
      { date: '2024-01-01', type: 'note', text: ' two ' },
      { date: '2024-01-01', type: 'note', text: 'one' },
      { date: '2024-01-03', type: 'note', text: '   ' },
    ]);
    expect(out).toEqual([
      { date: '2024-01-01', type: 'intimacy' },
      { date: '2024-01-01', type: 'note', text: 'one\ntwo' },
    ]);
  });
});
