import path from 'path';
import { randomUUID } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';

/**
 * Uploaded files live outside `public/` so they are never served without an
 * access check; `/api/files/...` serves them after authenticating the caller.
 * Paths into UPLOADS_DIR carry `turbopackIgnore` so the build doesn't try to bundle
 * runtime uploads (or the whole project) into the server output.
 */
export const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(process.cwd(), 'uploads');

export type UploadFolder = 'avatars' | 'leave-attachments';
export type FileType = 'jpg' | 'png' | 'webp' | 'pdf';

export const CONTENT_TYPES: Record<FileType, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

/** Public URL prefix stored in the database, e.g. `/api/files/avatars/<uuid>.jpg`. */
const URL_PREFIX = '/api/files/';
const KEY_PATTERN = /^(avatars|leave-attachments)\/[A-Za-z0-9_-]+\.(jpg|png|webp|pdf)$/;

/** Identifies a file by its leading bytes; the client-supplied name and MIME type are not trusted. */
export function detectFileType(buffer: Buffer): FileType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'pdf';
  return null;
}

/** Storage key (`folder/name.ext`) for a stored URL, or null if it isn't a valid upload URL. */
export function keyFromUrl(url: string | null | undefined): string | null {
  if (!url?.startsWith(URL_PREFIX)) return null;
  const key = url.slice(URL_PREFIX.length);
  return KEY_PATTERN.test(key) ? key : null;
}

export function isValidKey(key: string) {
  return KEY_PATTERN.test(key);
}

/** Saves `buffer` under a random name and returns the URL to store in the database. */
export async function saveUpload(folder: UploadFolder, type: FileType, buffer: Buffer) {
  const dir = path.join(/*turbopackIgnore: true*/ UPLOADS_DIR, folder);
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${type}`;
  await writeFile(path.join(/*turbopackIgnore: true*/ dir, filename), buffer);
  return `${URL_PREFIX}${folder}/${filename}`;
}

export async function readUpload(key: string) {
  if (!isValidKey(key)) return null;
  try {
    return await readFile(path.join(/*turbopackIgnore: true*/ UPLOADS_DIR, key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/** Deletes the file behind a stored URL; missing files are ignored. */
export async function deleteUpload(url: string | null | undefined) {
  const key = keyFromUrl(url);
  if (!key) return;
  try {
    await unlink(path.join(/*turbopackIgnore: true*/ UPLOADS_DIR, key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}
