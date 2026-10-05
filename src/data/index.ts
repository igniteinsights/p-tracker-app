import { TrackerDB } from './db';
import { createRepo } from './repo';

export const db = new TrackerDB();
export const repo = createRepo(db);
export type { DayDraft, Meta, Repo, ImportResult } from './repo';
export { EMPTY_DAY, DEFAULT_META } from './repo';
