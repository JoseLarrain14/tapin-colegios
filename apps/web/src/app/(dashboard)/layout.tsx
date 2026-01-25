import { type ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - desktop only */}
      <Sidebar />

      {/* Main content */}
      <main className="md:pl-64 pb-20 md:pb-0">
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          {children}
        </div>
      </main>

      {/* Bottom navigation - mobile only */}
      <BottomNav />
    </div>
  );
}
