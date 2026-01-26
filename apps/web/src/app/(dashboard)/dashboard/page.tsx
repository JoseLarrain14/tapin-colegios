'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Users, CreditCard, History, BarChart3 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiService, type Student } from '@/lib/api';
import { Card, Button, Avatar, LoadingSpinner } from '@/components/ui';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getStudents(accessToken);
      if (response.success && response.data) {
        setStudents(response.data);
        if (response.data.length > 0 && !selectedStudent) {
          setSelectedStudent(response.data[0]);
        }
      } else {
        setError(response.message || 'Error al cargar estudiantes');
      }
    } catch {
      setError('Error de conexion. Verifica tu internet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [accessToken]);

  const hasStudents = students.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-error mb-4">{error}</p>
        <Button onClick={loadStudents}>Reintentar</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-text-secondary">Hola,</p>
        <h1 className="text-2xl font-bold text-text">
          {user?.guardian?.firstName || 'Usuario'}
        </h1>
      </div>

      {hasStudents ? (
        <>
          {/* Student Selector */}
          <div>
            <h2 className="text-sm font-medium text-text-secondary mb-3">Mis Hijos</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {students.map((student) => {
                const isSelected = selectedStudent?.id === student.id;
                return (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className="flex flex-col items-center min-w-[70px]"
                  >
                    <div
                      className={cn(
                        'rounded-full p-0.5 transition-colors',
                        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                      )}
                    >
                      <Avatar
                        src={student.photoUrl}
                        name={`${student.firstName} ${student.lastName}`}
                        size="lg"
                      />
                    </div>
                    <span
                      className={cn(
                        'text-xs mt-1.5 truncate max-w-[70px]',
                        isSelected ? 'text-primary font-medium' : 'text-text-secondary'
                      )}
                    >
                      {student.firstName}
                    </span>
                  </button>
                );
              })}

              {/* Add Student Button */}
              <Link href="/students/add" className="flex flex-col items-center min-w-[70px]">
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-border flex items-center justify-center hover:border-primary transition-colors">
                  <Plus className="h-6 w-6 text-text-secondary" />
                </div>
                <span className="text-xs mt-1.5 text-text-secondary">Agregar</span>
              </Link>

              {/* View All Button */}
              <Link href="/students" className="flex flex-col items-center min-w-[70px]">
                <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center hover:bg-border transition-colors">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs mt-1.5 text-text-secondary">Ver todos</span>
              </Link>
            </div>
          </div>

          {/* Selected Student Card */}
          {selectedStudent && (
            <Card className="p-4">
              <div className="mb-4">
                <h3 className="font-semibold text-text">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </h3>
                <p className="text-sm text-text-secondary">{selectedStudent.school.name}</p>
              </div>

              {/* Tickets */}
              <div className="mb-4">
                <p className="text-sm text-text-secondary mb-2">Tickets disponibles:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedStudent.tickets && selectedStudent.tickets.length > 0 ? (
                    selectedStudent.tickets.map((ticket, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary"
                      >
                        {ticket.quantity}x {ticket.type}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-text-secondary">Sin tickets disponibles</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Link href={`/recharge?studentId=${selectedStudent.id}`}>
                  <Button fullWidth>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Recargar
                  </Button>
                </Link>
                <Link href="/students">
                  <Button variant="outline" fullWidth>
                    <Users className="h-4 w-4 mr-2" />
                    Ver detalles
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Link href={`/history?studentId=${selectedStudent.id}`}>
                  <Button variant="ghost" fullWidth size="sm">
                    <History className="h-4 w-4 mr-2" />
                    Historial
                  </Button>
                </Link>
                <Link href={`/spending-stats?studentId=${selectedStudent.id}`}>
                  <Button variant="ghost" fullWidth size="sm">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Consumos
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </>
      ) : (
        <>
          {/* Welcome Card - No students */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-text mb-2">
              Bienvenido a Tap In Colegios
            </h2>
            <p className="text-text-secondary mb-4">
              Tu registro fue exitoso. Ahora puedes agregar a tus hijos y comenzar a gestionar sus almuerzos escolares.
            </p>
          </Card>

          {/* Account Info */}
          <Card className="p-4">
            <h3 className="font-medium text-text mb-3">Informacion de la cuenta</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Correo:</span>
                <span className="text-text">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Rol:</span>
                <span className="text-text">
                  {user?.role === 'guardian' ? 'Apoderado' : user?.role}
                </span>
              </div>
            </div>
          </Card>

          {/* Next Steps */}
          <Card className="p-4">
            <h3 className="font-medium text-text mb-3">Proximos pasos</h3>
            <ol className="text-sm text-text-secondary space-y-2">
              <li>1. Agrega a tus hijos desde el menu de estudiantes</li>
              <li>2. Selecciona el colegio de cada estudiante</li>
              <li>3. Compra tickets de almuerzo para tus estudiantes</li>
            </ol>
          </Card>

          {/* Add Student Button */}
          <Link href="/students/add">
            <Button fullWidth size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Agregar Estudiante
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}
