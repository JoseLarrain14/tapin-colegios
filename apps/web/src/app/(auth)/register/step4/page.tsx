'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { useRegisterStore } from '@/store/registerStore';
import { Button, Input, Card } from '@/components/ui';
import { cn } from '@/lib/utils';

export default function RegisterStep4Page() {
  const router = useRouter();
  const { formData, setFirstName, setLastName, setAcceptTerms, setCurrentStep } = useRegisterStore();
  const [localFirstName, setLocalFirstName] = useState(formData.firstName);
  const [localLastName, setLocalLastName] = useState(formData.lastName);
  const [acceptTerms, setLocalAcceptTerms] = useState(formData.acceptTerms);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    terms?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!localFirstName.trim()) {
      newErrors.firstName = 'El nombre es requerido';
    }

    if (!localLastName.trim()) {
      newErrors.lastName = 'El apellido es requerido';
    }

    if (!acceptTerms) {
      newErrors.terms = 'Debes aceptar los terminos y condiciones';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateForm()) {
      setFirstName(localFirstName.trim());
      setLastName(localLastName.trim());
      setAcceptTerms(acceptTerms);
      setCurrentStep(5);
      router.push('/register/step5');
    }
  };

  const handleBack = () => {
    router.push('/register/step3');
  };

  const toggleTerms = () => {
    setLocalAcceptTerms(!acceptTerms);
    if (errors.terms) setErrors({ ...errors, terms: undefined });
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
          <div className="h-full bg-primary rounded-full" style={{ width: '80%' }} />
        </div>
        <p className="text-xs text-text-secondary mt-2 text-right">Paso 4 de 5</p>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text mb-2">Tus datos</h1>
        <p className="text-text-secondary">
          Ingresa tu nombre y apellido
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
          label="Nombre"
          type="text"
          value={localFirstName}
          onChange={(e) => {
            setLocalFirstName(e.target.value);
            if (errors.firstName) setErrors({ ...errors, firstName: undefined });
          }}
          error={errors.firstName}
          placeholder="Tu nombre"
          autoComplete="given-name"
          autoCapitalize="words"
        />

        <Input
          label="Apellido"
          type="text"
          value={localLastName}
          onChange={(e) => {
            setLocalLastName(e.target.value);
            if (errors.lastName) setErrors({ ...errors, lastName: undefined });
          }}
          error={errors.lastName}
          placeholder="Tu apellido"
          autoComplete="family-name"
          autoCapitalize="words"
        />

        {/* Terms checkbox */}
        <div>
          <button
            type="button"
            onClick={toggleTerms}
            className={cn(
              'w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors',
              errors.terms
                ? 'border-error bg-error/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            <div
              className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                acceptTerms
                  ? 'bg-primary border-primary'
                  : 'border-border'
              )}
            >
              {acceptTerms && <Check className="h-3 w-3 text-white" />}
            </div>
            <span className="text-sm text-text">
              He leido y acepto los{' '}
              <span className="text-primary font-medium">Terminos y Condiciones</span>
              {' '}y la{' '}
              <span className="text-primary font-medium">Politica de Privacidad</span>
            </span>
          </button>
          {errors.terms && (
            <p className="mt-1.5 text-sm text-error">{errors.terms}</p>
          )}
        </div>

        <Button type="submit" fullWidth>
          Continuar
        </Button>
      </form>
    </Card>
  );
}
