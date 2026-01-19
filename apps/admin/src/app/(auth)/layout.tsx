import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Iniciar Sesión - Tap In Colegios',
}

/**
 * Auth Layout
 * - Simple centered layout for authentication pages
 * - No sidebar or navigation
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
