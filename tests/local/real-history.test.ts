// Runs only on a machine that has a private MyDays export in the repo root.
// It deliberately hard-codes nothing from that file.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseMyd } from '../../src/io/myd';
import { parseBackup, serializeBackup } from '../../src/io/backup';
import { DEFAULT_SETTINGS } from '../../src/domain/types';

const file = existsSync('.') ? readdirSync('.').find((f) => /^Default_User_.*\.myd$/.test(f)) : undefined;

describe.skipIf(!file)('real MyDays history (local only)', () => {
  it('imports every entry without warnings and survives a backup round trip', () => {
    const text = readFileSync(file!, 'utf8');
    const r = parseMyd(text);
    expect(r.warnings).toEqual([]);
    // Every <data> block becomes one flag entry or one note line.
    const blocks = (text.match(/<data>/g) ?? []).length;
    const flags = r.entries.filter((e) => e.type !== 'note').length;
    const noteBlocks = (text.match(/^\d{4}-\d{2}-\d{2} !no!/gm) ?? []).length;
    expect(flags + noteBlocks).toBe(blocks);
    const back = parseBackup(serializeBackup(r.entries, DEFAULT_SETTINGS));
    expect(back.ok && back.entries).toEqual(r.entries);
  });
});
