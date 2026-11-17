import { AuthHero } from '@/components/auth/auth-hero';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata = {
  title: 'Create Account | MoHR',
  description: 'Create a new MoHR account',
};

export default function RegisterPage() {
  return (
    <AuthHero
      title="Your workday, in one place"
      subtitle="Check in, request leave and book meeting rooms from one account."
    >
      <RegisterForm />
    </AuthHero>
  );
}
