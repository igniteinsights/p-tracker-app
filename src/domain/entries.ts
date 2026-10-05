import type { EntryType, NewEntry } from './types';

const TYPE_ORDER: Record<EntryType, number> = {
  'period-start': 0,
  'period-end': 1,
  intimacy: 2,
  note: 3,
};

export const entryKey = (e: Pick<NewEntry, 'date' | 'type'>): string => `${e.date}|${e.type}`;

export function sortEntries<T extends NewEntry>(es: readonly T[]): T[] {
  return [...es].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : TYPE_ORDER[a.type] - TYPE_ORDER[b.type],
  );
}

/** One entry per (date, type); same-day notes merged with newlines; blank notes dropped. */
export function normaliseEntries(es: readonly NewEntry[]): NewEntry[] {
  const flags = new Map<string, NewEntry>();
  const notes = new Map<string, string[]>();
  for (const e of es) {
    if (e.type === 'note') {
      const text = (e.text ?? '').trim();
      if (!text) continue;
      const list = notes.get(e.date) ?? [];
      if (!list.includes(text)) list.push(text);
      notes.set(e.date, list);
    } else {
      flags.set(entryKey(e), { date: e.date, type: e.type });
    }
  }
  const merged: NewEntry[] = [...notes].map(([date, texts]) => ({ date, type: 'note', text: texts.join('\n') }));
  return sortEntries([...flags.values(), ...merged]);
}
