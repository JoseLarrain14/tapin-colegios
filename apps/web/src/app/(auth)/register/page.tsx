'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRegisterStore, type RelationshipType } from '@/store/registerStore';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';

interface RelationshipOption {
  type: RelationshipType;
  label: string;
}

const relationshipOptions: RelationshipOption[] = [
  { type: 'father', label: 'Padre' },
  { type: 'mother', label: 'Madre' },
  { type: 'guardian', label: 'Apoderado/Tutor' },
  { type: 'other', label: 'Otro' },
];

export default function RegisterStep1Page() {
  const router = useRouter();
  const { formData, setRelationship, setCurrentStep } = useRegisterStore();

  const handleSelect = (relationship: RelationshipType) => {
    setRelationship(relationship);
    setCurrentStep(2);
    router.push('/register/step2');
  };

  return (
    <Card className="p-6">
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: '20%' }} />
        </div>
        <p className="text-xs text-text-secondary mt-2 text-right">Paso 1 de 5</p>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text mb-2">Cual es tu relacion?</h1>
        <p className="text-text-secondary">
          Selecciona como te relacionas con el estudiante
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {relationshipOptions.map((option) => {
          const isSelected = formData.relationship === option.type;

          return (
            <button
              key={option.type}
              onClick={() => handleSelect(option.type)}
              className={cn(
                'w-full flex items-center justify-between p-4 rounded-lg border-2 transition-colors text-left',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-white hover:border-primary/50'
              )}
            >
              <span
                className={cn(
                  'font-medium',
                  isSelected ? 'text-primary' : 'text-text'
                )}
              >
                {option.label}
              </span>
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                  isSelected ? 'border-primary' : 'border-border'
                )}
              >
                {isSelected && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                )}
              </div>
            </button>
          );
        })}
      </div>

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
