import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

/** `{ error }` response; every error the API returns has this shape. */
export function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

/**
 * An expected failure with a message that is safe to show the user. Throw it from
 * inside a transaction to abort it; `errorResponse` turns it into a response.
 */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Response for an error caught by a route: its own status for an ApiError, else a logged 500. */
export function errorResponse(error: unknown, context: string) {
  if (error instanceof ApiError) return jsonError(error.status, error.message);
  console.error(`${context}:`, error);
  return jsonError(500, 'Internal server error');
}

/** True for a unique-constraint violation (e.g. two requests creating the same row). */
export function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
