import { describe, expect, it } from 'vitest';
import {
  addDays, daysInMonth, diffDays, formatDayMonth, formatLong, formatMonthYear, formatShort,
  isValidISODate, todayISO, weekdayIndex,
} from './dates';

describe('dates', () => {
  it('validates ISO dates including leap years', () => {
    expect(isValidISODate('2024-02-29')).toBe(true);
    expect(isValidISODate('2023-02-29')).toBe(false);
    expect(isValidISODate('2023-13-01')).toBe(false);
    expect(isValidISODate('2023-1-01')).toBe(false);
    expect(isValidISODate('nonsense')).toBe(false);
  });

  it('knows month lengths', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 9)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it('adds days across month, year and DST boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(addDays('2026-04-04', 2)).toBe('2026-04-06'); // NZ DST ends 5 Apr 2026
    expect(addDays('2026-09-26', 2)).toBe('2026-09-28'); // NZ DST starts 27 Sep 2026
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('diffs days as a − b', () => {
    expect(diffDays('2026-10-17', '2026-10-05')).toBe(12);
    expect(diffDays('2026-09-19', '2026-10-05')).toBe(-16);
    expect(diffDays('2024-03-01', '2024-02-28')).toBe(2);
  });

  it('uses the local calendar date for today, not UTC', () => {
    // 00:30 local on 5 Oct must be 5 Oct whatever the machine's zone
    expect(todayISO(new Date(2026, 9, 5, 0, 30))).toBe('2026-10-05');
    expect(todayISO(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05');
  });

  it('computes Monday-first weekday index', () => {
    expect(weekdayIndex('2026-10-05')).toBe(0); // Monday
    expect(weekdayIndex('2026-10-01')).toBe(3); // Thursday
    expect(weekdayIndex('2026-10-04')).toBe(6); // Sunday
  });

  it('formats dates without Intl locale drift', () => {
    expect(formatLong('2026-10-05')).toBe('Monday 5 October');
    expect(formatLong('2023-05-17', true)).toBe('Wednesday 17 May 2023');
    expect(formatShort('2026-10-17')).toBe('Sat 17 Oct');
    expect(formatDayMonth('2026-09-19')).toBe('19 Sep');
    expect(formatMonthYear('2012-06-03')).toBe('Jun 2012');
  });
});
