'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Camera, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiService, type Student } from '@/lib/api';
import { Card, Button, Avatar, LoadingSpinner } from '@/components/ui';

export default function EditStudentPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;
  const { accessToken } = useAuthStore();

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadStudent();
  }, [studentId, accessToken]);

  const loadStudent = async () => {
    if (!accessToken || !studentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getStudent(studentId, accessToken);
      if (response.success && response.data) {
        setStudent(response.data);
      } else {
        setError(response.message || 'No se pudo cargar el estudiante');
      }
    } catch {
      setError('Error de conexion');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!accessToken || !studentId) return;

    setDeleting(true);
    try {
      const response = await apiService.deleteStudent(studentId, accessToken);
      if (response.success) {
        router.push('/students');
      } else {
        setError(response.message || 'No se pudo eliminar el estudiante');
        setShowDeleteConfirm(false);
      }
    } catch {
      setError('Error al eliminar el estudiante');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !student) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-text-secondary hover:text-text"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-text">Detalle Estudiante</h1>
        </div>
        <Card className="p-6 text-center">
          <p className="text-error mb-4">{error}</p>
          <Button onClick={loadStudent}>Reintentar</Button>
        </Card>
      </div>
    );
  }

  if (!student) {
    return null;
  }

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
        <h1 className="text-2xl font-bold text-text">Detalle Estudiante</h1>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-4 bg-error/10 border border-error">
          <p className="text-error text-center">{error}</p>
        </Card>
      )}

      {/* Photo Section */}
      <Card className="p-6">
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <Avatar
              src={student.photoUrl}
              name={`${student.firstName} ${student.lastName}`}
              size="lg"
              className="!w-24 !h-24 text-2xl"
            />
            <div className="absolute bottom-0 right-0 bg-primary rounded-full p-2">
              <Camera className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-xs text-text-secondary mt-2">Toca para cambiar la foto</p>
        </div>

        <hr className="border-border mb-6" />

        {/* Student Data Section */}
        <h3 className="font-semibold text-text mb-4">Datos del Estudiante</h3>

        <div className="space-y-4">
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Nombre
            </label>
            <div className="p-3 bg-surface rounded-lg border border-border">
              <span className="text-text">{student.firstName}</span>
            </div>
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Apellido
            </label>
            <div className="p-3 bg-surface rounded-lg border border-border">
              <span className="text-text">{student.lastName}</span>
            </div>
          </div>

          {/* RUT */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              RUT
            </label>
            <div className="p-3 bg-surface rounded-lg border border-border">
              <span className="text-text">{student.rut}</span>
            </div>
            <p className="text-xs text-text-secondary mt-1">Formato: 12.345.678-9</p>
          </div>
        </div>

        <hr className="border-border my-6" />

        {/* School Section */}
        <h3 className="font-semibold text-text mb-4">Colegio</h3>

        <div className="p-3 bg-surface rounded-lg border border-border">
          <span className="text-text">{student.school?.name || 'Sin colegio asignado'}</span>
        </div>

        <hr className="border-border my-6" />

        {/* Grade Section */}
        <h3 className="font-semibold text-text mb-4">Curso (Opcional)</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Curso
            </label>
            <div className="p-3 bg-surface rounded-lg border border-border">
              <span className="text-text">{student.grade || 'Sin especificar'}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Seccion
            </label>
            <div className="p-3 bg-surface rounded-lg border border-border">
              <span className="text-text">{student.section || 'Sin especificar'}</span>
            </div>
          </div>
        </div>

        <hr className="border-border my-6" />

        {/* Daily Limit Section */}
        <h3 className="font-semibold text-text mb-4">Limite Diario (Opcional)</h3>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Limite diario (CLP)
          </label>
          <div className="p-3 bg-surface rounded-lg border border-border">
            <span className="text-text">
              {student.dailyLimit && student.dailyLimit > 0
                ? `$${student.dailyLimit.toLocaleString('es-CL')}`
                : 'Sin limite'}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            0 o vacio = Sin limite de gasto diario
          </p>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-text mb-2">Eliminar Estudiante</h3>
            <p className="text-text-secondary mb-6">
              ¿Estas seguro de que deseas eliminar a {student.firstName} {student.lastName}?
              Esta accion no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button
                fullWidth
                onClick={handleDelete}
                loading={deleting}
                disabled={deleting}
                className="bg-error hover:bg-error/90"
              >
                Eliminar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
