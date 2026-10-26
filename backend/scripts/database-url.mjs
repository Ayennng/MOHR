import { readFileSync } from 'fs';
import path from 'path';

/** DATABASE_URL from the environment, else from .env.local in the current directory (backend/). */
export function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  const match = env.match(/^DATABASE_URL="?([^"\r\n]+)/m);
  if (!match) throw new Error('DATABASE_URL not set');
  return match[1];
}
