'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, Button, inputClass } from '@/components/ui';
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
      <h1 className="text-4xl font-bold text-mint-950">Sign in</h1>
      <p className="mt-2 mb-8 text-mint-700">Sign in to your account to continue</p>

      <div className="mb-5 space-y-3 empty:hidden">
        {registered && !error && <Alert tone="success">Account created. Sign in to continue.</Alert>}
        <Alert>{error}</Alert>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <FormField label="Email" error={errors.email?.message} required>
          <input type="email" placeholder="your@email.com" className={inputClass} autoComplete="email" {...register('email')} />
        </FormField>

        <FormField label="Password" error={errors.password?.message} required>
          <PasswordInput placeholder="Enter your password" autoComplete="current-password" {...register('password')} />
        </FormField>

        <Button type="submit" size="lg" isLoading={isLoading} className="w-full">
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      {showDemo && (
        <div className="mt-8 rounded-card border border-dashed border-mint-900/20 bg-mint-50 p-5">
          <p className="mb-3 text-sm font-semibold text-mint-900">Just looking? Try the demo</p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                variant="outline"
                size="sm"
                disabled={isLoading}
                onClick={() => onSubmit({ email: account.email, password: DEMO_PASSWORD })}
              >
                {account.role}
              </Button>
            ))}
          </div>
          <p className="mt-3 text-xs text-mint-700">
            Sample company data, reset every night. Password for all three: {DEMO_PASSWORD}
          </p>
        </div>
      )}

      <div className="mt-8 text-center text-sm text-mint-700">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-semibold text-mint-900 underline decoration-mint-300 decoration-2 underline-offset-4 transition-colors hover:decoration-mint-600">
          Create one
        </Link>
      </div>
    </div>
  );
}
