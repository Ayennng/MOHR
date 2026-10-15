import { describe, expect, it } from 'vitest';
import {
  countWorkingDays,
  fromDbDate,
  isValidTimezone,
  toDbDate,
  zonedDateString,
  zonedMinutesOfDay,
  zonedTimeToUtc,
} from '@/lib/dates';

describe('zonedDateString', () => {
  it('uses the company timezone, not UTC', () => {
    // 2026-10-15 23:30 UTC is already the 16th in Kuala Lumpur (UTC+8)
    const instant = new Date('2026-10-15T23:30:00Z');
    expect(zonedDateString(instant, 'Asia/Kuala_Lumpur')).toBe('2026-10-16');
    expect(zonedDateString(instant, 'UTC')).toBe('2026-10-15');
  });
});

describe('zonedMinutesOfDay', () => {
  it('returns local wall-clock minutes (drives the 09:30 late cut-off)', () => {
    // 01:31 UTC = 09:31 in Kuala Lumpur
    expect(zonedMinutesOfDay(new Date('2026-10-15T01:31:00Z'), 'Asia/Kuala_Lumpur')).toBe(9 * 60 + 31);
  });

  it('reports midnight as 0, not 24', () => {
    expect(zonedMinutesOfDay(new Date('2026-10-15T16:00:00Z'), 'Asia/Kuala_Lumpur')).toBe(0);
  });
});

describe('zonedTimeToUtc', () => {
  it('converts a company wall-clock time to the right instant', () => {
    expect(zonedTimeToUtc('2026-10-16', '10:00', 'Asia/Kuala_Lumpur').toISOString()).toBe(
      '2026-10-16T02:00:00.000Z'
    );
  });

  it('handles daylight-saving offsets on both sides of the change', () => {
    // New York is UTC-4 in summer and UTC-5 in winter
    expect(zonedTimeToUtc('2026-07-01', '09:00', 'America/New_York').toISOString()).toBe(
      '2026-07-01T13:00:00.000Z'
    );
    expect(zonedTimeToUtc('2026-12-01', '09:00', 'America/New_York').toISOString()).toBe(
      '2026-12-01T14:00:00.000Z'
    );
  });

  it('round-trips with zonedDateString/zonedMinutesOfDay', () => {
    const instant = zonedTimeToUtc('2026-03-08', '23:45', 'America/New_York');
    expect(zonedDateString(instant, 'America/New_York')).toBe('2026-03-08');
    expect(zonedMinutesOfDay(instant, 'America/New_York')).toBe(23 * 60 + 45);
  });
});

describe('countWorkingDays', () => {
  const days = (start: string, end: string) => countWorkingDays(toDbDate(start), toDbDate(end));

  it('counts a Monday–Friday week as 5', () => {
    expect(days('2026-10-19', '2026-10-23')).toBe(5);
  });

  it('skips weekends inside a range', () => {
    // Fri 16th to Mon 19th: Fri + Mon
    expect(days('2026-10-16', '2026-10-19')).toBe(2);
  });

  it('is 0 for a weekend-only range and 1 for a single weekday', () => {
    expect(days('2026-10-17', '2026-10-18')).toBe(0);
    expect(days('2026-10-19', '2026-10-19')).toBe(1);
  });

  it('is 0 when end is before start', () => {
    expect(days('2026-10-23', '2026-10-19')).toBe(0);
  });
});

describe('db date helpers', () => {
  it('round-trip YYYY-MM-DD through @db.Date values', () => {
    expect(fromDbDate(toDbDate('2026-02-28'))).toBe('2026-02-28');
    expect(toDbDate('2026-02-28').toISOString()).toBe('2026-02-28T00:00:00.000Z');
  });
});

describe('isValidTimezone', () => {
  it('accepts IANA names and rejects anything else', () => {
    expect(isValidTimezone('Asia/Kuala_Lumpur')).toBe(true);
    expect(isValidTimezone('UTC')).toBe(true);
    expect(isValidTimezone('EST (UTC-5)')).toBe(false);
    expect(isValidTimezone('Mars/Olympus')).toBe(false);
    expect(isValidTimezone('')).toBe(false);
    expect(isValidTimezone(42)).toBe(false);
  });
});
