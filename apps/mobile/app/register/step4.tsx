import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, Checkbox, ActivityIndicator, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRegisterStore } from '../../src/store/registerStore';
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, borderRadius } from '../../src/constants/theme';

export default function RegisterStep4() {
  const router = useRouter();
  const { formData, setAcceptTerms, getRegisterData, reset } = useRegisterStore();
  const { register, isLoading, error } = useAuthStore();
  const [termsError, setTermsError] = useState(false);

  const handleToggleTerms = () => {
    setAcceptTerms(!formData.acceptTerms);
    if (termsError) setTermsError(false);
  };

  const handleRegister = async () => {
    if (!formData.acceptTerms) {
      setTermsError(true);
      return;
    }

    const registerData = getRegisterData();
    if (!registerData) {
      Alert.alert('Error', 'Faltan datos de registro. Por favor, vuelve a intentar.');
      router.replace('/register');
      return;
    }

    try {
      await register(registerData);
      // Registration successful - reset form and navigate to home
      reset();
      router.replace('/home');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrar';
      Alert.alert('Error de Registro', message);
    }
  };

  // Get relationship label
  const getRelationshipLabel = () => {
    switch (formData.relationship) {
      case 'father': return 'Padre';
      case 'mother': return 'Madre';
      case 'guardian': return 'Apoderado/Tutor';
      case 'other': return 'Otro';
      default: return '';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={styles.progressText}>Paso 4 de 4</Text>
        </View>

        {/* Title */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Confirma tu registro</Text>
          <Text style={styles.subtitle}>
            Revisa tus datos y acepta los terminos para completar el registro
          </Text>
        </View>

        {/* Summary */}
        <Surface style={styles.summaryCard} elevation={1}>
          <Text style={styles.summaryTitle}>Resumen de tu cuenta</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Relacion:</Text>
            <Text style={styles.summaryValue}>{getRelationshipLabel()}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Nombre:</Text>
            <Text style={styles.summaryValue}>
              {formData.firstName} {formData.lastName}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Correo:</Text>
            <Text style={styles.summaryValue}>{formData.email}</Text>
          </View>
        </Surface>

        {/* Terms and Conditions */}
        <TouchableOpacity
          style={[styles.termsContainer, termsError && styles.termsContainerError]}
          onPress={handleToggleTerms}
          activeOpacity={0.7}
        >
          <Checkbox
            status={formData.acceptTerms ? 'checked' : 'unchecked'}
            onPress={handleToggleTerms}
            color={colors.primary}
          />
          <View style={styles.termsTextContainer}>
            <Text style={styles.termsText}>
              He leido y acepto los{' '}
              <Text style={styles.termsLink}>Terminos y Condiciones</Text>
              {' '}y la{' '}
              <Text style={styles.termsLink}>Politica de Privacidad</Text>
            </Text>
          </View>
        </TouchableOpacity>
        {termsError && (
          <Text style={styles.errorText}>
            Debes aceptar los terminos y condiciones
          </Text>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Button */}
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleRegister}
          style={styles.button}
          labelStyle={styles.buttonLabel}
          contentStyle={styles.buttonContent}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.textOnPrimary} size="small" />
          ) : (
            'Crear cuenta'
          )}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  progressContainer: {
    marginBottom: spacing.xl,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  headerContainer: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  summaryCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  termsContainerError: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  termsTextContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  termsText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '500',
  },
  errorContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
    marginLeft: spacing.md,
  },
  buttonContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  buttonLabel: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
});
