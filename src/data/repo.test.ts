import { beforeEach, describe, expect, it } from 'vitest';
import { TrackerDB } from './db';
import { createRepo, EMPTY_DAY, planMerge, type Repo } from './repo';
import { DEFAULT_SETTINGS, type Entry, type NewEntry } from '../domain/types';

let db: TrackerDB;
let repo: Repo;
let n = 0;

beforeEach(async () => {
  db = new TrackerDB(`test-${++n}`);
  repo = createRepo(db);
});

const incoming: NewEntry[] = [
  { date: '2024-01-01', type: 'period-start' },
  { date: '2024-01-05', type: 'intimacy' },
  { date: '2024-01-05', type: 'note', text: 'tired' },
];

describe('planMerge', () => {
  it('adds missing entries and appends new note text', () => {
    const existing: Entry[] = [
      { id: 'a', date: '2024-01-01', type: 'period-start' },
      { id: 'b', date: '2024-01-05', type: 'note', text: 'mine' },
    ];
    expect(planMerge(existing, incoming)).toEqual({
      add: [{ date: '2024-01-05', type: 'intimacy' }],
      append: [{ id: 'b', text: 'mine\ntired' }],
    });
  });

  it('appends only the note lines that are new', () => {
    const existing: Entry[] = [{ id: 'b', date: '2024-01-05', type: 'note', text: 'A' }];
    const plan = planMerge(existing, [
      { date: '2024-01-05', type: 'note', text: 'A' },
      { date: '2024-01-05', type: 'note', text: 'B' },
    ]);
    expect(plan.append).toEqual([{ id: 'b', text: 'A\nB' }]);
  });

  it('keeps a short note that is only a substring of an existing one', () => {
    const existing: Entry[] = [{ id: 'b', date: '2024-01-05', type: 'note', text: 'long busy day' }];
    expect(planMerge(existing, [{ date: '2024-01-05', type: 'note', text: 'day' }]).append).toEqual([
      { id: 'b', text: 'long busy day\nday' },
    ]);
  });

  it('skips note text that is already present', () => {
    const existing: Entry[] = [{ id: 'b', date: '2024-01-05', type: 'note', text: 'mine\ntired' }];
    expect(planMerge(existing, incoming).append).toEqual([]);
  });
});

describe('repo', () => {
  it('saves and reads a day, removing cleared items', async () => {
    await repo.saveDay('2024-01-05', { periodStart: true, periodEnd: false, intimacy: true, note: ' hello ' });
    expect(await repo.getDay('2024-01-05')).toEqual({ periodStart: true, periodEnd: false, intimacy: true, note: 'hello' });
    await repo.saveDay('2024-01-05', EMPTY_DAY);
    expect(await repo.getDay('2024-01-05')).toEqual(EMPTY_DAY);
    expect(await repo.listEntries()).toEqual([]);
  });

  it('updates an existing note in place', async () => {
    await repo.saveDay('2024-01-05', { ...EMPTY_DAY, note: 'one' });
    await repo.saveDay('2024-01-05', { ...EMPTY_DAY, note: 'two' });
    const notes = (await repo.listEntries()).filter((e) => e.type === 'note');
    expect(notes).toHaveLength(1);
    expect(notes[0].text).toBe('two');
  });

  it('toggles a flag on and off', async () => {
    expect(await repo.toggleEntry('2024-01-05', 'intimacy')).toBe('added');
    expect(await repo.toggleEntry('2024-01-05', 'intimacy')).toBe('removed');
    expect(await repo.listEntries()).toEqual([]);
  });

  it('merging the same import twice adds nothing the second time', async () => {
    expect(await repo.importEntries(incoming, 'merge')).toEqual({ added: 3, notesAppended: 0 });
    expect(await repo.countNew(incoming)).toBe(0);
    expect(await repo.importEntries(incoming, 'merge')).toEqual({ added: 0, notesAppended: 0 });
    expect(await repo.listEntries()).toHaveLength(3);
  });

  it('replace clears existing entries and applies settings when given', async () => {
    await repo.saveDay('2020-01-01', { ...EMPTY_DAY, intimacy: true });
    const settings = { ...DEFAULT_SETTINGS, cycleLength: { mode: 'fixed' as const, value: 30 } };
    expect(await repo.importEntries(incoming, 'replace', settings)).toEqual({ added: 3, notesAppended: 0 });
    expect((await repo.listEntries()).map((e) => e.date).sort()).toEqual(['2024-01-01', '2024-01-05', '2024-01-05']);
    expect(await repo.getSettings()).toEqual(settings);
  });

  it('records every write in the change log', async () => {
    await repo.toggleEntry('2024-01-05', 'intimacy');
    await repo.toggleEntry('2024-01-05', 'intimacy');
    expect((await db.changes.toArray()).map((c) => c.op)).toEqual(['put', 'delete']);
  });

  it('stores settings and merges meta patches', async () => {
    expect(await repo.getSettings()).toEqual(DEFAULT_SETTINGS);
    await repo.setMeta({ lastBackupAt: '2026-10-05T00:00:00.000Z' });
    await repo.setMeta({ iosHintDismissed: true });
    expect(await repo.getMeta()).toEqual({ lastBackupAt: '2026-10-05T00:00:00.000Z', storagePersisted: false, iosHintDismissed: true, installDismissedAt: null });
  });

  it('deleteAll clears entries and settings but keeps meta', async () => {
    await repo.importEntries(incoming, 'merge', { ...DEFAULT_SETTINGS, periodLength: { mode: 'fixed', value: 4 } });
    await repo.setMeta({ iosHintDismissed: true });
    await repo.deleteAll();
    expect(await repo.listEntries()).toEqual([]);
    expect(await repo.getSettings()).toEqual(DEFAULT_SETTINGS);
    expect((await repo.getMeta()).iosHintDismissed).toBe(true);
  });
});
