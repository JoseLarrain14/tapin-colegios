'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useRegisterStore } from '@/store/registerStore';
import { Button, Input, Card } from '@/components/ui';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterStep2Page() {
  const router = useRouter();
  const { formData, setEmail, setCurrentStep } = useRegisterStore();
  const [localEmail, setLocalEmail] = useState(formData.email);
  const [error, setError] = useState<string | undefined>();

  const validateForm = () => {
    if (!localEmail.trim()) {
      setError('El correo es requerido');
      return false;
    }
    if (!emailRegex.test(localEmail)) {
      setError('Ingresa un correo valido');
      return false;
    }
    setError(undefined);
    return true;
  };

  const handleContinue = () => {
    if (validateForm()) {
      setEmail(localEmail.trim().toLowerCase());
      setCurrentStep(3);
      router.push('/register/step3');
    }
  };

  const handleBack = () => {
    router.push('/register');
  };

  return (
    <Card className="p-6">
      {/* Back button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-1 text-text-secondary hover:text-text mb-4 -ml-1"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm">Atras</span>
      </button>

      {/* Progress indicator */}
      <div className="mb-6">
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: '40%' }} />
        </div>
        <p className="text-xs text-text-secondary mt-2 text-right">Paso 2 de 5</p>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text mb-2">Tu correo</h1>
        <p className="text-text-secondary">
          Ingresa tu correo electronico
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleContinue();
        }}
        className="space-y-4"
      >
        <Input
          label="Correo electronico"
          type="email"
          value={localEmail}
          onChange={(e) => {
            setLocalEmail(e.target.value);
            if (error) setError(undefined);
          }}
          error={error}
          placeholder="tu@email.com"
          autoComplete="email"
          autoCapitalize="none"
        />

        <Button type="submit" fullWidth>
          Continuar
        </Button>
      </form>

      {/* Login Link */}
      <div className="mt-6 text-center">
        <span className="text-text-secondary">Ya tienes cuenta? </span>
        <Link href="/login" className="text-primary font-medium hover:underline">
          Inicia sesion
        </Link>
      </div>
    </Card>
  );
}
