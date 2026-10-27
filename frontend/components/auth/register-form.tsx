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
      <h1 className="text-4xl font-bold text-mint-950">Create Account</h1>
      <p className="mt-2 mb-8 text-mint-700">Join us and start managing your work efficiently</p>

      {error && (
        <div className="mb-5">
          <Alert>{error}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="First Name" error={errors.firstName?.message} required>
            <input type="text" placeholder="John" className={inputClass} {...register('firstName')} />
          </FormField>
          <FormField label="Last Name" error={errors.lastName?.message} required>
            <input type="text" placeholder="Doe" className={inputClass} {...register('lastName')} />
          </FormField>
        </div>

        <FormField label="Email" error={errors.email?.message} required>
          <input type="email" placeholder="your@email.com" className={inputClass} autoComplete="email" {...register('email')} />
        </FormField>

        <FormField label="Password" error={errors.password?.message} required>
          <PasswordInput placeholder="Create a strong password" autoComplete="new-password" {...register('password')} />
        </FormField>

        <FormField label="Confirm Password" error={errors.confirmPassword?.message} required>
          <PasswordInput placeholder="Confirm your password" autoComplete="new-password" {...register('confirmPassword')} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Position" error={errors.position?.message} required>
            <input type="text" placeholder="e.g., Developer" className={inputClass} {...register('position')} />
          </FormField>
          <FormField label="Department" error={errors.department?.message} required>
            <input type="text" placeholder="e.g., Finance" className={inputClass} {...register('department')} />
          </FormField>
        </div>

        <FormField label="Phone (Optional)" error={errors.phone?.message}>
          <input type="tel" placeholder="+60 00-0000000" className={inputClass} {...register('phone')} />
        </FormField>

        <Button type="submit" size="lg" isLoading={isLoading} className="w-full">
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-mint-700">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-mint-900 underline decoration-mint-300 decoration-2 underline-offset-4 transition-colors hover:decoration-mint-600">
          Sign in
        </Link>
      </div>
    </div>
  );
}
