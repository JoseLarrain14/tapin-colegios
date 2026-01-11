import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRegisterStore } from '../../src/store/registerStore';
import { colors, spacing, borderRadius } from '../../src/constants/theme';

export default function RegisterStep3() {
  const router = useRouter();
  const { formData, setPassword, setConfirmPassword, setCurrentStep } = useRegisterStore();
  const [localPassword, setLocalPassword] = useState(formData.password);
  const [localConfirmPassword, setLocalConfirmPassword] = useState(formData.confirmPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!localPassword) {
      newErrors.password = 'La contrasena es requerida';
    } else if (localPassword.length < 8) {
      newErrors.password = 'La contrasena debe tener al menos 8 caracteres';
    }

    if (!localConfirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contrasena';
    } else if (localPassword !== localConfirmPassword) {
      newErrors.confirmPassword = 'Las contrasenas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateForm()) {
      setPassword(localPassword);
      setConfirmPassword(localConfirmPassword);
      setCurrentStep(4);
      router.push('/register/step4');
    }
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    if (!localPassword) return { level: 0, text: '', color: colors.textMuted };
    if (localPassword.length < 8) return { level: 1, text: 'Debil', color: colors.error };
    if (localPassword.length < 12) return { level: 2, text: 'Media', color: colors.warning };
    return { level: 3, text: 'Fuerte', color: colors.success };
  };

  const passwordStrength = getPasswordStrength();

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
              <View style={[styles.progressFill, { width: '60%' }]} />
            </View>
            <Text style={styles.progressText}>Paso 3 de 5</Text>
          </View>

          {/* Title */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Crea tu contrasena</Text>
            <Text style={styles.subtitle}>
              Usa al menos 8 caracteres para mayor seguridad
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <TextInput
                label="Contrasena"
                value={localPassword}
                onChangeText={(text) => {
                  setLocalPassword(text);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                mode="outlined"
                style={styles.input}
                error={!!errors.password}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
              />
              {errors.password ? (
                <HelperText type="error" visible={true}>
                  {errors.password}
                </HelperText>
              ) : localPassword ? (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBars}>
                    {[1, 2, 3].map((level) => (
                      <View
                        key={level}
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor:
                              level <= passwordStrength.level
                                ? passwordStrength.color
                                : colors.borderLight,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                    {passwordStrength.text}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                label="Confirmar contrasena"
                value={localConfirmPassword}
                onChangeText={(text) => {
                  setLocalConfirmPassword(text);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                }}
                mode="outlined"
                style={styles.input}
                error={!!errors.confirmPassword}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                }
              />
              {errors.confirmPassword && (
                <HelperText type="error" visible={true}>
                  {errors.confirmPassword}
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
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginRight: spacing.sm,
  },
  strengthBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
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
