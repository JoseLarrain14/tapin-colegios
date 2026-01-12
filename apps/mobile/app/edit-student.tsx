import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, HelperText, IconButton, Menu, Divider, ActivityIndicator } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { apiService, Student, School } from '../src/services/api';
import { colors, spacing, borderRadius } from '../src/constants/theme';

// RUT validation utilities (same as add-student)
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
    return { valid: false, error: 'digit', message: `El digito verificador es incorrecto (deberia ser ${calculatedDigit})` };
  }

  return { valid: true };
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

export default function EditStudentScreen() {
  const router = useRouter();
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const { accessToken } = useAuthStore();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rut, setRut] = useState('');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [dailyLimit, setDailyLimit] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  // Original data for comparison
  const [originalStudent, setOriginalStudent] = useState<Student | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolMenuVisible, setSchoolMenuVisible] = useState(false);
  const [gradeMenuVisible, setGradeMenuVisible] = useState(false);
  const [sectionMenuVisible, setSectionMenuVisible] = useState(false);

  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    if (!accessToken || !studentId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Load student and schools in parallel
      const [studentResponse, schoolsResponse] = await Promise.all([
        apiService.getStudent(studentId, accessToken),
        apiService.getAllSchools(),
      ]);

      if (studentResponse.success && studentResponse.data) {
        const student = studentResponse.data;
        setOriginalStudent(student);
        setFirstName(student.firstName);
        setLastName(student.lastName);
        setRut(student.rut);
        setGrade(student.grade || '');
        setSection(student.section || '');
        setDailyLimit(student.dailyLimit > 0 ? String(student.dailyLimit) : '');

        // Set selected school
        if (schoolsResponse.success && schoolsResponse.data) {
          setSchools(schoolsResponse.data);
          const school = schoolsResponse.data.find(s => s.id === student.school.id);
          if (school) {
            setSelectedSchool(school);
          }
        }
      } else {
        Alert.alert('Error', 'No se pudo cargar el estudiante');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'Error de conexion');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleRutChange = (text: string) => {
    const cleaned = text.replace(/[^0-9kK\-.]/g, '').toUpperCase();
    setRut(cleaned);

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
    if (!validateForm()) {
      return;
    }

    if (!accessToken || !studentId) {
      Alert.alert('Error', 'Sesion invalida');
      router.replace('/login');
      return;
    }

    setSaving(true);

    try {
      const response = await apiService.updateStudent(
        studentId,
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
        Alert.alert(
          'Estudiante Actualizado',
          `Los datos de ${firstName} ${lastName} han sido actualizados.`,
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'No se pudo actualizar el estudiante');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrio un error al actualizar el estudiante');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Estudiante',
      `¿Estas seguro de que deseas eliminar a ${originalStudent?.firstName} ${originalStudent?.lastName}? Esta accion no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!accessToken || !studentId) return;

    setSaving(true);
    try {
      const response = await apiService.deleteStudent(studentId, accessToken);
      if (response.success) {
        Alert.alert('Estudiante Eliminado', 'El estudiante ha sido eliminado.');
        router.back();
      } else {
        Alert.alert('Error', response.message || 'No se pudo eliminar el estudiante');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrio un error al eliminar el estudiante');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <IconButton icon="arrow-left" size={24} onPress={() => router.back()} />
          <Text style={styles.title}>Editar Estudiante</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando datos...</Text>
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
            <Text style={styles.title}>Editar Estudiante</Text>
            <IconButton
              icon="delete"
              size={24}
              onPress={handleDelete}
              iconColor={colors.error}
            />
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
                <HelperText type="error" visible={true}>
                  {errors.firstName}
                </HelperText>
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
                <HelperText type="error" visible={true}>
                  {errors.lastName}
                </HelperText>
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
              {errors.school && (
                <HelperText type="error" visible={true}>
                  {errors.school}
                </HelperText>
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
            loading={saving}
            disabled={saving}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
            labelStyle={styles.submitButtonLabel}
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </ScrollView>
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
});
