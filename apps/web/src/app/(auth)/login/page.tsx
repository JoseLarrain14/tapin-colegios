'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button, Input, Card } from '@/components/ui';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loginError, setLoginError] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = 'El correo es requerido';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Ingresa un correo valido';
    }

    if (!password) {
      newErrors.password = 'La contrasena es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoginError(null);

    try {
      await login(email.trim().toLowerCase(), password);
      router.push('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesion';
      setLoginError(message);
    }
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text mb-2">Bienvenido</h1>
        <p className="text-text-secondary">
          Ingresa con tu correo y contrasena
        </p>
      </div>

      {/* Error Banner */}
      {loginError && (
        <div
          role="alert"
          className="mb-4 p-3 bg-error/10 border border-error rounded-lg"
        >
          <p className="text-sm text-error text-center">{loginError}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Correo electronico"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors({ ...errors, email: undefined });
          }}
          error={errors.email}
          placeholder="tu@email.com"
          autoComplete="email"
          autoCapitalize="none"
        />

        <div className="relative">
          <Input
            label="Contrasena"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors({ ...errors, password: undefined });
            }}
            error={errors.password}
            placeholder="Tu contrasena"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[34px] text-text-secondary hover:text-text"
            aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:underline"
          >
            Olvidaste tu contrasena?
          </Link>
        </div>

        <Button
          type="submit"
          fullWidth
          loading={isLoading}
          disabled={isLoading}
        >
          Iniciar Sesion
        </Button>
      </form>

      {/* Register Link */}
      <div className="mt-6 text-center">
        <span className="text-text-secondary">No tienes cuenta? </span>
        <Link href="/register" className="text-primary font-medium hover:underline">
          Registrate aqui
        </Link>
      </div>
    </Card>
  );
}
