'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Button, LoadingSpinner } from '@/components/ui';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">T</span>
          </div>
          <span className="text-2xl font-bold text-text">Tap In</span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-text mb-4">
          Gestiona los pagos escolares
        </h1>
        <p className="text-lg text-text-secondary mb-8 max-w-md">
          Compra tickets, revisa el menu y controla los consumos de tus hijos en el colegio.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/login">
            <Button size="lg">
              Iniciar Sesion
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" size="lg">
              Crear Cuenta
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-text-secondary">
        <p>&copy; {new Date().getFullYear()} Tap In Colegios</p>
      </footer>
    </div>
  );
}
