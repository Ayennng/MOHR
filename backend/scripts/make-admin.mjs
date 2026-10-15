// Promote an existing account to ADMIN (and reactivate it). Self-registration always
// creates EMPLOYEE accounts, so this is how a fresh install gets its first admin;
// after that, admins manage roles in Settings → Users.
//
// Usage (from backend/):  node scripts/make-admin.mjs someone@example.com
// Reads DATABASE_URL from the environment or .env.local.

import { readFileSync } from 'fs';
import path from 'path';
import pg from 'pg';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: node scripts/make-admin.mjs <email>');
  process.exit(1);
}

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  const match = env.match(/^DATABASE_URL="?([^"\r\n]+)/m);
  if (!match) throw new Error('DATABASE_URL not set');
  return match[1];
}

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();

try {
  const { rows } = await client.query(
    `UPDATE "User" SET role = 'ADMIN', active = true, "updatedAt" = now()
     WHERE lower(email) = $1 RETURNING id, email`,
    [email]
  );

  if (rows.length === 0) {
    console.error(`No account found for ${email}. Register it first (the /register page), then re-run.`);
    process.exitCode = 1;
  } else {
    await client.query(`UPDATE "Employee" SET status = 'ACTIVE' WHERE "userId" = $1 AND status = 'INACTIVE'`, [rows[0].id]);
    console.log(`${rows[0].email} is now an ADMIN. Sign out and back in to see the admin menus.`);
  }
} finally {
  await client.end();
}
