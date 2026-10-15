import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** Random 16-character password for admin-created accounts. */
export function generateTemporaryPassword() {
  return randomBytes(12).toString('base64url');
}
