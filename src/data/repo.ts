import type { ISODate } from '../domain/dates';
import { entryKey, normaliseEntries } from '../domain/entries';
import { DEFAULT_SETTINGS, type Entry, type EntryType, type FlagType, type NewEntry, type Settings, type TrackingType } from '../domain/types';
import { isTrackingType, TRACKING_TYPES } from '../domain/tracking';
import type { TrackerDB } from './db';
import type { LockAfter } from '../pwa/pin';

export interface Meta {
  lastBackupAt: string | null;
  storagePersisted: boolean;
  iosHintDismissed: boolean;
  installDismissedAt: string | null;
  /** Salted PBKDF2 hash of the PIN; null when the PIN lock is off */
  pinHash: string | null;
  pinSalt: string | null;
  pinLength: number | null;
  lockAfter: LockAfter;
}

export const DEFAULT_META: Meta = {
  lastBackupAt: null, storagePersisted: false, iosHintDismissed: false, installDismissedAt: null,
  pinHash: null, pinSalt: null, pinLength: null, lockAfter: '1m',
};

export interface DayDraft {
  periodStart: boolean;
  periodEnd: boolean;
  intimacy: boolean;
  note: string;
  /** Chosen values for the extra tracking types */
  tracking: Partial<Record<TrackingType, string>>;
}

export const EMPTY_DAY: DayDraft = { periodStart: false, periodEnd: false, intimacy: false, note: '', tracking: {} };

export interface MergePlan {
  add: NewEntry[];
  append: { id: string; text: string }[];
}

export interface ImportResult {
  added: number;
  notesAppended: number;
}

export interface Repo {
  listEntries(): Promise<Entry[]>;
  getDay(date: ISODate): Promise<DayDraft>;
  saveDay(date: ISODate, draft: DayDraft): Promise<void>;
  toggleEntry(date: ISODate, type: FlagType): Promise<'added' | 'removed'>;
  setEntry(date: ISODate, type: FlagType, present: boolean): Promise<void>;
  countNew(entries: readonly NewEntry[]): Promise<number>;
  importEntries(entries: readonly NewEntry[], mode: 'merge' | 'replace', settings?: Settings | null): Promise<ImportResult>;
  getSettings(): Promise<Settings>;
  setSettings(settings: Settings): Promise<void>;
  getMeta(): Promise<Meta>;
  setMeta(patch: Partial<Meta>): Promise<void>;
  deleteAll(): Promise<void>;
}

const FLAGS: [keyof Omit<DayDraft, 'note' | 'tracking'>, FlagType][] = [
  ['periodStart', 'period-start'],
  ['periodEnd', 'period-end'],
  ['intimacy', 'intimacy'],
];

export function planMerge(existing: readonly Entry[], incoming: readonly NewEntry[]): MergePlan {
  const byKey = new Map(existing.map((e) => [entryKey(e), e]));
  const plan: MergePlan = { add: [], append: [] };
  for (const e of normaliseEntries(incoming)) {
    const ex = byKey.get(entryKey(e));
    if (!ex) plan.add.push(e);
    else if (e.type === 'note') {
      const have = new Set((ex.text ?? '').split('\n').map((l) => l.trim()));
      const fresh = e.text!.split('\n').filter((l) => !have.has(l.trim()));
      if (fresh.length) plan.append.push({ id: ex.id, text: `${ex.text}\n${fresh.join('\n')}` });
    }
  }
  return plan;
}

export function createRepo(db: TrackerDB): Repo {
  const stamp = () => new Date().toISOString();
  const log = (entryId: string, op: 'put' | 'delete') => db.changes.add({ entryId, op, at: stamp() });
  const findOne = (date: ISODate, type: EntryType) => db.entries.where('[date+type]').equals([date, type]).first();

  async function insert(e: NewEntry) {
    const id = crypto.randomUUID();
    await db.entries.add({ id, ...e });
    await log(id, 'put');
  }

  async function remove(e: Entry) {
    await db.entries.delete(e.id);
    await log(e.id, 'delete');
  }

  async function getMeta(): Promise<Meta> {
    const row = await db.kv.get('meta');
    return { ...DEFAULT_META, ...((row?.value as Partial<Meta> | undefined) ?? {}) };
  }

  return {
    listEntries: () => db.entries.toArray(),

    async getDay(date) {
      const es = await db.entries.where('date').equals(date).toArray();
      const has = (t: EntryType) => es.some((e) => e.type === t);
      return {
        periodStart: has('period-start'),
        periodEnd: has('period-end'),
        intimacy: has('intimacy'),
        note: es.find((e) => e.type === 'note')?.text ?? '',
        tracking: Object.fromEntries(es.filter((e) => isTrackingType(e.type) && e.value).map((e) => [e.type, e.value!])),
      };
    },

    saveDay(date, draft) {
      return db.transaction('rw', db.entries, db.changes, async () => {
        for (const [key, type] of FLAGS) {
          const ex = await findOne(date, type);
          if (draft[key] && !ex) await insert({ date, type });
          if (!draft[key] && ex) await remove(ex);
        }
        const note = draft.note.trim();
        const ex = await findOne(date, 'note');
        if (note && !ex) await insert({ date, type: 'note', text: note });
        else if (note && ex && ex.text !== note) {
          await db.entries.update(ex.id, { text: note });
          await log(ex.id, 'put');
        } else if (!note && ex) await remove(ex);
        for (const type of TRACKING_TYPES) {
          const value = draft.tracking[type];
          const current = await findOne(date, type);
          if (value && !current) await insert({ date, type, value });
          else if (value && current && current.value !== value) {
            await db.entries.update(current.id, { value });
            await log(current.id, 'put');
          } else if (!value && current) await remove(current);
        }
      });
    },

    toggleEntry(date, type) {
      return db.transaction('rw', db.entries, db.changes, async () => {
        const ex = await findOne(date, type);
        if (ex) {
          await remove(ex);
          return 'removed' as const;
        }
        await insert({ date, type });
        return 'added' as const;
      });
    },

    setEntry(date, type, present) {
      return db.transaction('rw', db.entries, db.changes, async () => {
        const ex = await findOne(date, type);
        if (present && !ex) await insert({ date, type });
        if (!present && ex) await remove(ex);
      });
    },

    async countNew(entries) {
      const plan = planMerge(await db.entries.toArray(), entries);
      return plan.add.length + plan.append.length;
    },

    importEntries(entries, mode, settings) {
      return db.transaction('rw', db.entries, db.changes, db.kv, async () => {
        let result: ImportResult;
        if (mode === 'replace') {
          for (const e of await db.entries.toArray()) await log(e.id, 'delete');
          await db.entries.clear();
          const clean = normaliseEntries(entries);
          for (const e of clean) await insert(e);
          result = { added: clean.length, notesAppended: 0 };
        } else {
          const plan = planMerge(await db.entries.toArray(), entries);
          for (const e of plan.add) await insert(e);
          for (const a of plan.append) {
            await db.entries.update(a.id, { text: a.text });
            await log(a.id, 'put');
          }
          result = { added: plan.add.length, notesAppended: plan.append.length };
        }
        if (settings) await db.kv.put({ key: 'settings', value: settings });
        return result;
      });
    },

    async getSettings() {
      const row = await db.kv.get('settings');
      return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<Settings> | undefined) ?? {}) };
    },

    async setSettings(settings) {
      await db.kv.put({ key: 'settings', value: settings });
    },

    getMeta,

    setMeta(patch) {
      return db.transaction('rw', db.kv, async () => {
        await db.kv.put({ key: 'meta', value: { ...(await getMeta()), ...patch } });
      });
    },

    deleteAll() {
      return db.transaction('rw', db.entries, db.changes, db.kv, async () => {
        for (const e of await db.entries.toArray()) await log(e.id, 'delete');
        await db.entries.clear();
        await db.kv.delete('settings');
      });
    },
  };
}
