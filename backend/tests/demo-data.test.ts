import { describe, expect, it } from 'vitest';
import { DEMO_EMAILS } from '@/lib/demo';
import { addDays, isWeekday, people, planBookings, planLeaves } from '@/scripts/demo-data.mjs';

type Person = { email?: string };
type Planned = { start: string; end: string };

// Every day of a year, including weekends and the turn of the year
const days = Array.from({ length: 400 }, (_, i) => addDays('2026-10-01', i) as string);

describe('demo data', () => {
  it('lists the same demo logins as the API guards', () => {
    const emails = (people as Person[]).flatMap((p) => (p.email ? [p.email] : []));
    expect(emails.sort()).toEqual([...DEMO_EMAILS].sort());
  });

  it('never plans overlapping leave or bookings, whatever the date', () => {
    for (const today of days) {
      expect(() => planLeaves(today), today).not.toThrow();
      expect(() => planBookings(today), today).not.toThrow();
    }
  });

  it('only plans leave on weekdays', () => {
    for (const today of days) {
      for (const leave of planLeaves(today) as Planned[]) {
        expect(isWeekday(leave.start) && isWeekday(leave.end), `${today}: ${leave.start}`).toBe(true);
      }
    }
  });
});
