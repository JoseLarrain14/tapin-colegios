'use client'

import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  School,
  Users,
  ShoppingCart,
  Receipt,
  Settings,
  LogOut,
  Menu,
  X,
  Package,
  GraduationCap,
  Utensils,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

/**
 * Dashboard Layout
 *
 * Features:
 * - Responsive sidebar navigation
 * - Mobile menu toggle
 * - User info display
 * - Logout functionality
 * - Active route highlighting
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    // Clear cookie
    document.cookie = 'tapin-auth-token=; path=/; max-age=0'
    router.push('/login')
  }

  // Navigation items - filter based on user role (US-035)
  const isSchoolAdmin = user?.role === 'school_admin'

  const navItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/pos', icon: Utensils, label: 'POS Casino' },
    { href: '/menu', icon: ShoppingCart, label: 'Menú' },
    { href: '/packages', icon: Package, label: 'Paquetes' },
    { href: '/students', icon: GraduationCap, label: 'Estudiantes' },
    { href: '/transactions', icon: Receipt, label: 'Transacciones' },
    // Only show Colegios for super_admin (US-035)
    ...(!isSchoolAdmin ? [{ href: '/schools', icon: School, label: 'Colegios' }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Tap In Colegios
        </h1>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          {/* Logo */}
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              Tap In Colegios
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Panel de Administración
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-thin">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            {user && (
              <div className="mb-3 px-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.name || user.email.split('@')[0]}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                  {user.role}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}>
            <aside
              className="absolute inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Logo */}
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  Tap In Colegios
                </h1>
              </div>

              {/* Navigation */}
              <nav className="px-4 py-6 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}
              </nav>

              {/* User Info & Logout */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                {user && (
                  <div className="mb-3 px-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.name || user.email.split('@')[0]}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Cerrar Sesión</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 lg:pl-64">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
