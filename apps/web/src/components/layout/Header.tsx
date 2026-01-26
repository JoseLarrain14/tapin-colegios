'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const userName = user?.guardian
    ? `${user.guardian.firstName} ${user.guardian.lastName}`
    : user?.email || 'Usuario';

  return (
    <header className="h-16 bg-white border-b border-border px-4 md:px-6 flex items-center justify-between md:hidden">
      {/* Logo - mobile only since sidebar has it on desktop */}
      <Link href="/" className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-white font-bold">T</span>
        </div>
        <span className="text-xl font-bold text-text">Tap In</span>
      </Link>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 p-1 rounded-lg hover:bg-surface transition-colors"
        >
          <Avatar name={userName} size="sm" />
          <ChevronDown className={cn(
            'h-4 w-4 text-text-secondary transition-transform',
            menuOpen && 'rotate-180'
          )} />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-border z-50">
              <div className="p-3 border-b border-border">
                <p className="text-sm font-medium text-text truncate">{userName}</p>
                <p className="text-xs text-text-secondary truncate">{user?.email}</p>
              </div>
              <div className="p-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-surface rounded-md transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesion
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
