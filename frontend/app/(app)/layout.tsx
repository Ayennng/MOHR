'use client';

import Header from '@/components/dashboard/header';
import Sidebar from '@/components/dashboard/sidebar';
import { SidebarProvider, useSidebar } from '@/components/dashboard/sidebar-context';

// Shared shell (header + sidebar) for every signed-in page in the (app) route group.
// Route groups don't change URLs: app/(app)/leave/page.tsx is still /leave.
function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useSidebar();

  return (
    <div className="min-h-screen bg-linear-to-b from-moss-50 to-white">
      <Header />
      <div className="flex h-screen pt-16">
        <Sidebar />
        <main className={`flex-1 overflow-y-auto transition-[margin] duration-400 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">{children}</div>
          </div>
        </main>
      </div>
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
