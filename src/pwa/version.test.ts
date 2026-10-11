import { describe, expect, it } from 'vitest';
import releases from './releaseNotes.json';
import { compareVersions, notesSince, parseReleases } from './version';

describe('compareVersions', () => {
  it('compares numerically, part by part', () => {
    expect(compareVersions('1.0.10', '1.0.9')).toBeGreaterThan(0);
    expect(compareVersions('1.0.9', '1.1.0')).toBeLessThan(0);
    expect(compareVersions('1.0.17', '1.0.17')).toBe(0);
  });
});

describe('notesSince', () => {
  const list = [
    { version: '1.0.18', notes: ['c'] },
    { version: '1.0.16', notes: ['a'] },
    { version: '1.0.17', notes: ['b1', 'b2'] },
  ];
  it('lists every release newer than the installed one, newest first', () => {
    expect(notesSince(list, '1.0.16')).toEqual(['c', 'b1', 'b2']);
  });
  it('is empty when nothing is newer', () => {
    expect(notesSince(list, '1.0.18')).toEqual([]);
  });
});

describe('parseReleases', () => {
  it('keeps well-formed entries only', () => {
    expect(parseReleases([{ version: '1.0.1', notes: ['x'] }, { version: 2 }, null])).toEqual([{ version: '1.0.1', notes: ['x'] }]);
    expect(parseReleases(undefined)).toEqual([]);
  });
});

describe('releaseNotes.json', () => {
  it('is well formed, newest first, with no repeated versions', () => {
    expect(parseReleases(releases)).toHaveLength(releases.length);
    const versions = releases.map((r) => r.version);
    expect([...versions].sort((a, b) => compareVersions(b, a))).toEqual(versions);
    expect(new Set(versions).size).toBe(versions.length);
  });
});
