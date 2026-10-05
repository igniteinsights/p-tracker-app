import { describe, expect, it } from 'vitest';
import { exportFilename, parseBackup, serializeBackup } from './backup';
import { DEFAULT_SETTINGS, type NewEntry, type Settings } from '../domain/types';

const entries: NewEntry[] = [
  { date: '2024-03-21', type: 'period-start' },
  { date: '2023-12-14', type: 'intimacy' },
  { date: '2023-05-17', type: 'note', text: 'spotting, "maybe"\nsecond line 🌙' },
];
const settings: Settings = { cycleLength: { mode: 'fixed', value: 30 }, periodLength: { mode: 'auto', value: 5 } };

describe('backup', () => {
  it('round-trips entries and settings exactly', () => {
    const text = serializeBackup(entries, settings, new Date(2026, 9, 5, 9, 40));
    const parsed = parseBackup(text);
    expect(parsed).toEqual({
      ok: true,
      settings,
      entries: [entries[2], entries[1], entries[0]],
    });
  });

  it('writes the agreed shape', () => {
    const file = JSON.parse(serializeBackup(entries, DEFAULT_SETTINGS, new Date(2026, 9, 5, 9, 40)));
    expect(file.app).toBe('p-tracker');
    expect(file.schemaVersion).toBe(1);
    expect(file.exportedAt).toMatch(/^2026-10-05T09:40:00[+-]\d{2}:\d{2}$/);
    expect(file.entries[0]).toEqual({ date: '2023-05-17', type: 'note', text: entries[2].text });
    expect(file.entries[2]).toEqual({ date: '2024-03-21', type: 'period-start' });
  });

  it('rejects newer schema versions', () => {
    const r = parseBackup(JSON.stringify({ app: 'p-tracker', schemaVersion: 2, entries: [] }));
    expect(r).toEqual({ ok: false, error: 'This backup is from a newer version of p-tracker. Update the app and try again.' });
  });

  it('rejects non-backups and invalid entries with a specific reason', () => {
    expect(parseBackup('not json')).toEqual({ ok: false, error: 'This file is not valid JSON.' });
    expect(parseBackup('{"app":"other"}')).toEqual({ ok: false, error: 'This file is not a p-tracker backup.' });
    const bad = { app: 'p-tracker', schemaVersion: 1, entries: [{ date: '2024-01-01', type: 'period-start' }, { date: '2024-13-01', type: 'intimacy' }] };
    expect(parseBackup(JSON.stringify(bad))).toEqual({ ok: false, error: 'Entry 2 has an invalid date.' });
    const note = { app: 'p-tracker', schemaVersion: 1, entries: [{ date: '2024-01-01', type: 'note', text: ' ' }] };
    expect(parseBackup(JSON.stringify(note))).toEqual({ ok: false, error: 'Entry 1 is a note without text.' });
  });

  it('defaults missing settings', () => {
    const r = parseBackup(JSON.stringify({ app: 'p-tracker', schemaVersion: 1, entries: [] }));
    expect(r).toEqual({ ok: true, entries: [], settings: DEFAULT_SETTINGS });
  });

  it('names export files by date', () => {
    expect(exportFilename('json', '2026-10-05')).toBe('p-tracker-export-2026-10-05.json');
    expect(exportFilename('csv', '2026-10-05')).toBe('p-tracker-export-2026-10-05.csv');
  });
});
