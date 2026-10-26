'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';
import { Button, buttonClass } from '@/components/ui';
import { StatusPage } from '@/components/ui/status-page';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      code="500"
      title="Oops! Something went wrong"
      actions={
        <>
          <Button onClick={reset}>Try Again</Button>
          <Link href="/dashboard" className={buttonClass('outline')}>
            <Home size={20} />
            Go to Dashboard
          </Link>
        </>
      }
    >
      <p>Something unexpected happened. Try again, and if it keeps happening, contact your administrator.</p>
      {error.digest && <p className="mt-3 text-sm font-mono">Reference: {error.digest}</p>}
    </StatusPage>
  );
}
