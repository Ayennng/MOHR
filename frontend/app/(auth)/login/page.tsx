import { AuthHero } from '@/components/auth/auth-hero';
import { LoginForm } from '@/components/auth/login-form';

export const metadata = {
  title: 'Sign In | MoHR',
  description: 'Sign in to your MoHR account',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ registered?: string }> }) {
  const { registered } = await searchParams;

  return (
    <AuthHero title="Welcome Back" subtitle="Manage your HR efficiently with our modern system designed for growth.">
      <LoginForm showDemo={process.env.DEMO_MODE === 'true'} registered={registered === 'true'} />
    </AuthHero>
  );
}
