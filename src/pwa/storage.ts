import { repo } from '../data';

/** Ask the browser not to evict our data. Safe to call repeatedly. */
export async function ensurePersisted(): Promise<void> {
  const meta = await repo.getMeta();
  if (meta.storagePersisted || !navigator.storage?.persist) return;
  const granted = await navigator.storage.persist().catch(() => false);
  if (granted) await repo.setMeta({ storagePersisted: true });
}
