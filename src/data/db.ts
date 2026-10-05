import Dexie, { type Table } from 'dexie';
import type { Entry } from '../domain/types';

export interface KV {
  key: string;
  value: unknown;
}

export interface Change {
  seq?: number;
  entryId: string;
  op: 'put' | 'delete';
  at: string;
}

export class TrackerDB extends Dexie {
  entries!: Table<Entry, string>;
  kv!: Table<KV, string>;
  changes!: Table<Change, number>;

  constructor(name = 'p-tracker') {
    super(name);
    this.version(1).stores({
      entries: 'id, date, type, &[date+type]',
      kv: 'key',
      changes: '++seq, entryId',
    });
  }
}
