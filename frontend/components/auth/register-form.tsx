'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
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
      <h1 className="auth-heading">Create Account</h1>
      <p className="auth-subheading">Join us and start managing your work efficiently</p>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group-row">
          <FormField label="First Name" error={errors.firstName?.message} required>
            <input type="text" placeholder="John" className="form-input" {...register('firstName')} />
          </FormField>
          <FormField label="Last Name" error={errors.lastName?.message} required>
            <input type="text" placeholder="Doe" className="form-input" {...register('lastName')} />
          </FormField>
        </div>

        <FormField label="Email" error={errors.email?.message} required>
          <input type="email" placeholder="your@email.com" className="form-input" autoComplete="email" {...register('email')} />
        </FormField>

        <FormField label="Password" error={errors.password?.message} required>
          <PasswordInput placeholder="Create a strong password" autoComplete="new-password" {...register('password')} />
        </FormField>

        <FormField label="Confirm Password" error={errors.confirmPassword?.message} required>
          <PasswordInput placeholder="Confirm your password" autoComplete="new-password" {...register('confirmPassword')} />
        </FormField>

        <div className="form-group-row">
          <FormField label="Position" error={errors.position?.message} required>
            <input type="text" placeholder="e.g., Developer" className="form-input" {...register('position')} />
          </FormField>
          <FormField label="Department" error={errors.department?.message} required>
            <input type="text" placeholder="e.g., Finance" className="form-input" {...register('department')} />
          </FormField>
        </div>

        <FormField label="Phone (Optional)" error={errors.phone?.message}>
          <input type="tel" placeholder="+60 00-0000000" className="form-input" {...register('phone')} />
        </FormField>

        <button type="submit" disabled={isLoading} className={`btn btn-primary ${isLoading ? 'btn-loading' : ''}`}>
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="auth-link">
        Already have an account? <Link href="/login">Sign in</Link>
      </div>
    </div>
  );
}
