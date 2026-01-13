import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, HelperText, IconButton, Menu, Divider, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { apiService, School } from '../src/services/api';
import { colors, spacing, borderRadius } from '../src/constants/theme';

// RUT validation utilities
function cleanRut(rut: string): string {
  return rut.replace(/[.\-\s]/g, '').toUpperCase();
}

function calculateVerificationDigit(rutNumber: string): string {
  const rut = String(rutNumber);
  let sum = 0;
  let multiplier = 2;

  for (let i = rut.length - 1; i >= 0; i--) {
    sum += parseInt(rut[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);

  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
}

type RutValidationResult = {
  valid: boolean;
  error?: 'empty' | 'format' | 'digit';
  message?: string;
};

function validateRutDetailed(rut: string): RutValidationResult {
  if (!rut || typeof rut !== 'string' || rut.trim().length === 0) {
    return { valid: false, error: 'empty', message: 'El RUT es requerido' };
  }

  const cleanedRut = cleanRut(rut);

  if (cleanedRut.length < 8 || cleanedRut.length > 9) {
    return { valid: false, error: 'format', message: 'El RUT debe tener entre 8 y 9 caracteres' };
  }

  const rutNumber = cleanedRut.slice(0, -1);
  const providedDigit = cleanedRut.slice(-1);

  if (!/^\d+$/.test(rutNumber)) {
    return { valid: false, error: 'format', message: 'El RUT contiene caracteres invalidos' };
  }

  if (!/^[0-9K]$/.test(providedDigit)) {
    return { valid: false, error: 'format', message: 'El digito verificador debe ser un numero o K' };
  }

  const calculatedDigit = calculateVerificationDigit(rutNumber);
  if (providedDigit !== calculatedDigit) {
    return { valid: false, error: 'digit', message: 'El digito verificador es incorrecto (deberia ser ' + calculatedDigit + ')' };
  }

  return { valid: true };
}

function validateRut(rut: string): boolean {
  return validateRutDetailed(rut).valid;
}

function formatRut(rut: string): string {
  const cleanedRut = cleanRut(rut);

  if (cleanedRut.length < 2) {
    return cleanedRut;
  }

  const body = cleanedRut.slice(0, -1);
  const verificationDigit = cleanedRut.slice(-1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formattedBody}-${verificationDigit}`;
}

// Grade options
const GRADES = [
  'Pre-Kinder',
  'Kinder',
  '1° Basico',
  '2° Basico',
  '3° Basico',
  '4° Basico',
  '5° Basico',
  '6° Basico',
  '7° Basico',
  '8° Basico',
  '1° Medio',
  '2° Medio',
  '3° Medio',
  '4° Medio',
];

const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function AddStudentScreen() {
  const router = useRouter();
  const { accessToken } = useAuthStore();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rut, setRut] = useState('');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [dailyLimit, setDailyLimit] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false); // Ref guard against double-click
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolMenuVisible, setSchoolMenuVisible] = useState(false);
  const [gradeMenuVisible, setGradeMenuVisible] = useState(false);
  const [sectionMenuVisible, setSectionMenuVisible] = useState(false);

  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Snackbar state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('error');

  const showSnackbar = (message: string, type: 'success' | 'error' = 'error') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    setLoadingSchools(true);
    try {
      const response = await apiService.getAllSchools();
      if (response.success && response.data) {
        setSchools(response.data);
        // Auto-select first school if only one exists
        if (response.data.length === 1) {
          setSelectedSchool(response.data[0]);
        }
      }
    } catch (error) {
      console.error('Error loading schools:', error);
    } finally {
      setLoadingSchools(false);
    }
  };

  const handleRutChange = (text: string) => {
    // Allow only numbers and K
    const cleaned = text.replace(/[^0-9kK\-.]/g, '').toUpperCase();
    setRut(cleaned);

    // Clear RUT error when typing
    if (errors.rut) {
      setErrors((prev) => ({ ...prev, rut: '' }));
    }
  };

  const handleRutBlur = () => {
    if (rut.length >= 8) {
      const formatted = formatRut(rut);
      setRut(formatted);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'El nombre es requerido';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'El apellido es requerido';
    }

    const rutValidation = validateRutDetailed(rut);
    if (!rutValidation.valid) {
      newErrors.rut = rutValidation.message || 'El RUT no es valido';
    }

    if (!selectedSchool) {
      newErrors.school = 'Debe seleccionar un colegio';
    }

    if (dailyLimit && (isNaN(Number(dailyLimit)) || Number(dailyLimit) < 0)) {
      newErrors.dailyLimit = 'El limite debe ser un numero positivo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    // Ref-based guard to prevent double-click submission
    if (isSubmittingRef.current) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    if (!accessToken) {
      showSnackbar('Debes iniciar sesion para agregar un estudiante', 'error');
      router.replace('/login');
      return;
    }

    // Set ref guard immediately (synchronous, before any async operations)
    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const response = await apiService.createStudent(
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          rut: formatRut(rut),
          schoolId: selectedSchool!.id,
          grade: grade || undefined,
          section: section || undefined,
          dailyLimit: dailyLimit ? Number(dailyLimit) : 0,
        },
        accessToken
      );

      if (response.success) {
        showSnackbar(`${firstName} ${lastName} ha sido agregado exitosamente.`, 'success');
        // Navigate back after a short delay so the user sees the success message
        setTimeout(() => router.back(), 1500);
      } else {
        showSnackbar(response.message || 'No se pudo agregar el estudiante', 'error');
        // Reset ref guard on failure to allow retry
        isSubmittingRef.current = false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ocurrio un error al agregar el estudiante';
      showSnackbar(errorMessage, 'error');
      // Reset ref guard on error to allow retry
      isSubmittingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <IconButton
              icon="arrow-left"
              size={24}
              onPress={() => router.back()}
              style={styles.backButton}
            />
            <Text style={styles.title}>Agregar Estudiante</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Form */}
          <Surface style={styles.formCard} elevation={1}>
            <Text style={styles.sectionTitle}>Datos del Estudiante</Text>

            {/* First Name */}
            <View style={styles.inputContainer}>
              <TextInput
                label="Nombre *"
                value={firstName}
                onChangeText={setFirstName}
                mode="outlined"
                error={!!errors.firstName}
                style={styles.input}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />
              {errors.firstName && (
                <View accessibilityRole="alert" accessibilityLiveRegion="polite">
                    <HelperText type="error" visible={true}>
                      {errors.firstName}
                    </HelperText>
                </View>
              )}
            </View>

            {/* Last Name */}
            <View style={styles.inputContainer}>
              <TextInput
                label="Apellido *"
                value={lastName}
                onChangeText={setLastName}
                mode="outlined"
                error={!!errors.lastName}
                style={styles.input}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />
              {errors.lastName && (
                <View accessibilityRole="alert" accessibilityLiveRegion="polite">
                    <HelperText type="error" visible={true}>
                      {errors.lastName}
                    </HelperText>
                </View>
              )}
            </View>

            {/* RUT */}
            <View style={styles.inputContainer}>
              <TextInput
                label="RUT *"
                value={rut}
                onChangeText={handleRutChange}
                onBlur={handleRutBlur}
                mode="outlined"
                error={!!errors.rut}
                style={styles.input}
                placeholder="12.345.678-9"
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                autoCapitalize="characters"
              />
              {errors.rut ? (
                <HelperText type="error" visible={true}>
                  {errors.rut}
                </HelperText>
              ) : (
                <HelperText type="info" visible={true}>
                  Formato: 12.345.678-9
                </HelperText>
              )}
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Colegio</Text>

            {/* School Selection */}
            <View style={styles.inputContainer}>
              {loadingSchools ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>Cargando colegios...</Text>
                </View>
              ) : (
                <Menu
                  visible={schoolMenuVisible}
                  onDismiss={() => setSchoolMenuVisible(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setSchoolMenuVisible(true)}
                      style={[styles.selectButton, errors.school && styles.selectButtonError]}
                      contentStyle={styles.selectButtonContent}
                      labelStyle={styles.selectButtonLabel}
                      icon="school"
                    >
                      {selectedSchool ? selectedSchool.name : 'Seleccionar Colegio *'}
                    </Button>
                  }
                  contentStyle={styles.menuContent}
                >
                  {schools.map((school) => (
                    <Menu.Item
                      key={school.id}
                      onPress={() => {
                        setSelectedSchool(school);
                        setSchoolMenuVisible(false);
                        if (errors.school) {
                          setErrors((prev) => ({ ...prev, school: '' }));
                        }
                      }}
                      title={school.name}
                      leadingIcon={selectedSchool?.id === school.id ? 'check' : undefined}
                    />
                  ))}
                </Menu>
              )}
              {errors.school && (
                <View accessibilityRole="alert" accessibilityLiveRegion="polite">
                    <HelperText type="error" visible={true}>
                      {errors.school}
                    </HelperText>
                </View>
              )}
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Curso (Opcional)</Text>

            {/* Grade and Section */}
            <View style={styles.rowContainer}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Menu
                  visible={gradeMenuVisible}
                  onDismiss={() => setGradeMenuVisible(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setGradeMenuVisible(true)}
                      style={styles.selectButton}
                      contentStyle={styles.selectButtonContent}
                      labelStyle={styles.selectButtonLabel}
                      icon="school-outline"
                    >
                      {grade || 'Curso'}
                    </Button>
                  }
                  contentStyle={styles.menuContent}
                >
                  <Menu.Item
                    onPress={() => {
                      setGrade('');
                      setGradeMenuVisible(false);
                    }}
                    title="Sin especificar"
                  />
                  <Divider />
                  {GRADES.map((g) => (
                    <Menu.Item
                      key={g}
                      onPress={() => {
                        setGrade(g);
                        setGradeMenuVisible(false);
                      }}
                      title={g}
                      leadingIcon={grade === g ? 'check' : undefined}
                    />
                  ))}
                </Menu>
              </View>

              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Menu
                  visible={sectionMenuVisible}
                  onDismiss={() => setSectionMenuVisible(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setSectionMenuVisible(true)}
                      style={styles.selectButton}
                      contentStyle={styles.selectButtonContent}
                      labelStyle={styles.selectButtonLabel}
                      icon="format-list-bulleted"
                    >
                      {section || 'Seccion'}
                    </Button>
                  }
                  contentStyle={styles.menuContent}
                >
                  <Menu.Item
                    onPress={() => {
                      setSection('');
                      setSectionMenuVisible(false);
                    }}
                    title="Sin especificar"
                  />
                  <Divider />
                  {SECTIONS.map((s) => (
                    <Menu.Item
                      key={s}
                      onPress={() => {
                        setSection(s);
                        setSectionMenuVisible(false);
                      }}
                      title={`Seccion ${s}`}
                      leadingIcon={section === s ? 'check' : undefined}
                    />
                  ))}
                </Menu>
              </View>
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Limite Diario (Opcional)</Text>

            {/* Daily Limit */}
            <View style={styles.inputContainer}>
              <TextInput
                label="Limite diario (CLP)"
                value={dailyLimit}
                onChangeText={setDailyLimit}
                mode="outlined"
                error={!!errors.dailyLimit}
                style={styles.input}
                placeholder="0 = Sin limite"
                keyboardType="numeric"
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                left={<TextInput.Affix text="$" />}
              />
              {errors.dailyLimit ? (
                <HelperText type="error" visible={true}>
                  {errors.dailyLimit}
                </HelperText>
              ) : (
                <HelperText type="info" visible={true}>
                  Deja en 0 o vacio para no establecer limite
                </HelperText>
              )}
            </View>
          </Surface>

          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
            labelStyle={styles.submitButtonLabel}
          >
            {loading ? 'Guardando...' : 'Agregar Estudiante'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Snackbar for feedback messages */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={snackbarType === 'success' ? 1500 : 4000}
        style={[
          styles.snackbar,
          snackbarType === 'success' ? styles.snackbarSuccess : styles.snackbarError,
        ]}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  backButton: {
    margin: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 48,
  },
  formCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.background,
  },
  divider: {
    marginVertical: spacing.lg,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  selectButton: {
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    justifyContent: 'flex-start',
  },
  selectButtonError: {
    borderColor: colors.error,
  },
  selectButtonContent: {
    height: 56,
    justifyContent: 'flex-start',
  },
  selectButtonLabel: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  menuContent: {
    backgroundColor: colors.card,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  loadingText: {
    marginLeft: spacing.sm,
    color: colors.textSecondary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  submitButtonContent: {
    height: 56,
  },
  submitButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  snackbar: {
    marginBottom: spacing.lg,
  },
  snackbarSuccess: {
    backgroundColor: colors.success,
  },
  snackbarError: {
    backgroundColor: colors.error,
  },
});
