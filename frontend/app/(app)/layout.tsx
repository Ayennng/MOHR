'use client';

import Sidebar from '@/components/dashboard/sidebar';
import { SidebarProvider, useSidebar } from '@/components/dashboard/sidebar-context';

// Shared shell (full-height sidebar + content) for every signed-in page in the (app)
// route group. Route groups don't change URLs: app/(app)/leave/page.tsx is still /leave.
function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useSidebar();

  return (
    <div className="min-h-screen bg-ground">
      <Sidebar />
      <main className={`min-h-screen transition-[margin] duration-300 ease-out-soft ${sidebarOpen ? 'ml-62' : 'ml-18'}`}>
        <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppShell>{children}</AppShell>
    </SidebarProvider>
  );
}
