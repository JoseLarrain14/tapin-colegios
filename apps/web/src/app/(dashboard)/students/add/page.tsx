'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Link as LinkIcon } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiService } from '@/lib/api';
import { Card, Button, Input, Avatar, LoadingSpinner } from '@/components/ui';

// RUT utilities
function cleanRut(rut: string): string {
  return rut.replace(/[.\-\s]/g, '').toUpperCase();
}

function formatRut(rut: string): string {
  const cleanedRut = cleanRut(rut);
  if (cleanedRut.length < 2) return cleanedRut;

  const body = cleanedRut.slice(0, -1);
  const verificationDigit = cleanedRut.slice(-1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formattedBody}-${verificationDigit}`;
}

function validateRut(rut: string): { valid: boolean; message?: string } {
  if (!rut || rut.trim().length === 0) {
    return { valid: false, message: 'El RUT es requerido' };
  }

  const cleanedRut = cleanRut(rut);
  if (cleanedRut.length < 7 || cleanedRut.length > 9) {
    return { valid: false, message: 'El RUT debe tener entre 7 y 9 caracteres' };
  }

  return { valid: true };
}

interface SearchedStudent {
  id: string;
  firstName: string;
  lastName: string;
  rut: string;
  grade?: string;
  section?: string;
  photoUrl?: string;
  school: { id: string; name: string; code: string };
  isEmailMatch?: boolean;
}

export default function AddStudentPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();

  const [searchRut, setSearchRut] = useState('');
  const [searchedStudent, setSearchedStudent] = useState<SearchedStudent | null>(null);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRutChange = (value: string) => {
    const cleaned = value.replace(/[^0-9kK\-.]/g, '').toUpperCase();
    setSearchRut(cleaned);
    setError(null);
  };

  const handleRutBlur = () => {
    if (searchRut.length >= 8) {
      setSearchRut(formatRut(searchRut));
    }
  };

  const handleSearch = async () => {
    if (!accessToken) {
      setError('Debes iniciar sesion');
      return;
    }

    const validation = validateRut(searchRut);
    if (!validation.valid) {
      setError(validation.message || 'RUT invalido');
      return;
    }

    setSearching(true);
    setSearchedStudent(null);
    setError(null);

    try {
      const response = await apiService.searchStudentByRut(formatRut(searchRut), accessToken);
      if (response.success && response.data) {
        setSearchedStudent(response.data);
      } else {
        setError(response.message || 'Estudiante no registrado. Por favor, contacte al colegio o casino para que agreguen al estudiante al sistema.');
      }
    } catch {
      setError('Error al buscar estudiante');
    } finally {
      setSearching(false);
    }
  };

  const handleLink = async () => {
    if (!accessToken || !searchedStudent) return;

    setLinking(true);
    setError(null);

    try {
      const response = await apiService.linkStudent(searchedStudent.id, accessToken);
      if (response.success) {
        setSuccess(response.message || 'Estudiante vinculado exitosamente');
        setTimeout(() => router.push('/students'), 1500);
      } else {
        setError(response.message || 'Error al vincular estudiante');
      }
    } catch {
      setError('Error al vincular estudiante');
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 text-text-secondary hover:text-text"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-text">Agregar Estudiante</h1>
      </div>

      {/* Success Message */}
      {success && (
        <Card className="p-4 bg-success/10 border border-success">
          <p className="text-success text-center">{success}</p>
        </Card>
      )}

      {/* Search Card */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-text mb-2">Buscar Estudiante por RUT</h2>
        <p className="text-text-secondary text-sm mb-6">
          Ingresa el RUT del estudiante que deseas vincular a tu cuenta
        </p>

        {/* Search Input */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <Input
              label="RUT del Estudiante"
              value={searchRut}
              onChange={(e) => handleRutChange(e.target.value)}
              onBlur={handleRutBlur}
              placeholder="12.345.678-9"
              error={error || undefined}
            />
          </div>
          <div className="pt-6">
            <Button
              onClick={handleSearch}
              loading={searching}
              disabled={searching || searchRut.length < 8}
            >
              <Search className="h-4 w-4 mr-1" />
              Buscar
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && !searchedStudent && (
          <div className="p-3 bg-error/10 border border-error rounded-lg mb-4">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Student Result */}
        {searchedStudent && (
          <Card className="p-4 bg-surface mt-4">
            <div className="flex items-start gap-4 mb-4">
              <Avatar
                src={searchedStudent.photoUrl}
                name={`${searchedStudent.firstName} ${searchedStudent.lastName}`}
                size="lg"
              />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-text">
                  {searchedStudent.firstName} {searchedStudent.lastName}
                </h3>
                <p className="text-sm text-text-secondary">RUT: {searchedStudent.rut}</p>
                {(searchedStudent.grade || searchedStudent.section) && (
                  <p className="text-sm text-text-secondary">
                    {searchedStudent.grade}{searchedStudent.section ? ` - ${searchedStudent.section}` : ''}
                  </p>
                )}
                <div className="mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
                    {searchedStudent.school.name}
                  </span>
                </div>
                {searchedStudent.isEmailMatch && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-success text-white">
                      &#10003; Este es tu hijo
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Button
              fullWidth
              onClick={handleLink}
              loading={linking}
              disabled={linking}
              className="bg-success hover:bg-success/90"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              {linking ? 'Vinculando...' : 'Vincular a mi cuenta'}
            </Button>
          </Card>
        )}
      </Card>

      {/* Info Card */}
      <Card className="p-4">
        <h3 className="font-semibold text-text mb-2">&#128712; Informacion</h3>
        <p className="text-sm text-text-secondary">
          Solo puedes vincular estudiantes que ya esten registrados en el sistema del colegio.
          Si el estudiante no aparece, contacta al colegio o casino para que lo agreguen.
        </p>
      </Card>
    </div>
  );
}
