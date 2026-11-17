import Link from 'next/link';
import { Home } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';
import { StatusPage } from '@/components/ui/status-page';

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="Page not found"
      actions={
        <Link href="/dashboard" className={buttonClass()}>
          <Home size={16} />
          Go to dashboard
        </Link>
      }
    >
      This page doesn&apos;t exist, or it has moved.
    </StatusPage>
  );
}
