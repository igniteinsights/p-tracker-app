import { isValidISODate } from '../domain/dates';
import { normaliseEntries } from '../domain/entries';
import { CYCLE_RANGE, DEFAULT_SETTINGS, PERIOD_RANGE, type FlagType, type NewEntry, type Settings } from '../domain/types';

export interface ParseWarning {
  line: number;
  message: string;
}

export interface ParsedImport {
  entries: NewEntry[];
  settings: Settings | null;
  warnings: ParseWarning[];
}

const CODES: Record<string, FlagType> = { sp: 'period-start', ep: 'period-end', hs: 'intimacy' };
const FIRST_LINE = /^(\d{4}-\d{2}-\d{2}) !([a-z]+)!\s?(.*)$/;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function parseMyd(text: string): ParsedImport {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const raw: NewEntry[] = [];
  const warnings: ParseWarning[] = [];
  let block: { start: number; lines: string[] } | null = null;

  const processBlock = (b: { start: number; lines: string[] }) => {
    const [first = '', ...rest] = b.lines;
    const line = b.start + 1;
    const m = FIRST_LINE.exec(first.trim());
    if (!m) {
      warnings.push({ line, message: `Unrecognised entry: "${first.trim().slice(0, 40)}"` });
      return;
    }
    const [, date, code, firstText] = m;
    if (!isValidISODate(date)) {
      warnings.push({ line, message: `Invalid date "${date}"` });
      return;
    }
    const body = [firstText, ...rest].join('\n').trim();
    if (code === 'no') {
      if (body) raw.push({ date, type: 'note', text: body });
      else warnings.push({ line, message: `Empty note on ${date}` });
      return;
    }
    const type = CODES[code];
    if (type) {
      raw.push({ date, type });
      if (body) raw.push({ date, type: 'note', text: body });
      return;
    }
    warnings.push({ line, message: `Unknown code "${code}" on ${date} kept as a note` });
    raw.push({ date, type: 'note', text: `[${code}] ${body}`.trim() });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    const trimmed = line.trim();
    if (trimmed === '<data>') {
      if (block) warnings.push({ line: block.start, message: 'Entry was not closed' });
      block = { start: i + 1, lines: [] };
    } else if (trimmed === '</data>') {
      if (block) processBlock(block);
      else warnings.push({ line: i + 1, message: 'Unexpected </data>' });
      block = null;
    } else if (block) {
      block.lines.push(line);
    }
  }
  if (block) warnings.push({ line: block.start, message: 'Entry was not closed' });

  return { entries: normaliseEntries(raw), settings: parseSettings(text), warnings };
}

function parseSettings(text: string): Settings | null {
  const cycle = /<cyclelength\s+(\d+)\s*\/>/.exec(text);
  const cycleFixed = /<cyclefixed\s+(\d)\s*\/>/.exec(text);
  const period = /<polength>(\d+)<\/polength>/.exec(text);
  const periodAuto = /<polauto>(\d)<\/polauto>/.exec(text);
  if (!cycle && !period) return null;
  return {
    cycleLength: cycle
      ? { mode: cycleFixed?.[1] === '1' ? 'fixed' : 'auto', value: clamp(Number(cycle[1]), CYCLE_RANGE.min, CYCLE_RANGE.max) }
      : DEFAULT_SETTINGS.cycleLength,
    periodLength: period
      ? { mode: periodAuto?.[1] === '0' ? 'fixed' : 'auto', value: clamp(Number(period[1]), PERIOD_RANGE.min, PERIOD_RANGE.max) }
      : DEFAULT_SETTINGS.periodLength,
  };
}
