import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Text, TextInput, ActivityIndicator, Surface, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRegisterStore } from '../../src/store/registerStore';
import { useAuthStore } from '../../src/store/authStore';
import { apiService, School } from '../../src/services/api';
import { colors, spacing, borderRadius } from '../../src/constants/theme';

export default function RegisterStep5() {
  const router = useRouter();
  const { formData, setSelectedSchool } = useRegisterStore();
  const { accessToken } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    formData.selectedSchool?.id || null
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchSchools(searchQuery);
      } else if (searchQuery.length === 0) {
        loadAllSchools();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load all schools on mount
  useEffect(() => {
    loadAllSchools();
  }, []);

  const loadAllSchools = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.getAllSchools();
      if (response.success && response.data) {
        setSchools(response.data);
      } else {
        setError(response.message || 'Error al cargar colegios');
      }
    } catch (err) {
      setError('Error al cargar colegios');
    } finally {
      setIsLoading(false);
    }
  };

  const searchSchools = async (query: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.searchSchools(query);
      if (response.success && response.data) {
        setSchools(response.data);
      } else {
        setError(response.message || 'Error al buscar colegios');
      }
    } catch (err) {
      setError('Error al buscar colegios');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSchool = (school: School) => {
    setSelectedId(school.id);
    setSelectedSchool(school);
  };
  const handleContinue = async () => {
    if (!selectedId || !accessToken) return;

    setIsSaving(true);
    try {
      const response = await apiService.updatePreferredSchool(selectedId, accessToken);
      if (response.success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Error', response.message || 'Error al guardar colegio');
      }
    } catch (err) {
      Alert.alert('Error', 'Error al guardar colegio preferido');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    // Allow skipping school selection - can be added later
    router.replace('/(tabs)');
  };

  const renderSchoolItem = ({ item }: { item: School }) => {
    const isSelected = selectedId === item.id;
    return (
      <TouchableOpacity
        style={[styles.schoolCard, isSelected && styles.schoolCardSelected]}
        onPress={() => handleSelectSchool(item)}
        activeOpacity={0.7}
      >
        <View style={styles.schoolInfo}>
          <Text style={[styles.schoolName, isSelected && styles.schoolNameSelected]}>
            {item.name}
          </Text>
          <Text style={styles.schoolCode}>Codigo: {item.code}</Text>
          {item.city && (
            <Text style={styles.schoolLocation}>
              {item.city}{item.region ? `, ${item.region}` : ''}
            </Text>
          )}
          {item.address && (
            <Text style={styles.schoolAddress}>{item.address}</Text>
          )}
        </View>
        <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
          {isSelected && <View style={styles.radioInner} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={styles.progressText}>Paso 5 de 5</Text>
        </View>

        {/* Title */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Selecciona el colegio</Text>
          <Text style={styles.subtitle}>
            Busca y selecciona el colegio de tu hijo para continuar
          </Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <TextInput
            mode="outlined"
            placeholder="Buscar por nombre o codigo..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            left={<TextInput.Icon icon="magnify" color={colors.textSecondary} />}
            right={
              searchQuery.length > 0 ? (
                <TextInput.Icon
                  icon="close"
                  color={colors.textSecondary}
                  onPress={() => setSearchQuery('')}
                />
              ) : undefined
            }
          />
        </View>
      </View>

      {/* School List */}
      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Cargando colegios...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadAllSchools} style={styles.retryButton}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : schools.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery.length > 0
                ? 'No se encontraron colegios con ese nombre o codigo'
                : 'No hay colegios disponibles'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={schools}
            renderItem={renderSchoolItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, (!selectedId || isSaving) && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!selectedId || isSaving}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonLabel, (!selectedId || isSaving) && styles.buttonLabelDisabled]}>
            {isSaving ? 'Guardando...' : 'Continuar'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.skipButtonLabel}>Saltar por ahora</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  progressContainer: {
    marginBottom: spacing.lg,
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
    marginBottom: spacing.lg,
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
  searchContainer: {
    marginBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.surface,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  schoolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  schoolCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  schoolNameSelected: {
    color: colors.primary,
  },
  schoolCode: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  schoolLocation: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  schoolAddress: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    padding: spacing.md,
  },
  retryText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
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
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: colors.borderLight,
  },
  buttonLabel: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonLabelDisabled: {
    color: colors.textTertiary,
  },
  skipButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  skipButtonLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
