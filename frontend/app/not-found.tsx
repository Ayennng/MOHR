import Link from 'next/link';
import { Home } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';
import { StatusPage } from '@/components/ui/status-page';

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="Page Not Found"
      actions={
        <Link href="/dashboard" className={buttonClass()}>
          <Home size={20} />
          Go to Dashboard
        </Link>
      }
    >
      Sorry, the page you&apos;re looking for doesn&apos;t exist or has been moved.
    </StatusPage>
  );
}
