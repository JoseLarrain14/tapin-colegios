import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, IconButton, Surface, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { apiService } from '../src/services/api';
import { colors, spacing, borderRadius } from '../src/constants/theme';

export default function EditProfileScreen() {
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
  }, []);

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
    } catch (err) {
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
          router.back();
        }, 1000);
      } else {
        setError(response.message || 'Error al guardar cambios');
      }
    } catch (err) {
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

  const handlePhoneChange = (text: string) => {
    // Allow empty or formatted phone
    if (!text) {
      setPhone('');
      return;
    }
    setPhone(formatPhone(text));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <IconButton icon="arrow-left" size={24} onPress={() => router.back()} />
          <Text style={styles.title}>Editar Perfil</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <IconButton icon="arrow-left" size={24} onPress={() => router.back()} />
          <Text style={styles.title}>Editar Perfil</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {error && (
            <Surface style={styles.errorCard} elevation={1}>
              <Text style={styles.errorText}>{error}</Text>
            </Surface>
          )}

          {success && (
            <Surface style={styles.successCard} elevation={1}>
              <Text style={styles.successText}>Perfil actualizado correctamente</Text>
            </Surface>
          )}

          <Text style={styles.sectionTitle}>Informacion Personal</Text>

          <TextInput
            label="Nombre *"
            value={firstName}
            onChangeText={setFirstName}
            mode="outlined"
            style={styles.input}
            outlineColor={colors.borderLight}
            activeOutlineColor={colors.primary}
          />

          <TextInput
            label="Apellido *"
            value={lastName}
            onChangeText={setLastName}
            mode="outlined"
            style={styles.input}
            outlineColor={colors.borderLight}
            activeOutlineColor={colors.primary}
          />

          <Text style={styles.sectionTitle}>Informacion de Contacto</Text>

          <TextInput
            label="Telefono"
            value={phone}
            onChangeText={handlePhoneChange}
            mode="outlined"
            style={styles.input}
            outlineColor={colors.borderLight}
            activeOutlineColor={colors.primary}
            keyboardType="phone-pad"
            placeholder="+56 9 XXXX XXXX"
          />

          <TextInput
            label="RUT"
            value={rut}
            onChangeText={setRut}
            mode="outlined"
            style={styles.input}
            outlineColor={colors.borderLight}
            activeOutlineColor={colors.primary}
            placeholder="12.345.678-9"
          />

          <Text style={styles.hint}>
            * Campos requeridos
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={styles.saveButton}
            contentStyle={styles.saveButtonContent}
            labelStyle={styles.saveButtonLabel}
          >
            Guardar Cambios
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 48,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  errorCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.errorLight,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  successCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.successLight,
    marginBottom: spacing.lg,
  },
  successText: {
    color: colors.success,
    fontSize: 14,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.card,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  saveButtonContent: {
    height: 52,
  },
  saveButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
});
