'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useRegisterStore } from '@/store/registerStore';
import { Button, Input, Card } from '@/components/ui';
import { cn } from '@/lib/utils';

export default function RegisterStep3Page() {
  const router = useRouter();
  const { formData, setPassword, setCurrentStep } = useRegisterStore();
  const [localPassword, setLocalPassword] = useState(formData.password);
  const [localConfirmPassword, setLocalConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!localPassword) {
      newErrors.password = 'La contrasena es requerida';
    } else if (localPassword.length < 8) {
      newErrors.password = 'La contrasena debe tener al menos 8 caracteres';
    }

    if (!localConfirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contrasena';
    } else if (localPassword !== localConfirmPassword) {
      newErrors.confirmPassword = 'Las contrasenas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateForm()) {
      setPassword(localPassword);
      setCurrentStep(4);
      router.push('/register/step4');
    }
  };

  const handleBack = () => {
    router.push('/register/step2');
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    if (!localPassword) return { level: 0, text: '', color: 'bg-border' };
    if (localPassword.length < 8) return { level: 1, text: 'Debil', color: 'bg-error' };
    if (localPassword.length < 12) return { level: 2, text: 'Media', color: 'bg-warning' };
    return { level: 3, text: 'Fuerte', color: 'bg-success' };
  };

  const passwordStrength = getPasswordStrength();

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
          <div className="h-full bg-primary rounded-full" style={{ width: '60%' }} />
        </div>
        <p className="text-xs text-text-secondary mt-2 text-right">Paso 3 de 5</p>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text mb-2">Crea tu contrasena</h1>
        <p className="text-text-secondary">
          Usa al menos 8 caracteres para mayor seguridad
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
        {/* Password */}
        <div className="relative">
          <Input
            label="Contrasena"
            type={showPassword ? 'text' : 'password'}
            value={localPassword}
            onChange={(e) => {
              setLocalPassword(e.target.value);
              if (errors.password) setErrors({ ...errors, password: undefined });
            }}
            error={errors.password}
            placeholder="Minimo 8 caracteres"
            autoComplete="new-password"
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

        {/* Password strength */}
        {localPassword && !errors.password && (
          <div className="flex items-center gap-2 px-1">
            <div className="flex gap-1">
              {[1, 2, 3].map((level) => (
                <div
                  key={level}
                  className={cn(
                    'w-10 h-1 rounded-full',
                    level <= passwordStrength.level ? passwordStrength.color : 'bg-border'
                  )}
                />
              ))}
            </div>
            <span className={cn(
              'text-xs font-medium',
              passwordStrength.level === 1 && 'text-error',
              passwordStrength.level === 2 && 'text-warning',
              passwordStrength.level === 3 && 'text-success'
            )}>
              {passwordStrength.text}
            </span>
          </div>
        )}

        {/* Confirm Password */}
        <div className="relative">
          <Input
            label="Confirmar contrasena"
            type={showConfirmPassword ? 'text' : 'password'}
            value={localConfirmPassword}
            onChange={(e) => {
              setLocalConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
            }}
            error={errors.confirmPassword}
            placeholder="Repite tu contrasena"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-[34px] text-text-secondary hover:text-text"
            aria-label={showConfirmPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
          >
            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        <Button type="submit" fullWidth>
          Continuar
        </Button>
      </form>
    </Card>
  );
}
