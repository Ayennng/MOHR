import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/** Trimmed, lower-cased email so lookups and uniqueness are case-insensitive. */
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Invalid email format'));

/** Password policy. bcrypt only uses the first 72 bytes, so longer input is rejected. */
export const passwordSchema = z
  .string('Password is required')
  .min(8, 'Password must be at least 8 characters long')
  .max(72, 'Password must be at most 72 characters long')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

/** Calendar date as YYYY-MM-DD (what `<input type="date">` sends). */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must be in YYYY-MM-DD format')
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), 'Invalid date');

/** Optional free-text field: blank strings become null. */
export const optionalTextSchema = z
  .string()
  .trim()
  .max(200)
  .optional()
  .nullable()
  .transform((s) => (s ? s : null));

/**
 * 413 response if the declared body size exceeds `maxBytes`, else null. Checked before
 * `req.formData()`, which would otherwise buffer an arbitrarily large upload in memory.
 */
export function rejectIfTooLarge(req: NextRequest, maxBytes: number) {
  const length = Number(req.headers.get('content-length'));
  if (!length || length <= maxBytes) return null;
  return NextResponse.json(
    { error: `Request too large (max ${Math.floor(maxBytes / (1024 * 1024))}MB)` },
    { status: 413 }
  );
}

export function validationError(error: z.ZodError) {
  const issue = error.issues[0];
  return NextResponse.json(
    { error: issue?.message ?? 'Invalid input', field: issue?.path.join('.') || undefined },
    { status: 400 }
  );
}

/**
 * Parses the JSON body against `schema`. Returns the parsed data, or a 400
 * response to return as-is (same pattern as `withAuth`).
 */
export async function parseJson<T extends z.ZodType>(
  req: NextRequest,
  schema: T
): Promise<z.infer<T> | NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = schema.safeParse(body);
  return result.success ? result.data : validationError(result.error);
}
