import { AuthHero } from '@/components/auth/auth-hero';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata = {
  title: 'Create Account | MoHR',
  description: 'Create a new MoHR account',
};

export default function RegisterPage() {
  return (
    <AuthHero title="Join Our Growth" subtitle="Start your journey with us. Simple, secure, and seamless HR management.">
      <RegisterForm />
    </AuthHero>
  );
}
