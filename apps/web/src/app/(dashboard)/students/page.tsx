'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Eye } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiService, type Student } from '@/lib/api';
import { Card, Button, Avatar, LoadingSpinner } from '@/components/ui';

export default function StudentsPage() {
  const { accessToken } = useAuthStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = async () => {
    if (!accessToken) {
      setError('No estas autenticado');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await apiService.getStudents(accessToken);
      if (response.success && response.data) {
        setStudents(response.data);
      } else {
        setError(response.message || 'Error al cargar estudiantes');
      }
    } catch {
      setError('Error de conexion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [accessToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-text-secondary">Cargando estudiantes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text">Mis Estudiantes</h1>
        <Link href="/students/add">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Vincular
          </Button>
        </Link>
      </div>

      {/* Error */}
      {error && (
        <Card className="p-6 text-center bg-error/10">
          <p className="text-error mb-4">{error}</p>
          <Button onClick={loadStudents}>Reintentar</Button>
        </Card>
      )}

      {/* Empty State */}
      {students.length === 0 && !error && (
        <Card className="p-8 text-center">
          <h3 className="text-lg font-semibold text-text mb-2">
            No tienes estudiantes vinculados
          </h3>
          <p className="text-text-secondary mb-6">
            Busca a tus hijos por RUT y vincularlos para gestionar sus almuerzos escolares.
          </p>
          <Link href="/students/add">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Vincular Estudiante
            </Button>
          </Link>
        </Card>
      )}

      {/* Students List */}
      {students.map((student) => (
        <Card key={student.id} className="p-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <Avatar
                src={student.photoUrl}
                name={`${student.firstName} ${student.lastName}`}
                size="lg"
              />
              <div>
                <h3 className="font-semibold text-text">
                  {student.firstName} {student.lastName}
                </h3>
                <p className="text-sm text-text-secondary">{student.rut}</p>
                {student.grade && (
                  <p className="text-sm text-text-secondary">
                    {student.grade}{student.section ? ` - ${student.section}` : ''}
                  </p>
                )}
              </div>
            </div>
            <Link href={`/students/${student.id}/edit`}>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* School Info */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-text-secondary">Colegio</p>
            <p className="text-sm font-medium text-text">{student.school.name}</p>
          </div>

          {/* Tickets */}
          {student.tickets && student.tickets.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-text-secondary mb-2">Tickets disponibles</p>
              <div className="flex flex-wrap gap-2">
                {student.tickets.map((ticket, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary"
                  >
                    {ticket.quantity}x {ticket.type}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      ))}

      {/* Fixed FAB for mobile */}
      {students.length > 0 && (
        <div className="fixed bottom-20 right-4 md:hidden">
          <Link href="/students/add">
            <Button className="rounded-full w-14 h-14 p-0 shadow-lg">
              <Plus className="h-6 w-6" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
