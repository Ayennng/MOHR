import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectFileType, isValidKey, keyFromUrl } from '@/lib/uploads';
import { emailSchema, passwordSchema, dateStringSchema, optionalTextSchema } from '@/lib/validation';
import { parsePagination, parseSortDirection } from '@/lib/pagination';
import { createRateLimiter, tooManyAttemptsMessage } from '@/lib/rate-limit';
import { formatEmployeeId } from '@/lib/employee';
import { remainingLeaveDays } from '@/lib/leave';
import { ApiError, errorResponse } from '@/lib/http';
import { generateTemporaryPassword } from '@/lib/auth';

describe('detectFileType', () => {
  it('recognises files by their bytes', () => {
    expect(detectFileType(Buffer.from('%PDF-1.4\n...'))).toBe('pdf');
    expect(detectFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpg');
    expect(detectFileType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('png');
    expect(detectFileType(Buffer.from('RIFF\0\0\0\0WEBPVP8 '))).toBe('webp');
  });

  it('rejects anything else, whatever it is called', () => {
    expect(detectFileType(Buffer.from('<html><script>alert(1)</script>'))).toBeNull();
    expect(detectFileType(Buffer.from('PK\x03\x04 a zip / docx'))).toBeNull();
    expect(detectFileType(Buffer.alloc(0))).toBeNull();
  });
});

describe('upload keys', () => {
  it('accepts only our own folder/name.ext keys', () => {
    expect(isValidKey('avatars/3f1c-uuid.jpg')).toBe(true);
    expect(isValidKey('leave-attachments/abc_DEF-1.pdf')).toBe(true);
  });

  it('rejects traversal and unknown folders or extensions', () => {
    expect(isValidKey('../.env.local')).toBe(false);
    expect(isValidKey('avatars/../../.env.local')).toBe(false);
    expect(isValidKey('orphaned/avatars/x.jpg')).toBe(false);
    expect(isValidKey('avatars/x.html')).toBe(false);
    expect(isValidKey('avatars/x.jpg/')).toBe(false);
  });

  it('maps stored URLs back to keys', () => {
    expect(keyFromUrl('/api/files/avatars/x.jpg')).toBe('avatars/x.jpg');
    expect(keyFromUrl('/uploads/avatars/x.jpg')).toBeNull();
    expect(keyFromUrl('/api/files/../secret')).toBeNull();
    expect(keyFromUrl(null)).toBeNull();
  });
});

describe('validation schemas', () => {
  it('normalises emails', () => {
    expect(emailSchema.parse('  John.Doe@Example.COM ')).toBe('john.doe@example.com');
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
  });

  it('enforces the password policy', () => {
    expect(passwordSchema.safeParse('Passw0rd').success).toBe(true);
    expect(passwordSchema.safeParse('short1').success).toBe(false); // too short
    expect(passwordSchema.safeParse('lettersonly').success).toBe(false); // no number
    expect(passwordSchema.safeParse('12345678').success).toBe(false); // no letter
    expect(passwordSchema.safeParse('a1'.repeat(37)).success).toBe(false); // over bcrypt's 72 bytes
  });

  it('accepts only real YYYY-MM-DD dates', () => {
    expect(dateStringSchema.safeParse('2026-10-15').success).toBe(true);
    expect(dateStringSchema.safeParse('2026-13-01').success).toBe(false);
    expect(dateStringSchema.safeParse('15/10/2026').success).toBe(false);
  });

  it('turns blank optional text into null', () => {
    expect(optionalTextSchema.parse('  ')).toBeNull();
    expect(optionalTextSchema.parse(undefined)).toBeNull();
    expect(optionalTextSchema.parse(' IT ')).toBe('IT');
  });
});

describe('parsePagination', () => {
  const parse = (query: string) => parsePagination(new URLSearchParams(query));

  it('defaults to page 1 of 25', () => {
    expect(parse('')).toEqual({ page: 1, pageSize: 25, skip: 0, take: 25 });
  });

  it('computes skip from page and size', () => {
    expect(parse('page=3&pageSize=10')).toMatchObject({ skip: 20, take: 10 });
  });

  it('clamps nonsense and oversized values', () => {
    expect(parse('page=-5&pageSize=100000')).toMatchObject({ page: 1, pageSize: 100 });
    expect(parse('page=abc&pageSize=0')).toMatchObject({ page: 1, pageSize: 25 });
  });

  it('accepts only asc/desc as sort direction', () => {
    expect(parseSortDirection(new URLSearchParams('dir=asc'))).toBe('asc');
    expect(parseSortDirection(new URLSearchParams('dir=DROP TABLE'))).toBe('desc');
  });
});

describe('createRateLimiter', () => {
  afterEach(() => vi.useRealTimers());

  it('blocks after the limit until the window passes', () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });

    for (let i = 0; i < 3; i++) {
      expect(limiter.retryAfter('a')).toBe(0);
      limiter.hit('a');
    }
    expect(limiter.retryAfter('a')).toBe(60);
    expect(limiter.retryAfter('b')).toBe(0); // keys are independent

    vi.advanceTimersByTime(60_000);
    expect(limiter.retryAfter('a')).toBe(0);
  });

  it('reset clears a key', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    limiter.hit('a');
    limiter.reset('a');
    expect(limiter.retryAfter('a')).toBe(0);
  });

  it('formats the lockout message in minutes', () => {
    expect(tooManyAttemptsMessage(900)).toBe('Too many failed attempts. Try again in 15 minutes.');
    expect(tooManyAttemptsMessage(30)).toBe('Too many failed attempts. Try again in 1 minute.');
  });
});

describe('employee helpers', () => {
  it('formats employee IDs', () => {
    expect(formatEmployeeId(7)).toBe('EMP0007');
    expect(formatEmployeeId(12345)).toBe('EMP12345');
  });

  it('computes remaining leave per type', () => {
    const balance = {
      id: 'b', employeeId: 'e', year: 2026, updatedAt: new Date(),
      vacationDays: 20, sickDays: 10, personalDays: 5,
      usedVacation: 7, usedSick: 10, usedPersonal: 0,
    };
    expect(remainingLeaveDays(balance, 'VACATION')).toBe(13);
    expect(remainingLeaveDays(balance, 'SICK')).toBe(0);
    expect(remainingLeaveDays(balance, 'UNPAID')).toBeNull(); // not limited by a balance
  });

  it('generates unique 16-character temporary passwords', () => {
    const a = generateTemporaryPassword();
    expect(a).toHaveLength(16);
    expect(a).not.toBe(generateTemporaryPassword());
  });
});

describe('errorResponse', () => {
  it('passes an ApiError through with its own status and message', async () => {
    const response = errorResponse(new ApiError(409, 'Already decided'), 'test');
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'Already decided' });
  });

  it('hides anything else behind a logged 500', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = errorResponse(new Error('connection string leaked'), 'test');
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal server error' });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
