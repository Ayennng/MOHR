'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Alert, Button, inputClass } from '@/components/ui';
import { FormField, PasswordInput } from './form-field';

// Same password policy as the backend (8-72 characters, a letter and a number)
const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().trim().min(2, 'Last name must be at least 2 characters'),
    email: z.email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be at most 72 characters')
      .regex(/[A-Za-z]/, 'Password must contain a letter')
      .regex(/[0-9]/, 'Password must contain a number'),
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
    position: z.string().trim().min(2, 'Position is required'),
    department: z.string().trim().min(2, 'Department is required'),
    phone: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async ({ firstName, lastName, email, password, position, department, phone }: RegisterFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await api('/api/auth/register', {
        method: 'POST',
        json: { firstName, lastName, email, password, position, department, phone },
      });
      router.push('/login?registered=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-medium text-ink-900">Create account</h1>
      <p className="mt-1.5 mb-8 text-[15px] text-ink-600">You can sign in as soon as it is created</p>

      {error && (
        <div className="mb-5">
          <Alert>{error}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="First name" error={errors.firstName?.message} required>
            <input type="text" placeholder="John" className={inputClass} {...register('firstName')} />
          </FormField>
          <FormField label="Last name" error={errors.lastName?.message} required>
            <input type="text" placeholder="Doe" className={inputClass} {...register('lastName')} />
          </FormField>
        </div>

        <FormField label="Email" error={errors.email?.message} required>
          <input type="email" placeholder="you@company.com" className={inputClass} autoComplete="email" {...register('email')} />
        </FormField>

        <FormField label="Password" error={errors.password?.message} required>
          <PasswordInput placeholder="At least 8 characters, a letter and a number" autoComplete="new-password" {...register('password')} />
        </FormField>

        <FormField label="Confirm password" error={errors.confirmPassword?.message} required>
          <PasswordInput placeholder="Same password again" autoComplete="new-password" {...register('confirmPassword')} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Position" error={errors.position?.message} required>
            <input type="text" placeholder="Developer" className={inputClass} {...register('position')} />
          </FormField>
          <FormField label="Department" error={errors.department?.message} required>
            <input type="text" placeholder="Finance" className={inputClass} {...register('department')} />
          </FormField>
        </div>

        <FormField label="Phone (optional)" error={errors.phone?.message}>
          <input type="tel" placeholder="+60 00-0000000" className={inputClass} {...register('phone')} />
        </FormField>

        <Button type="submit" size="lg" isLoading={isLoading} className="w-full">
          {isLoading ? 'Creating account' : 'Create account'}
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-ink-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-ink-900 underline decoration-mint-400 decoration-2 underline-offset-4 transition-colors duration-150 hover:decoration-mint-700">
          Sign in
        </Link>
      </div>
    </div>
  );
}
