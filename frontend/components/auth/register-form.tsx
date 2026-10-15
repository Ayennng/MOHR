'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FormField } from './form-field';

const registerSchema = z.object({
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters'),
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters'),
  email: z.string()
    .email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  confirmPassword: z.string()
    .min(1, 'Password confirmation is required'),
  position: z.string()
    .min(2, 'Position is required'),
  department: z.string()
    .min(2, 'Department is required'),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Call frontend API route which proxies to backend
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          position: data.position,
          department: data.department,
          phone: data.phone,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        router.push('/login?registered=true');
      } else {
        setError(result.error || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      const errorMessage = 'Unable to connect to server. Please try again later.';
      setError(errorMessage);
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="auth-heading">Create Account</h1>
      <p className="auth-subheading">Join us and start managing your work efficiently</p>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group-row">
          <FormField label="First Name" error={errors.firstName?.message} required fullWidth={false}>
            <input
              type="text"
              placeholder="John"
              className="form-input"
              {...register('firstName')}
            />
          </FormField>

          <FormField label="Last Name" error={errors.lastName?.message} required fullWidth={false}>
            <input
              type="text"
              placeholder="Doe"
              className="form-input"
              {...register('lastName')}
            />
          </FormField>
        </div>

        <FormField label="Email" error={errors.email?.message} required>
          <input
            type="email"
            placeholder="your@email.com"
            className="form-input"
            {...register('email')}
          />
        </FormField>

        <FormField label="Password" error={errors.password?.message} required>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
              className="form-input"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="password-toggle"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </button>
          </div>
        </FormField>

        <FormField label="Confirm Password" error={errors.confirmPassword?.message} required>
          <div className="password-input-wrapper">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              className="form-input"
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="password-toggle"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </button>
          </div>
        </FormField>

        <div className="form-group-row">
          <FormField label="Position" error={errors.position?.message} required fullWidth={false}>
            <input
              type="text"
              placeholder="e.g., Developer"
              className="form-input"
              {...register('position')}
            />
          </FormField>

          <FormField label="Department" error={errors.department?.message} required fullWidth={false}>
            <input
              type="text"
              placeholder="e.g., Finance"
              className="form-input"
              {...register('department')}
            />
          </FormField>
        </div>

        <FormField label="Phone (Optional)" error={errors.phone?.message}>
          <input
            type="tel"
            placeholder="+60 00-0000000"
            className="form-input"
            {...register('phone')}
          />
        </FormField>

        <button
          type="submit"
          disabled={isLoading}
          className={`btn btn-primary ${isLoading ? 'btn-loading' : ''}`}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="auth-link">
        Already have an account?{' '}
        <Link href="/login">
          Sign in
        </Link>
      </div>
    </div>
  );
}
