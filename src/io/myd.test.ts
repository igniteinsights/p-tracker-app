import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseMyd } from './myd';

const sample = readFileSync('tests/fixtures/sample.myd', 'utf8');
const count = (r: ReturnType<typeof parseMyd>, type: string) => r.entries.filter((e) => e.type === type).length;

describe('parseMyd', () => {
  it('maps every code', () => {
    const r = parseMyd(sample);
    expect(count(r, 'period-start')).toBe(8);
    expect(count(r, 'period-end')).toBe(1);
    expect(count(r, 'intimacy')).toBe(2);
    expect(count(r, 'note')).toBe(3);
  });

  it('keeps multi-line notes intact', () => {
    const note = parseMyd(sample).entries.find((e) => e.date === '2023-11-02');
    expect(note).toEqual({ date: '2023-11-02', type: 'note', text: 'headache am\nbetter by evening' });
  });

  it('keeps unknown codes as notes and warns', () => {
    const r = parseMyd(sample);
    expect(r.entries).toContainEqual({ date: '2023-10-15', type: 'note', text: '[xx] mystery' });
    expect(r.warnings.some((w) => w.message.includes('Unknown code "xx"'))).toBe(true);
  });

  it('skips malformed blocks with a line number', () => {
    const w = parseMyd(sample).warnings.find((x) => x.message.startsWith('Unrecognised entry'));
    expect(w?.line).toBe(33);
  });

  it('handles CRLF line endings and a BOM', () => {
    const r = parseMyd('﻿' + sample.replace(/\n/g, '\r\n'));
    expect(r.entries).toHaveLength(14);
    expect(r.entries.find((e) => e.date === '2023-11-02')?.text).toBe('headache am\nbetter by evening');
  });

  it('extracts settings', () => {
    expect(parseMyd(sample).settings).toEqual({
      cycleLength: { mode: 'auto', value: 28 },
      periodLength: { mode: 'auto', value: 5 },
    });
    expect(parseMyd('<cyclelength 30/><cyclefixed 1/><reserve <polauto>0</polauto><polength>4</polength>/>').settings).toEqual({
      cycleLength: { mode: 'fixed', value: 30 },
      periodLength: { mode: 'fixed', value: 4 },
    });
    expect(parseMyd('<data>\n2024-01-01 !sp!\n</data>').settings).toBeNull();
  });

  it('turns text on a non-note code into a separate note', () => {
    const r = parseMyd('<data>\n2024-01-01 !sp! heavy\n</data>');
    expect(r.entries).toEqual([
      { date: '2024-01-01', type: 'period-start' },
      { date: '2024-01-01', type: 'note', text: 'heavy' },
    ]);
  });

  it('rejects invalid dates and empty notes with warnings', () => {
    const r = parseMyd('<data>\n2023-02-30 !sp!\n</data>\n<data>\n2023-03-01 !no!\n</data>');
    expect(r.entries).toEqual([]);
    expect(r.warnings).toHaveLength(2);
  });
});
