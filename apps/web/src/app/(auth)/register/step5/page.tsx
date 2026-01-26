'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, X } from 'lucide-react';
import { useRegisterStore } from '@/store/registerStore';
import { useAuthStore } from '@/store/authStore';
import { apiService, type School } from '@/lib/api';
import { Button, Card, Input, LoadingSpinner } from '@/components/ui';
import { cn } from '@/lib/utils';

export default function RegisterStep5Page() {
  const router = useRouter();
  const { formData, setSelectedSchool, getRegisterData, reset } = useRegisterStore();
  const { register, isLoading: isRegistering, accessToken } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    formData.selectedSchool?.id || null
  );

  // Load schools on mount and on search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchSchools(searchQuery);
      } else if (searchQuery.length === 0) {
        loadAllSchools();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadAllSchools();
  }, []);

  const loadAllSchools = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.getAllSchools();
      if (response.success && response.data) {
        setSchools(response.data);
      } else {
        setError(response.message || 'Error al cargar colegios');
      }
    } catch {
      setError('Error al cargar colegios');
    } finally {
      setIsLoading(false);
    }
  };

  const searchSchools = async (query: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.searchSchools(query);
      if (response.success && response.data) {
        setSchools(response.data);
      } else {
        setError(response.message || 'Error al buscar colegios');
      }
    } catch {
      setError('Error al buscar colegios');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSchool = (school: School) => {
    setSelectedId(school.id);
    setSelectedSchool(school);
  };

  const handleContinue = async () => {
    if (!selectedId) return;

    // First register if not yet registered
    if (!accessToken) {
      const registerData = getRegisterData();
      if (!registerData) {
        setError('Faltan datos de registro. Por favor, vuelve a intentar.');
        router.replace('/register');
        return;
      }

      try {
        await register(registerData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al registrar';
        setError(message);
        return;
      }
    }

    // Then save preferred school
    setIsSaving(true);
    try {
      const token = useAuthStore.getState().accessToken;
      if (!token) {
        setError('Error de autenticacion');
        return;
      }

      const response = await apiService.updatePreferredSchool(selectedId, token);
      if (response.success) {
        reset();
        router.replace('/');
      } else {
        setError(response.message || 'Error al guardar colegio');
      }
    } catch {
      setError('Error al guardar colegio preferido');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    // Register without selecting school
    if (!accessToken) {
      const registerData = getRegisterData();
      if (!registerData) {
        setError('Faltan datos de registro. Por favor, vuelve a intentar.');
        router.replace('/register');
        return;
      }

      try {
        await register(registerData);
        reset();
        router.replace('/');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al registrar';
        setError(message);
      }
    } else {
      reset();
      router.replace('/');
    }
  };

  const handleBack = () => {
    router.push('/register/step4');
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
          <div className="h-full bg-primary rounded-full" style={{ width: '100%' }} />
        </div>
        <p className="text-xs text-text-secondary mt-2 text-right">Paso 5 de 5</p>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text mb-2">Selecciona el colegio</h1>
        <p className="text-text-secondary">
          Busca y selecciona el colegio de tu hijo
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nombre o codigo..."
          className="w-full h-10 pl-10 pr-10 rounded-lg border border-border bg-white text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error rounded-lg">
          <p className="text-sm text-error text-center">{error}</p>
        </div>
      )}

      {/* School list */}
      <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <LoadingSpinner />
            <p className="mt-2 text-sm text-text-secondary">Cargando colegios...</p>
          </div>
        ) : schools.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-text-secondary text-center">
              {searchQuery.length > 0
                ? 'No se encontraron colegios'
                : 'No hay colegios disponibles'}
            </p>
          </div>
        ) : (
          schools.map((school) => {
            const isSelected = selectedId === school.id;
            return (
              <button
                key={school.id}
                onClick={() => handleSelectSchool(school)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-lg border-2 text-left transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'font-medium truncate',
                    isSelected ? 'text-primary' : 'text-text'
                  )}>
                    {school.name}
                  </p>
                  <p className="text-xs text-text-secondary">
                    Codigo: {school.code}
                  </p>
                  {school.city && (
                    <p className="text-xs text-text-secondary truncate">
                      {school.city}{school.region ? `, ${school.region}` : ''}
                    </p>
                  )}
                </div>
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-3',
                    isSelected ? 'border-primary' : 'border-border'
                  )}
                >
                  {isSelected && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Buttons */}
      <div className="space-y-3">
        <Button
          fullWidth
          onClick={handleContinue}
          disabled={!selectedId || isSaving || isRegistering}
          loading={isSaving || isRegistering}
        >
          Continuar
        </Button>
        <button
          onClick={handleSkip}
          disabled={isSaving || isRegistering}
          className="w-full py-2 text-sm text-text-secondary hover:text-text transition-colors disabled:opacity-50"
        >
          Saltar por ahora
        </button>
      </div>
    </Card>
  );
}
