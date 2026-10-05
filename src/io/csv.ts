import { sortEntries } from '../domain/entries';
import type { NewEntry } from '../domain/types';

const quote = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function toCsv(entries: readonly NewEntry[]): string {
  const rows = sortEntries(entries).map((e) => [e.date, e.type, e.text ?? ''].map(quote).join(','));
  return `﻿${['date,type,note', ...rows].join('\r\n')}\r\n`;
}
