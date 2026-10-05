import type { Meta } from '../../data/repo';

export const BACKUP_NUDGE_DAYS = 30;
const TAIL = 'Your data is only on this phone, so export a copy now and then.';

export function backupNudge(meta: Meta, hasData: boolean, now: Date = new Date()): string | null {
  if (!hasData) return null;
  if (!meta.lastBackupAt) return `You haven't exported a backup yet. ${TAIL}`;
  const days = Math.floor((now.getTime() - new Date(meta.lastBackupAt).getTime()) / 86_400_000);
  return days > BACKUP_NUDGE_DAYS ? `Last backup was ${days} days ago. ${TAIL}` : null;
}
