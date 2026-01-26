'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { apiService } from '@/lib/api';
import { Button, Input, Card, LoadingSpinner } from '@/components/ui';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsVerifying(false);
        setIsValidToken(false);
        return;
      }

      try {
        const response = await apiService.verifyResetToken(token);
        setIsValidToken(response.success && response.data?.valid === true);
      } catch {
        setIsValidToken(false);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const validateForm = () => {
    if (!password.trim()) {
      setError('La contrasena es requerida');
      return false;
    }
    if (password.length < 8) {
      setError('La contrasena debe tener al menos 8 caracteres');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !token) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.resetPassword(token, password);
      if (response.success) {
        setSubmitted(true);
      } else {
        setError(response.message || 'Error al restablecer la contrasena');
      }
    } catch {
      setError('Error al restablecer la contrasena. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while verifying token
  if (isVerifying) {
    return (
      <Card className="p-6 text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-text-secondary">Verificando enlace...</p>
      </Card>
    );
  }

  // Invalid or expired token
  if (!isValidToken) {
    return (
      <Card className="p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-error" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-text mb-2">Enlace invalido</h1>
        <p className="text-text-secondary mb-6">
          Este enlace ha expirado o no es valido. Por favor solicita un nuevo enlace.
        </p>

        <div className="space-y-3">
          <Link href="/forgot-password">
            <Button fullWidth>Solicitar nuevo enlace</Button>
          </Link>
          <Link
            href="/login"
            className="block text-primary font-medium hover:underline"
          >
            Volver al inicio de sesion
          </Link>
        </div>
      </Card>
    );
  }

  // Success state
  if (submitted) {
    return (
      <Card className="p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
            <Check className="h-8 w-8 text-success" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-text mb-2">Contrasena actualizada</h1>
        <p className="text-text-secondary mb-6">
          Tu contrasena ha sido restablecida exitosamente.
        </p>

        <Link href="/login">
          <Button fullWidth>Iniciar sesion</Button>
        </Link>
      </Card>
    );
  }

  // Password reset form
  return (
    <Card className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text mb-2">Nueva contrasena</h1>
        <p className="text-text-secondary">
          Ingresa tu nueva contrasena. Debe tener al menos 8 caracteres.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error rounded-lg">
          <p className="text-sm text-error text-center">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Input
            label="Nueva contrasena"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Minimo 8 caracteres"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[34px] text-text-secondary hover:text-text"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        <div className="relative">
          <Input
            label="Confirmar contrasena"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Repite tu contrasena"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-[34px] text-text-secondary hover:text-text"
          >
            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        <Button
          type="submit"
          fullWidth
          loading={isLoading}
          disabled={isLoading}
        >
          Restablecer contrasena
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Card className="p-6 text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-text-secondary">Cargando...</p>
        </Card>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
