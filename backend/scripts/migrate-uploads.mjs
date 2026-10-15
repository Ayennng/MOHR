// One-off migration: move uploads out of public/uploads (served to anyone) into the
// private uploads/ directory served by the authenticated /api/files route, and
// rewrite the stored URLs from /uploads/... to /api/files/....
//
// Files no database row points to are moved to uploads/orphaned/ (kept, but not
// servable) rather than deleted.
//
// Usage (from backend/):  node scripts/migrate-uploads.mjs
// Reads DATABASE_URL from the environment or .env.local. Safe to re-run.

import { existsSync, readFileSync } from 'fs';
import { mkdir, readdir, rename } from 'fs/promises';
import path from 'path';
import pg from 'pg';

const root = process.cwd();
const publicDir = path.join(root, 'public', 'uploads');
const uploadsDir = process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.join(root, 'uploads');
const VALID_NAME = /^[A-Za-z0-9_-]+\.(jpg|png|webp|pdf)$/;

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync(path.join(root, '.env.local'), 'utf8');
  const match = env.match(/^DATABASE_URL="?([^"\r\n]+)/m);
  if (!match) throw new Error('DATABASE_URL not set');
  return match[1];
}

async function moveFile(from, to) {
  await mkdir(path.dirname(to), { recursive: true });
  await rename(from, to);
}

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();

const referenced = [
  ...(await client.query(`SELECT 'User' AS tbl, 'avatar' AS col, id, avatar AS url FROM "User" WHERE avatar LIKE '/uploads/%'`)).rows,
  ...(await client.query(`SELECT 'LeaveRequest' AS tbl, 'attachment' AS col, id, attachment AS url FROM "LeaveRequest" WHERE attachment LIKE '/uploads/%'`)).rows,
];

const moved = new Set();
for (const row of referenced) {
  const relative = row.url.slice('/uploads/'.length); // e.g. avatars/x.jpg
  const [folder, name] = relative.split('/');
  const source = path.join(publicDir, folder, name);

  if (!VALID_NAME.test(name) || !['avatars', 'leave-attachments'].includes(folder)) {
    console.warn(`SKIP ${row.tbl}.${row.col} ${row.id}: unsupported file name ${row.url}`);
    continue;
  }
  if (existsSync(source)) {
    await moveFile(source, path.join(uploadsDir, folder, name));
  } else if (!existsSync(path.join(uploadsDir, folder, name))) {
    console.warn(`MISSING ${row.tbl}.${row.col} ${row.id}: ${row.url} not found on disk`);
  }
  await client.query(`UPDATE "${row.tbl}" SET "${row.col}" = $1 WHERE id = $2`, [`/api/files/${folder}/${name}`, row.id]);
  moved.add(source);
  console.log(`MOVED ${row.url} -> /api/files/${folder}/${name}`);
}

// Anything left in public/uploads isn't referenced: keep it, but out of public reach
for (const folder of existsSync(publicDir) ? await readdir(publicDir) : []) {
  for (const name of await readdir(path.join(publicDir, folder))) {
    const source = path.join(publicDir, folder, name);
    if (moved.has(source)) continue;
    await moveFile(source, path.join(uploadsDir, 'orphaned', folder, name));
    console.log(`ORPHANED ${folder}/${name} -> uploads/orphaned/${folder}/${name}`);
  }
}

await client.end();
console.log('Done.');
