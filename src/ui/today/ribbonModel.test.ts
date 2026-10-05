import { describe, expect, it } from 'vitest';
import { fertileStatus, ribbonLabel, ribbonTiles, statusLine } from './ribbonModel';
import type { Prediction } from '../../domain/predict';

const p: Prediction = {
  today: '2026-10-05', lastStart: '2026-09-19', cycleDay: 17, avgCycle: 28, avgPeriod: 5, lastPeriodLength: 5,
  nextStart: '2026-10-17', ovulation: '2026-10-03', fertileStart: '2026-09-28', fertileEnd: '2026-10-04',
  predictedPeriodEnd: '2026-10-21', lateBy: 0, cyclesLogged: 42, cycleSpan: 28, stale: false,
};

describe('ribbonTiles', () => {
  it('marks period, fertile, ovulation, past, today and future days', () => {
    const kinds = ribbonTiles(p).map((t) => t.kind);
    expect(kinds).toHaveLength(28);
    expect(kinds.slice(0, 5)).toEqual(Array(5).fill('period'));
    expect(kinds.slice(5, 9)).toEqual(Array(4).fill('past'));
    expect(kinds[9]).toBe('fertile');   // 28 Sep
    expect(kinds[14]).toBe('ovulation'); // 3 Oct
    expect(kinds[15]).toBe('fertile');   // 4 Oct
    expect(kinds[16]).toBe('today');
    expect(kinds[17]).toBe('future');
  });
});

describe('copy', () => {
  it('counts down, then expects today, then reports late', () => {
    expect(statusLine(p)).toBe('Period expected in 12 days, around Sat 17 Oct.');
    expect(statusLine({ ...p, today: '2026-10-16' })).toBe('Period expected tomorrow.');
    expect(statusLine({ ...p, today: '2026-10-17' })).toBe('Period expected today.');
    expect(statusLine({ ...p, today: '2026-10-18', lateBy: 1 })).toBe('Period 1 day late.');
    expect(statusLine({ ...p, lateBy: 3 })).toBe('Period 3 days late.');
  });

  it('describes stale history without a countdown', () => {
    expect(statusLine({ ...p, lastStart: '2024-03-21', stale: true })).toBe('No period logged since 21 Mar 2024.');
  });

  it('describes the fertile window relative to today', () => {
    expect(fertileStatus(p)).toBe('Ended 4 Oct');
    expect(fertileStatus({ ...p, today: '2026-09-30' })).toBe('Until 4 Oct');
    expect(fertileStatus({ ...p, today: '2026-09-25' })).toBe('Starts 28 Sep');
  });

  it('gives the ribbon a text equivalent', () => {
    expect(ribbonLabel(p)).toBe('Day 17 of 28. Fertile window ended 4 Oct. Open calendar.');
  });
});
