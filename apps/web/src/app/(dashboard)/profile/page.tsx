'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Users, CreditCard, HelpCircle, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiService, type Student } from '@/lib/api';
import { Card, Button, Avatar, LoadingSpinner } from '@/components/ui';

interface GuardianProfile {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  rut?: string;
  relationship: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, accessToken } = useAuthStore();
  const [profile, setProfile] = useState<GuardianProfile | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async () => {
    if (!accessToken) {
      setError('No estas autenticado');
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Load profile and students in parallel
      const [profileResponse, studentsResponse] = await Promise.all([
        apiService.getGuardianProfile(accessToken),
        apiService.getStudents(accessToken),
      ]);

      if (profileResponse.success && profileResponse.data) {
        setProfile(profileResponse.data);
      } else {
        setError(profileResponse.message || 'Error al cargar perfil');
      }

      if (studentsResponse.success && studentsResponse.data) {
        const studentList = Array.isArray(studentsResponse.data) ? studentsResponse.data : [];
        setStudents(studentList);
      }
    } catch {
      setError('Error de conexion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [accessToken]);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const getInitials = () => {
    if (!profile) return '?';
    return `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();
  };

  const getRelationshipLabel = (relationship: string) => {
    switch (relationship) {
      case 'father': return 'Padre';
      case 'mother': return 'Madre';
      case 'guardian': return 'Apoderado/Tutor';
      case 'other': return 'Otro';
      default: return relationship;
    }
  };

  const getAssociatedSchools = () => {
    if (students.length === 0) return [];
    const schoolMap = new Map();
    students.forEach((student) => {
      if (!schoolMap.has(student.school.id)) {
        schoolMap.set(student.school.id, student.school);
      }
    });
    return Array.from(schoolMap.values());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-text-secondary">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-error mb-4">{error}</p>
        <Button onClick={loadProfile}>Reintentar</Button>
      </Card>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Mi Perfil</h1>
      </div>

      {/* Profile Card */}
      <Card className="p-6 bg-primary">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-2xl font-bold">{getInitials()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white truncate">
              {profile.firstName} {profile.lastName}
            </h2>
            <p className="text-white/90 text-sm">
              {getRelationshipLabel(profile.relationship)}
            </p>
          </div>
        </div>
      </Card>

      {/* Contact Info */}
      <Card className="p-4">
        <h3 className="font-semibold text-text mb-4">Informacion de Contacto</h3>
        <div className="space-y-3">
          <div className="py-2 border-b border-border">
            <p className="text-xs text-text-secondary">Correo electronico</p>
            <p className="text-text font-medium">{user?.email || '-'}</p>
          </div>
          <div className="py-2 border-b border-border">
            <p className="text-xs text-text-secondary">Telefono</p>
            <p className="text-text font-medium">{profile.phone || 'No registrado'}</p>
          </div>
          <div className="py-2">
            <p className="text-xs text-text-secondary">RUT</p>
            <p className="text-text font-medium">{profile.rut || 'No registrado'}</p>
          </div>
        </div>
      </Card>

      {/* Associated Schools */}
      <Card className="p-4">
        <h3 className="font-semibold text-text mb-4">Colegios Asociados</h3>
        {getAssociatedSchools().length > 0 ? (
          <div className="space-y-3">
            {getAssociatedSchools().map((school, index) => (
              <div key={school.id}>
                {index > 0 && <div className="border-t border-border my-2" />}
                <div className="flex items-center gap-3 py-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">&#127979;</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text truncate">{school.name}</p>
                    <p className="text-sm text-text-secondary">Codigo: {school.code}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary italic">
            No hay colegios asociados. Agrega un estudiante para vincular un colegio.
          </p>
        )}
      </Card>

      {/* Students Summary */}
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-text">Mis Estudiantes</h3>
          <Link href="/students" className="text-sm text-primary hover:underline">
            Ver todos
          </Link>
        </div>
        {students.length > 0 ? (
          <div className="space-y-3">
            {students.slice(0, 3).map((student, index) => (
              <div key={student.id}>
                {index > 0 && <div className="border-t border-border my-2" />}
                <div className="flex items-center gap-3 py-2">
                  <Avatar
                    name={`${student.firstName} ${student.lastName}`}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text truncate">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-sm text-text-secondary truncate">{student.school.name}</p>
                  </div>
                </div>
              </div>
            ))}
            {students.length > 3 && (
              <p className="text-sm text-text-secondary text-center mt-2">
                +{students.length - 3} estudiante(s) mas
              </p>
            )}
          </div>
        ) : (
          <p className="text-text-secondary italic">
            No tienes estudiantes registrados.
          </p>
        )}
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <Link href="/profile/edit">
          <Button fullWidth>
            <Pencil className="h-4 w-4 mr-2" />
            Editar Perfil
          </Button>
        </Link>

        <Link href="/students">
          <Button variant="outline" fullWidth>
            <Users className="h-4 w-4 mr-2" />
            Ver Estudiantes
          </Button>
        </Link>

        <Link href="/payment-history">
          <Button variant="outline" fullWidth>
            <CreditCard className="h-4 w-4 mr-2" />
            Historial de Pagos
          </Button>
        </Link>

        <Link href="/help">
          <Button variant="outline" fullWidth>
            <HelpCircle className="h-4 w-4 mr-2" />
            Centro de Ayuda
          </Button>
        </Link>

        <Button variant="outline" fullWidth onClick={handleLogout} className="border-error text-error hover:bg-error/10">
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar Sesion
        </Button>
      </div>
    </div>
  );
}
