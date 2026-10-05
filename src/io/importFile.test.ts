import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { detectAndParse, summarise } from './importFile';
import { serializeBackup } from './backup';
import { DEFAULT_SETTINGS } from '../domain/types';

const sample = readFileSync('tests/fixtures/sample.myd', 'utf8');

describe('detectAndParse', () => {
  it('detects .myd by extension or content', () => {
    const a = detectAndParse('Default_User.myd', sample);
    const b = detectAndParse('download.txt', sample);
    expect(a.ok && a.source).toBe('myd');
    expect(b.ok && b.source).toBe('myd');
  });

  it('detects JSON backups', () => {
    const r = detectAndParse('backup.json', serializeBackup([{ date: '2024-01-01', type: 'intimacy' }], DEFAULT_SETTINGS));
    expect(r.ok && r.source).toBe('json');
  });

  it('explains unsupported files', () => {
    expect(detectAndParse('photo.png', 'PNG...')).toEqual({
      ok: false,
      error: "This file type isn't supported. Choose a .myd file from MyDays or a .json backup from p-tracker.",
    });
    expect(detectAndParse('empty.myd', '<cyclelength 28/>')).toEqual({ ok: false, error: 'No entries found in this MyDays file.' });
  });
});

describe('summarise', () => {
  it('counts types and date range', () => {
    const r = detectAndParse('x.myd', sample);
    if (!r.ok) throw new Error(r.error);
    expect(summarise(r.entries)).toEqual({
      counts: { 'period-start': 8, 'period-end': 1, intimacy: 2, note: 3 },
      first: '2023-06-01',
      last: '2024-01-20',
    });
  });
});
