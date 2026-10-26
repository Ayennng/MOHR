'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FormField, PasswordInput } from './form-field';

const loginSchema = z.object({
  email: z.email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Shared demo logins, created and reset nightly by backend/scripts/reset-demo.mjs
const DEMO_PASSWORD = 'Demo1234';
const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'demo.admin@example.com' },
  { role: 'Manager', email: 'demo.manager@example.com' },
  { role: 'Employee', email: 'demo.employee@example.com' },
];

export function LoginForm({ showDemo = false, registered = false }: { showDemo?: boolean; registered?: boolean }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wake the backend while the user types, so a sleeping free instance doesn't
  // add a second wait on submit
  useEffect(() => {
    fetch('/api/health', { cache: 'no-store' }).catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', { ...data, redirect: false });

      if (!result?.ok) {
        // "CredentialsSignin" is NextAuth's code for a rejected login; anything else
        // is a message thrown by authorize() (e.g. too many attempts)
        setError(
          !result?.error || result.error === 'CredentialsSignin' ? 'Invalid email or password' : result.error
        );
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="auth-heading">Welcome Back !</h1>
      <p className="auth-subheading">Sign in to your account to continue</p>

      {registered && !error && <div className="success-message">Account created. Sign in to continue.</div>}
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit(onSubmit)}>
        <FormField label="Email" error={errors.email?.message} required>
          <input type="email" placeholder="your@email.com" className="form-input" autoComplete="email" {...register('email')} />
        </FormField>

        <FormField label="Password" error={errors.password?.message} required>
          <PasswordInput placeholder="Enter your password" autoComplete="current-password" {...register('password')} />
        </FormField>

        <button type="submit" disabled={isLoading} className={`btn btn-primary ${isLoading ? 'btn-loading' : ''}`}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {showDemo && (
        <div className="demo-panel">
          <p className="demo-panel-title">Just looking? Try the demo</p>
          <div className="demo-panel-buttons">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                disabled={isLoading}
                className="btn demo-button"
                onClick={() => onSubmit({ email: account.email, password: DEMO_PASSWORD })}
              >
                {account.role}
              </button>
            ))}
          </div>
          <p className="demo-panel-note">
            Sample company data, reset every night. Password for all three: {DEMO_PASSWORD}
          </p>
        </div>
      )}

      <div className="auth-link">
        Don&apos;t have an account? <Link href="/register">Create one</Link>
      </div>
    </div>
  );
}
