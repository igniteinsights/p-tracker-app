import { isValidISODate, pad2, todayISO, type ISODate } from '../domain/dates';
import { normaliseEntries, sortEntries } from '../domain/entries';
import { isTrackingType, isValidTrackingValue } from '../domain/tracking';
import { CYCLE_RANGE, DEFAULT_SETTINGS, ENTRY_TYPES, PERIOD_RANGE, type EntryType, type LengthSetting, type NewEntry, type Settings, type TrackingType } from '../domain/types';

/** 2 adds tracking entries (flow, pain, mood, energy) and settings.tracking. Version 1 still imports. */
export const SCHEMA_VERSION = 2;

export type BackupResult =
  | { ok: true; entries: NewEntry[]; settings: Settings }
  | { ok: false; error: string };

export function isoWithOffset(d: Date): string {
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  return `${todayISO(d)}T${time}${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

export function exportFilename(ext: 'json' | 'csv', today: ISODate): string {
  return `p-tracker-export-${today}.${ext}`;
}

export function serializeBackup(entries: readonly NewEntry[], settings: Settings, now: Date = new Date()): string {
  const file = {
    app: 'p-tracker',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: isoWithOffset(now),
    settings,
    entries: sortEntries(entries).map(({ date, type, text, value }) =>
      type === 'note' ? { date, type, text } : isTrackingType(type) ? { date, type, value } : { date, type }),
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const fail = (error: string): BackupResult => ({ ok: false, error });

function parseLength(v: unknown, range: { min: number; max: number }): LengthSetting | null {
  if (!isObj(v)) return null;
  if (v.mode !== 'auto' && v.mode !== 'fixed') return null;
  if (typeof v.value !== 'number' || !Number.isInteger(v.value) || v.value < range.min || v.value > range.max) return null;
  return { mode: v.mode, value: v.value };
}

export function parseBackup(text: string): BackupResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail('This file is not valid JSON.');
  }
  if (!isObj(data) || data.app !== 'p-tracker') return fail('This file is not a p-tracker backup.');
  const version = data.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return fail('This backup has no valid schema version.');
  if (version > SCHEMA_VERSION) return fail('This backup is from a newer version of p-tracker. Update the app and try again.');
  if (!Array.isArray(data.entries)) return fail('This backup has no entries list.');

  const entries: NewEntry[] = [];
  for (let i = 0; i < data.entries.length; i++) {
    const e: unknown = data.entries[i];
    const n = i + 1;
    if (!isObj(e)) return fail(`Entry ${n} is not valid.`);
    if (typeof e.date !== 'string' || !isValidISODate(e.date)) return fail(`Entry ${n} has an invalid date.`);
    if (!ENTRY_TYPES.includes(e.type as EntryType)) return fail(`Entry ${n} has an unknown type.`);
    const type = e.type as EntryType;
    if (isTrackingType(type)) {
      if (!isValidTrackingValue(type, e.value)) return fail(`Entry ${n} has an unknown value.`);
      entries.push({ date: e.date, type, value: e.value as string });
    } else if (type === 'note') {
      if (typeof e.text !== 'string' || !e.text.trim()) return fail(`Entry ${n} is a note without text.`);
      entries.push({ date: e.date, type, text: e.text });
    } else {
      entries.push({ date: e.date, type });
    }
  }

  let settings = DEFAULT_SETTINGS;
  if (data.settings !== undefined) {
    const s = data.settings;
    const cycleLength = isObj(s) ? parseLength(s.cycleLength, CYCLE_RANGE) : null;
    const periodLength = isObj(s) ? parseLength(s.periodLength, PERIOD_RANGE) : null;
    if (!cycleLength || !periodLength || !isObj(s)) return fail('This backup has invalid settings.');
    const irregular = s.irregular ?? false;
    const excludedCycles = s.excludedCycles ?? [];
    const tracking = s.tracking ?? [];
    if (!Array.isArray(tracking) || !tracking.every((t) => typeof t === 'string' && isTrackingType(t))) return fail('This backup has invalid settings.');
    if (typeof irregular !== 'boolean') return fail('This backup has invalid settings.');
    if (!Array.isArray(excludedCycles) || !excludedCycles.every((d) => typeof d === 'string' && isValidISODate(d))) {
      return fail('This backup has invalid settings.');
    }
    settings = { cycleLength, periodLength, irregular, excludedCycles: [...new Set(excludedCycles as string[])].sort(), tracking: [...new Set(tracking as TrackingType[])] };
  }

  return { ok: true, entries: normaliseEntries(entries), settings };
}
