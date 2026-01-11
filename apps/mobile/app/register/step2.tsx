import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRegisterStore } from '../../src/store/registerStore';
import { colors, spacing, borderRadius } from '../../src/constants/theme';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterStep2() {
  const router = useRouter();
  const { formData, setEmail, setFirstName, setLastName, setCurrentStep } = useRegisterStore();
  const [localEmail, setLocalEmail] = useState(formData.email);
  const [localFirstName, setLocalFirstName] = useState(formData.firstName);
  const [localLastName, setLocalLastName] = useState(formData.lastName);
  const [errors, setErrors] = useState<{
    email?: string;
    firstName?: string;
    lastName?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!localFirstName.trim()) {
      newErrors.firstName = 'El nombre es requerido';
    }

    if (!localLastName.trim()) {
      newErrors.lastName = 'El apellido es requerido';
    }

    if (!localEmail.trim()) {
      newErrors.email = 'El correo es requerido';
    } else if (!emailRegex.test(localEmail)) {
      newErrors.email = 'Ingresa un correo valido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateForm()) {
      setEmail(localEmail.trim().toLowerCase());
      setFirstName(localFirstName.trim());
      setLastName(localLastName.trim());
      setCurrentStep(3);
      router.push('/register/step3');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '40%' }]} />
            </View>
            <Text style={styles.progressText}>Paso 2 de 5</Text>
          </View>

          {/* Title */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Tus datos</Text>
            <Text style={styles.subtitle}>
              Ingresa tu nombre y correo electronico
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <TextInput
                label="Nombre"
                value={localFirstName}
                onChangeText={(text) => {
                  setLocalFirstName(text);
                  if (errors.firstName) setErrors({ ...errors, firstName: undefined });
                }}
                mode="outlined"
                style={styles.input}
                error={!!errors.firstName}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                autoCapitalize="words"
                autoCorrect={false}
              />
              {errors.firstName && (
                <HelperText type="error" visible={true}>
                  {errors.firstName}
                </HelperText>
              )}
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                label="Apellido"
                value={localLastName}
                onChangeText={(text) => {
                  setLocalLastName(text);
                  if (errors.lastName) setErrors({ ...errors, lastName: undefined });
                }}
                mode="outlined"
                style={styles.input}
                error={!!errors.lastName}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                autoCapitalize="words"
                autoCorrect={false}
              />
              {errors.lastName && (
                <HelperText type="error" visible={true}>
                  {errors.lastName}
                </HelperText>
              )}
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                label="Correo electronico"
                value={localEmail}
                onChangeText={(text) => {
                  setLocalEmail(text);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                mode="outlined"
                style={styles.input}
                error={!!errors.email}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
              />
              {errors.email && (
                <HelperText type="error" visible={true}>
                  {errors.email}
                </HelperText>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Button */}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleContinue}
            style={styles.button}
            labelStyle={styles.buttonLabel}
            contentStyle={styles.buttonContent}
          >
            Continuar
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
  formContainer: {
    gap: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
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
