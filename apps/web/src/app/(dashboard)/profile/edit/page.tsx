'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiService } from '@/lib/api';
import { Card, Button, Input, LoadingSpinner } from '@/components/ui';

export default function EditProfilePage() {
  const router = useRouter();
  const { accessToken, user, setUser } = useAuthStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [rut, setRut] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [accessToken]);

  const loadProfile = async () => {
    if (!accessToken) {
      setError('No estas autenticado');
      setLoading(false);
      return;
    }

    try {
      const response = await apiService.getGuardianProfile(accessToken);
      if (response.success && response.data) {
        setFirstName(response.data.firstName || '');
        setLastName(response.data.lastName || '');
        setPhone(response.data.phone || '');
        setRut(response.data.rut || '');
      } else {
        setError(response.message || 'Error al cargar perfil');
      }
    } catch {
      setError('Error de conexion');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!accessToken) {
      setError('No estas autenticado');
      return;
    }

    if (!firstName.trim()) {
      setError('El nombre es requerido');
      return;
    }

    if (!lastName.trim()) {
      setError('El apellido es requerido');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await apiService.updateGuardianProfile(
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || undefined,
          rut: rut.trim() || undefined,
        },
        accessToken
      );

      if (response.success) {
        setSuccess(true);
        // Update local user state
        if (user && user.guardian) {
          setUser({
            ...user,
            guardian: {
              ...user.guardian,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
            },
          });
        }
        // Navigate back after brief delay
        setTimeout(() => {
          router.push('/profile');
        }, 1000);
      } else {
        setError(response.message || 'Error al guardar cambios');
      }
    } catch {
      setError('Error de conexion');
    } finally {
      setSaving(false);
    }
  };

  const formatPhone = (text: string) => {
    // Remove non-digits
    const digits = text.replace(/\D/g, '');
    // Format as Chilean phone: +56 9 XXXX XXXX
    if (digits.length <= 2) return digits;
    if (digits.length <= 3) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 7) return `+${digits.slice(0, 2)} ${digits.slice(2, 3)} ${digits.slice(3)}`;
    return `+${digits.slice(0, 2)} ${digits.slice(2, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = (value: string) => {
    if (!value) {
      setPhone('');
      return;
    }
    setPhone(formatPhone(value));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
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
        <h1 className="text-2xl font-bold text-text">Editar Perfil</h1>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-4 bg-error/10 border border-error">
          <p className="text-error text-center">{error}</p>
        </Card>
      )}

      {/* Success Message */}
      {success && (
        <Card className="p-4 bg-success/10 border border-success">
          <p className="text-success text-center">Perfil actualizado correctamente</p>
        </Card>
      )}

      {/* Form */}
      <Card className="p-6">
        <h3 className="font-semibold text-text mb-4">Informacion Personal</h3>

        <div className="space-y-4">
          <Input
            label="Nombre *"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Tu nombre"
          />

          <Input
            label="Apellido *"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Tu apellido"
          />
        </div>

        <hr className="border-border my-6" />

        <h3 className="font-semibold text-text mb-4">Informacion de Contacto</h3>

        <div className="space-y-4">
          <Input
            label="Telefono"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="+56 9 XXXX XXXX"
            type="tel"
          />

          <Input
            label="RUT"
            value={rut}
            onChange={(e) => setRut(e.target.value)}
            placeholder="12.345.678-9"
          />
        </div>

        <p className="text-xs text-text-secondary mt-4">* Campos requeridos</p>
      </Card>

      {/* Save Button */}
      <Button
        fullWidth
        size="lg"
        onClick={handleSave}
        loading={saving}
        disabled={saving}
      >
        Guardar Cambios
      </Button>
    </div>
  );
}
