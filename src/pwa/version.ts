export interface ReleaseNote {
  version: string;
  notes: string[];
}

/** Compares dotted version numbers part by part: negative if a is older than b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff) return diff;
  }
  return 0;
}

/** Notes from every release newer than the one installed, newest first. */
export function notesSince(releases: readonly ReleaseNote[], installed: string): string[] {
  return [...releases]
    .filter((r) => compareVersions(r.version, installed) > 0)
    .sort((a, b) => compareVersions(b.version, a.version))
    .flatMap((r) => r.notes);
}

const isNote = (r: unknown): r is ReleaseNote =>
  typeof r === 'object' && r !== null &&
  typeof (r as ReleaseNote).version === 'string' &&
  Array.isArray((r as ReleaseNote).notes) && (r as ReleaseNote).notes.every((n) => typeof n === 'string');

/** Reads the release list from version.json, dropping anything malformed. */
export function parseReleases(value: unknown): ReleaseNote[] {
  return Array.isArray(value) ? value.filter(isNote) : [];
}
