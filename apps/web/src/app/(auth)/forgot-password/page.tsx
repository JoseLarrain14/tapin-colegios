'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { apiService } from '@/lib/api';
import { Button, Input, Card } from '@/components/ui';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const validateEmail = () => {
    if (!email.trim()) {
      setError('El correo es requerido');
      return false;
    }
    if (!emailRegex.test(email)) {
      setError('Ingresa un correo valido');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail()) return;

    setIsLoading(true);
    setError(null);

    try {
      await apiService.forgotPassword(email.trim().toLowerCase());
      // Always show success message for security (don't reveal if email exists)
      setSubmitted(true);
    } catch {
      // Always show success message for security
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
            <Check className="h-8 w-8 text-success" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-text mb-2">Revisa tu correo</h1>
        <p className="text-text-secondary mb-6">
          Si el correo existe, recibiras un enlace para restablecer tu contrasena
        </p>

        <Link
          href="/login"
          className="text-primary font-medium hover:underline"
        >
          Volver al inicio de sesion
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text mb-2">Recuperar contrasena</h1>
        <p className="text-text-secondary">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contrasena
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Correo electronico"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          error={error || undefined}
          placeholder="tu@email.com"
          autoComplete="email"
          autoCapitalize="none"
          autoFocus
        />

        <Button
          type="submit"
          fullWidth
          loading={isLoading}
          disabled={isLoading}
        >
          Enviar enlace
        </Button>
      </form>

      {/* Back to login */}
      <div className="mt-6 text-center">
        <span className="text-text-secondary">Recordaste tu contrasena? </span>
        <Link href="/login" className="text-primary font-medium hover:underline">
          Iniciar sesion
        </Link>
      </div>
    </Card>
  );
}
