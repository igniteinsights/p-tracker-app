import type { ISODate } from './dates';

export type EntryType = 'period-start' | 'period-end' | 'intimacy' | 'note';
export type FlagType = Exclude<EntryType, 'note'>;
export const ENTRY_TYPES: readonly EntryType[] = ['period-start', 'period-end', 'intimacy', 'note'];

export interface Entry {
  id: string;
  date: ISODate;
  type: EntryType;
  text?: string;
}

export type NewEntry = Omit<Entry, 'id'>;

export interface LengthSetting {
  mode: 'auto' | 'fixed';
  value: number;
}

export interface Settings {
  cycleLength: LengthSetting;
  periodLength: LengthSetting;
  /** Turns predictions off and shows only what has been logged. */
  irregular: boolean;
  /** Start dates of cycles left out of averages and ranges. */
  excludedCycles: ISODate[];
}

export const DEFAULT_SETTINGS: Settings = {
  cycleLength: { mode: 'auto', value: 28 },
  periodLength: { mode: 'auto', value: 5 },
  irregular: false,
  excludedCycles: [],
};

export const CYCLE_RANGE = { min: 18, max: 45, fallback: 28 } as const;
export const PERIOD_RANGE = { min: 2, max: 10, fallback: 5 } as const;
