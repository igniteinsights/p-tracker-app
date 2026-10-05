import type { ISODate } from './dates';

export type TrackingType = 'flow' | 'pain' | 'mood' | 'energy';
export type FlagType = 'period-start' | 'period-end' | 'intimacy';
export type EntryType = FlagType | TrackingType | 'note';
export const ENTRY_TYPES: readonly EntryType[] = ['period-start', 'period-end', 'intimacy', 'flow', 'pain', 'mood', 'energy', 'note'];

export interface Entry {
  id: string;
  date: ISODate;
  type: EntryType;
  text?: string;
  /** Chosen option for tracking types, e.g. 'heavy' for flow */
  value?: string;
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
  /** Extra tracking types switched on in Settings */
  tracking: TrackingType[];
}

export const DEFAULT_SETTINGS: Settings = {
  cycleLength: { mode: 'auto', value: 28 },
  periodLength: { mode: 'auto', value: 5 },
  irregular: false,
  excludedCycles: [],
  tracking: [],
};

export const CYCLE_RANGE = { min: 18, max: 45, fallback: 28 } as const;
export const PERIOD_RANGE = { min: 2, max: 10, fallback: 5 } as const;
