import { describe, expect, it } from 'vitest';
import { backupNudge } from './backupNudge';
import { DEFAULT_META } from '../../data/repo';

const now = new Date('2026-10-05T09:00:00Z');

describe('backupNudge', () => {
  it('says nothing without data', () => {
    expect(backupNudge(DEFAULT_META, false, now)).toBeNull();
  });
  it('nudges when there has never been a backup', () => {
    expect(backupNudge(DEFAULT_META, true, now)).toBe("You haven't exported a backup yet. Your data is only on this phone, so export a copy now and then.");
  });
  it('nudges after 30 days', () => {
    expect(backupNudge({ ...DEFAULT_META, lastBackupAt: '2026-09-01T09:00:00Z' }, true, now)).toBe('Last backup was 34 days ago. Your data is only on this phone, so export a copy now and then.');
    expect(backupNudge({ ...DEFAULT_META, lastBackupAt: '2026-09-20T09:00:00Z' }, true, now)).toBeNull();
  });
});
