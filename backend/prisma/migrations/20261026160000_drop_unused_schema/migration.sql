-- Sessions are JWTs, so the Session table was never written to
DROP TABLE "Session";

-- Settings that no feature ever read (security, notifications, date format)
ALTER TABLE "Settings"
  DROP COLUMN "dateFormat",
  DROP COLUMN "sessionTimeout",
  DROP COLUMN "require2FA",
  DROP COLUMN "ipWhitelist",
  DROP COLUMN "notifyLeaveRequests",
  DROP COLUMN "notifyAttendanceAlert",
  DROP COLUMN "notifySystemUpdates",
  DROP COLUMN "notifyBirthdays";

-- Never set by the app
ALTER TABLE "Attendance" DROP COLUMN "notes";
ALTER TABLE "RoomBooking" DROP COLUMN "notes";

-- Duplicates of unique indexes (or of the leading column of one), plus an index no query uses
DROP INDEX "User_email_idx";
DROP INDEX "Employee_employeeId_idx";
DROP INDEX "LeaveBalance_employeeId_idx";
DROP INDEX "LeaveBalance_year_idx";
DROP INDEX "Attendance_employeeId_idx";
