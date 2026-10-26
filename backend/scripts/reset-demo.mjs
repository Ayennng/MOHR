// Wipes the database and fills it with the demo company from demo-data.mjs: three
// shared demo logins (admin, manager, employee), a dozen colleagues, a year of
// attendance, leave in every state, and rooms with bookings. Run nightly by
// .github/workflows/reset-demo.yml.
//
// DELETES EVERY ROW. Only point it at a demo database.
//
// Usage (from backend/):  node scripts/reset-demo.mjs --yes
// Reads DATABASE_URL from the environment or .env.local.

import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  DEMO_PASSWORD, TIMEZONE, addDays, at, dbDate, hireDate, isWeekday, people, planBookings,
  planLeaves, rooms, todayInCompanyTime, workingDaysBetween,
} from './demo-data.mjs';
import { databaseUrl } from './database-url.mjs';

if (!process.argv.includes('--yes')) {
  console.error('This deletes everything in the database. Re-run with --yes to confirm.');
  process.exit(1);
}

const today = todayInCompanyTime();
const thisYear = Number(today.slice(0, 4));

// Planned before anything is deleted, so a bad plan leaves the database untouched
const leaves = planLeaves(today);
const bookings = planBookings(today);

// Same data all day, different from one day to the next
let seed = Number(today.replaceAll('-', ''));
function random() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randomInt = (min, max) => min + Math.floor(random() * (max - min + 1));

/** Approved leave days, so attendance isn't recorded on them. */
const onLeave = new Set();
for (const l of leaves.filter((l) => l.status === 'APPROVED')) {
  for (let d = l.start; d <= l.end; d = addDays(d, 1)) onLeave.add(`${l.who}:${d}`);
}

const demoHash = await bcrypt.hash(DEMO_PASSWORD, 10);
// Colleagues can't sign in: their password is random and never shown
const lockedHash = await bcrypt.hash(randomBytes(24).toString('hex'), 10);

const prisma = new PrismaClient({
  adapter: new PrismaPg(new pg.Pool({ connectionString: databaseUrl() })),
});

const ids = {}; // person key -> { userId, employeeId }

try {
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(
        'TRUNCATE "RoomBooking", "Attendance", "LeaveRequest", "LeaveBalance", "Employee", "Room", "Upload", "User", "Settings" CASCADE'
      );

      await tx.settings.create({
        data: {
          companyName: 'Demo Company Sdn Bhd',
          companyEmail: 'hr@example.com',
          companyAddress: 'Johor Bahru, Johor, Malaysia',
          timezone: TIMEZONE,
        },
      });

      for (const [i, p] of people.entries()) {
        const left = p.leftDaysAgo !== undefined;
        const user = await tx.user.create({
          data: {
            email: p.email ?? `${p.firstName}.${p.lastName}@example.com`.toLowerCase().replaceAll(' ', ''),
            password: p.email ? demoHash : lockedHash,
            firstName: p.firstName,
            lastName: p.lastName,
            role: p.role ?? 'EMPLOYEE',
            department: p.department,
            phone: `+6012-${310 + i * 41} ${String(4021 + i * 379).slice(-4)}`,
            active: !left,
          },
        });
        ids[p.key] = { userId: user.id };
      }

      // Employee records, with this year's balance matching the approved leave
      for (const [i, p] of people.entries()) {
        const used = { VACATION: 0, SICK: 0, PERSONAL: 0 };
        for (const l of leaves) {
          if (l.who === p.key && l.status === 'APPROVED' && l.type in used && l.start.startsWith(String(thisYear))) {
            used[l.type] += workingDaysBetween(l.start, l.end);
          }
        }

        const employee = await tx.employee.create({
          data: {
            employeeId: `EMP${String(i + 1).padStart(4, '0')}`,
            userId: ids[p.key].userId,
            position: p.position,
            hireDate: dbDate(hireDate(p, today)),
            status: p.leftDaysAgo !== undefined ? 'INACTIVE' : 'ACTIVE',
            reportingTo: p.reportsTo ? ids[p.reportsTo].userId : null,
            leaveBalance: {
              create: {
                year: thisYear,
                vacationDays: 20,
                sickDays: 10,
                personalDays: 5,
                usedVacation: used.VACATION,
                usedSick: used.SICK,
                usedPersonal: used.PERSONAL,
              },
            },
          },
        });
        ids[p.key].employeeId = employee.id;
      }

      for (const l of leaves) {
        // Requested about a week ahead (or a few days ago, for ones still pending)
        const requested = l.status === 'PENDING'
          ? addDays(today, -randomInt(1, 4))
          : addDays(l.start, -randomInt(5, 10));
        const decided = l.status === 'APPROVED' || l.status === 'REJECTED';
        await tx.leaveRequest.create({
          data: {
            employeeId: ids[l.who].employeeId,
            leaveType: l.type,
            startDate: dbDate(l.start),
            endDate: dbDate(l.end),
            reason: l.reason,
            status: l.status,
            approvedBy: decided ? ids[l.by].userId : null,
            approvalDate: decided ? at(addDays(requested, 1), randomInt(9, 17), randomInt(0, 59)) : null,
            rejectionReason: l.rejection ?? null,
            createdAt: at(requested, randomInt(9, 17), randomInt(0, 59)),
          },
        });
      }

      // A year of weekday attendance. Today, everyone but the demo logins has checked
      // in (and not yet out), so visitors can try checking in themselves.
      const attendance = [];
      const firstDay = addDays(today, -365);
      for (const p of people) {
        const hired = hireDate(p, today);
        const from = hired > firstDay ? hired : firstDay;
        const to = p.leftDaysAgo !== undefined ? addDays(today, -p.leftDaysAgo) : today;
        for (let d = from; d <= to; d = addDays(d, 1)) {
          if (!isWeekday(d) || onLeave.has(`${p.key}:${d}`)) continue;
          if (d === today && p.email) continue;

          const roll = random();
          if (roll < 0.03) continue; // absent: no record

          const late = roll > 0.9; // after 09:30, as check-in marks it
          const halfDay = !late && roll > 0.88;
          attendance.push({
            employeeId: ids[p.key].employeeId,
            date: dbDate(d),
            checkInTime: late ? at(d, 9, randomInt(31, 59)) : at(d, 8, randomInt(15, 59)),
            checkOutTime: d === today ? null
              : halfDay ? at(d, 13, randomInt(0, 30))
              : at(d, randomInt(17, 18), randomInt(0, 59)),
            status: late ? 'LATE' : halfDay ? 'HALF_DAY' : 'PRESENT',
          });
        }
      }
      await tx.attendance.createMany({ data: attendance });

      const roomIds = {};
      for (const r of rooms) {
        const room = await tx.room.create({
          data: { ...r, amenities: JSON.stringify(r.amenities), createdBy: ids.admin.userId },
        });
        roomIds[r.name] = room.id;
      }

      for (const b of bookings) {
        await tx.roomBooking.create({
          data: {
            roomId: roomIds[b.room],
            employeeId: ids[b.who].employeeId,
            bookedDate: dbDate(b.date),
            startTime: at(b.date, b.start),
            endTime: at(b.date, b.end),
            purpose: b.purpose,
            status: b.status ?? 'CONFIRMED',
          },
        });
      }

      console.log(
        `Demo data reset for ${today}: ${people.length} people, ${leaves.length} leave requests, ` +
          `${attendance.length} attendance records, ${rooms.length} rooms, ${bookings.length} bookings.`
      );
    },
    { timeout: 60_000 }
  );
} finally {
  await prisma.$disconnect();
}
