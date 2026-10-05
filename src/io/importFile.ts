import type { ISODate } from '../domain/dates';
import { ENTRY_TYPES, type EntryType, type NewEntry, type Settings } from '../domain/types';
import { parseBackup } from './backup';
import { parseMyd, type ParseWarning } from './myd';

export type ImportSource = 'myd' | 'json';

export type DetectedImport =
  | { ok: true; source: ImportSource; entries: NewEntry[]; settings: Settings | null; warnings: ParseWarning[] }
  | { ok: false; error: string };

export interface ImportSummary {
  counts: Record<EntryType, number>;
  first: ISODate | null;
  last: ISODate | null;
}

export function detectAndParse(fileName: string, text: string): DetectedImport {
  const name = fileName.toLowerCase();
  const trimmed = text.trimStart();
  if (name.endsWith('.json') || trimmed.startsWith('{')) {
    const r = parseBackup(text);
    return r.ok ? { ok: true, source: 'json', entries: r.entries, settings: r.settings, warnings: [] } : r;
  }
  if (name.endsWith('.myd') || text.includes('<data>') || text.includes('<cyclelength')) {
    const r = parseMyd(text);
    if (!r.entries.length) return { ok: false, error: 'No entries found in this MyDays file.' };
    return { ok: true, source: 'myd', ...r };
  }
  return { ok: false, error: "This file type isn't supported. Choose a .myd file from MyDays or a .json backup from p-tracker." };
}

export function summarise(entries: readonly NewEntry[]): ImportSummary {
  const counts = Object.fromEntries(ENTRY_TYPES.map((t) => [t, 0])) as Record<EntryType, number>;
  let first: ISODate | null = null;
  let last: ISODate | null = null;
  for (const e of entries) {
    counts[e.type]++;
    if (first === null || e.date < first) first = e.date;
    if (last === null || e.date > last) last = e.date;
  }
  return { counts, first, last };
}
