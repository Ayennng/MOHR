// The demo company used by reset-demo.mjs. Dates are relative to "today" in company
// time, so the dashboard and reports always look current. Kept apart from the reset
// so tests can check the plan without a database.

// Shown on the login page; keep the demo emails in step with lib/demo.ts
export const DEMO_PASSWORD = 'Demo1234';
export const TIMEZONE = 'Asia/Kuala_Lumpur';
const UTC_OFFSET_HOURS = 8; // Malaysia has no daylight saving

// ---------------------------------------------------------------------------
// Dates. Strings are YYYY-MM-DD calendar dates in company time.

export const todayInCompanyTime = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(now);

/** Value for a @db.Date column (or a leave start/end date). */
export const dbDate = (day) => new Date(`${day}T00:00:00.000Z`);

/** The instant the company clock shows `day` at `hour:minute`. */
export const at = (day, hour, minute = 0) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour - UTC_OFFSET_HOURS, minute));
};

export const addDays = (day, n) => {
  const d = dbDate(day);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const isWeekday = (day) => ![0, 6].includes(dbDate(day).getUTCDay());

/** `day` if it's a weekday, else the following Monday. */
export const nextWeekday = (day) => (isWeekday(day) ? day : nextWeekday(addDays(day, 1)));

/** The weekday `n` working days after `day` (n = 0 gives `day`). */
export function addWorkingDays(day, n) {
  let d = day;
  while (n > 0) {
    d = addDays(d, 1);
    if (isWeekday(d)) n--;
  }
  return d;
}

export function workingDaysBetween(start, end) {
  let count = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) if (isWeekday(d)) count++;
  return count;
}

// ---------------------------------------------------------------------------
// People. `key` is only used to refer to them below; `hired` is a date or days ago.

export const people = [
  { key: 'admin', email: 'demo.admin@example.com', firstName: 'Aisyah', lastName: 'Rahman', role: 'ADMIN', department: 'Human Resources', position: 'HR Director', hired: '2021-03-01' },
  { key: 'manager', email: 'demo.manager@example.com', firstName: 'Daniel', lastName: 'Lim', role: 'MANAGER', department: 'Engineering', position: 'Engineering Manager', hired: '2021-08-16' },
  { key: 'employee', email: 'demo.employee@example.com', firstName: 'Nurul', lastName: 'Huda', role: 'EMPLOYEE', department: 'Engineering', position: 'Frontend Developer', hired: '2023-02-06', reportsTo: 'manager' },
  { key: 'arjun', firstName: 'Arjun', lastName: 'Nair', department: 'Engineering', position: 'Backend Developer', hired: '2022-05-09', reportsTo: 'manager' },
  { key: 'weijie', firstName: 'Wei Jie', lastName: 'Tan', department: 'Engineering', position: 'QA Engineer', hired: '2023-09-04', reportsTo: 'manager' },
  { key: 'farah', firstName: 'Farah', lastName: 'Aziz', department: 'Engineering', position: 'DevOps Engineer', hired: 15, reportsTo: 'manager' },
  { key: 'siti', firstName: 'Siti Mariam', lastName: 'Yusof', department: 'Human Resources', position: 'HR Executive', hired: '2022-01-10', reportsTo: 'admin' },
  { key: 'kavitha', firstName: 'Kavitha', lastName: 'Raman', role: 'MANAGER', department: 'Finance', position: 'Finance Manager', hired: '2021-06-01' },
  { key: 'hafiz', firstName: 'Hafiz', lastName: 'Kamal', department: 'Finance', position: 'Accountant', hired: '2022-11-14', reportsTo: 'kavitha' },
  { key: 'meiling', firstName: 'Mei Ling', lastName: 'Chong', department: 'Finance', position: 'Payroll Officer', hired: '2024-04-01', reportsTo: 'kavitha' },
  { key: 'amir', firstName: 'Amir', lastName: 'Hakim', department: 'Marketing', position: 'Marketing Lead', hired: '2022-07-18', reportsTo: 'admin' },
  { key: 'jason', firstName: 'Jason', lastName: 'Wong', department: 'Marketing', position: 'Content Designer', hired: '2024-01-15', reportsTo: 'amir' },
  { key: 'priya', firstName: 'Priya', lastName: 'Menon', department: 'Marketing', position: 'Digital Marketing Executive', hired: 60, reportsTo: 'amir' },
  { key: 'zul', firstName: 'Zulkifli', lastName: 'Osman', department: 'Operations', position: 'Office Administrator', hired: '2021-04-05', reportsTo: 'admin' },
  // Left the company: deactivated, not deleted, so her history stays
  { key: 'grace', firstName: 'Grace', lastName: 'Lee', department: 'Operations', position: 'Facilities Coordinator', hired: '2022-03-07', reportsTo: 'admin', leftDaysAgo: 45 },
];

export const hireDate = (person, today) =>
  typeof person.hired === 'number' ? addDays(today, -person.hired) : person.hired;

// ---------------------------------------------------------------------------
// Leave. `from` is days from today (moved to the next weekday), `days` is working days.

export const leaves = [
  // Approved, in the past
  { who: 'hafiz', type: 'VACATION', from: -60, days: 5, status: 'APPROVED', by: 'kavitha', reason: 'Family trip to Langkawi' },
  { who: 'arjun', type: 'VACATION', from: -40, days: 3, status: 'APPROVED', by: 'manager', reason: "Sister's wedding in Penang" },
  { who: 'employee', type: 'VACATION', from: -30, days: 2, status: 'APPROVED', by: 'manager', reason: 'Long weekend with family' },
  { who: 'siti', type: 'SICK', from: -25, days: 1, status: 'APPROVED', by: 'admin', reason: 'Fever, MC from clinic' },
  { who: 'employee', type: 'SICK', from: -12, days: 1, status: 'APPROVED', by: 'manager', reason: 'Food poisoning' },
  { who: 'jason', type: 'PERSONAL', from: -8, days: 1, status: 'APPROVED', by: 'amir', reason: 'Moving house' },
  // Approved, covering today, so the dashboard shows people on leave
  { who: 'meiling', type: 'VACATION', from: -1, days: 4, status: 'APPROVED', by: 'kavitha', reason: 'Holiday in Bangkok' },
  { who: 'weijie', type: 'SICK', from: 0, days: 1, status: 'APPROVED', by: 'manager', reason: 'Dental surgery' },
  // Approved, upcoming
  { who: 'amir', type: 'VACATION', from: 7, days: 3, status: 'APPROVED', by: 'admin', reason: 'Annual leave' },
  // Rejected and cancelled
  { who: 'priya', type: 'VACATION', from: -20, days: 2, status: 'REJECTED', by: 'admin', reason: 'Short break', rejection: 'Campaign launch week. Could you pick dates after the launch?' },
  { who: 'employee', type: 'PERSONAL', from: -18, days: 1, status: 'REJECTED', by: 'manager', reason: 'Personal matters', rejection: 'Release day for the sprint. Can we move this to next week?' },
  { who: 'farah', type: 'VACATION', from: -6, days: 2, status: 'CANCELLED', reason: 'Trip to Melaka' },
  // Pending, waiting for a manager or admin
  { who: 'hafiz', type: 'PERSONAL', from: 5, days: 1, status: 'PENDING', reason: 'Renewing passport' },
  { who: 'kavitha', type: 'PERSONAL', from: 9, days: 1, status: 'PENDING', reason: "Child's school event" },
  { who: 'farah', type: 'VACATION', from: 10, days: 3, status: 'PENDING', reason: 'Visiting parents in Kuching' },
  { who: 'jason', type: 'VACATION', from: 14, days: 5, status: 'PENDING', reason: 'Trip to Japan' },
  // The demo manager's own request: they can't approve it, the demo admin can
  { who: 'manager', type: 'VACATION', from: 18, days: 2, status: 'PENDING', reason: 'Year-end break' },
  { who: 'employee', type: 'VACATION', from: 21, days: 3, status: 'PENDING', reason: 'Balik kampung for the holidays' },
];

/**
 * Leave with concrete start/end dates for `today`. Throws if two of one person's
 * requests overlap, which the app itself would refuse.
 */
export function planLeaves(today) {
  const planned = leaves.map((l) => {
    const start = nextWeekday(addDays(today, l.from));
    return { ...l, start, end: addWorkingDays(start, l.days - 1) };
  });

  const counted = planned.filter((l) => l.status !== 'CANCELLED');
  for (const a of counted) {
    for (const b of counted) {
      if (a !== b && a.who === b.who && a.start <= b.end && b.start <= a.end) {
        throw new Error(`Overlapping demo leave for ${a.who}: ${a.start} and ${b.start}`);
      }
    }
  }
  return planned;
}

// ---------------------------------------------------------------------------
// Rooms and bookings. `day` is days from today (moved to the next weekday).

export const rooms = [
  { name: 'Boardroom', capacity: 12, location: 'Level 5', amenities: ['Projector', 'Video conferencing', 'Whiteboard'] },
  { name: 'Huddle Room A', capacity: 4, location: 'Level 3', amenities: ['TV screen', 'Whiteboard'] },
  { name: 'Huddle Room B', capacity: 4, location: 'Level 3', amenities: ['TV screen'] },
  { name: 'Training Room', capacity: 20, location: 'Level 2', amenities: ['Projector', 'Whiteboard', 'Sound system'] },
];

export const bookings = [
  { room: 'Boardroom', day: -3, start: 10, end: 11, who: 'admin', purpose: 'Monthly management meeting' },
  { room: 'Huddle Room A', day: -1, start: 14, end: 15, who: 'employee', purpose: 'Design review' },
  { room: 'Boardroom', day: 0, start: 15, end: 16, who: 'manager', purpose: 'Sprint planning' },
  { room: 'Huddle Room A', day: 0, start: 10, end: 11, who: 'arjun', purpose: 'API design discussion' },
  { room: 'Huddle Room B', day: 0, start: 16, end: 17, who: 'employee', purpose: '1:1 with Daniel' },
  { room: 'Training Room', day: 1, start: 9, end: 12, who: 'admin', purpose: 'New hire onboarding' },
  { room: 'Boardroom', day: 1, start: 14, end: 15, who: 'kavitha', purpose: 'Budget review' },
  { room: 'Huddle Room A', day: 2, start: 11, end: 12, who: 'jason', purpose: 'Campaign brainstorm' },
  { room: 'Boardroom', day: 3, start: 9, end: 10, who: 'amir', purpose: 'Agency call', status: 'CANCELLED' },
  { room: 'Training Room', day: 7, start: 14, end: 17, who: 'manager', purpose: 'Security awareness training' },
];

/** Bookings with concrete dates for `today`. Throws if two overlap in one room. */
export function planBookings(today) {
  const planned = bookings.map((b) => ({ ...b, date: nextWeekday(addDays(today, b.day)) }));

  const counted = planned.filter((b) => b.status !== 'CANCELLED');
  for (const a of counted) {
    for (const b of counted) {
      if (a !== b && a.room === b.room && a.date === b.date && a.start < b.end && b.start < a.end) {
        throw new Error(`Overlapping demo booking in ${a.room} on ${a.date}`);
      }
    }
  }
  return planned;
}
