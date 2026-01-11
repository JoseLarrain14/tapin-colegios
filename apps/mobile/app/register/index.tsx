import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRegisterStore, RelationshipType } from '../../src/store/registerStore';
import { colors, spacing, borderRadius, shadows } from '../../src/constants/theme';

interface RelationshipOption {
  type: RelationshipType;
  label: string;
  emoji: string;
}

const relationshipOptions: RelationshipOption[] = [
  { type: 'father', label: 'Padre', emoji: '' },
  { type: 'mother', label: 'Madre', emoji: '' },
  { type: 'guardian', label: 'Apoderado/Tutor', emoji: '' },
  { type: 'other', label: 'Otro', emoji: '' },
];

export default function RegisterStep1() {
  const router = useRouter();
  const { formData, setRelationship, setCurrentStep } = useRegisterStore();

  const handleSelect = (relationship: RelationshipType) => {
    setRelationship(relationship);
    setCurrentStep(2);
    router.push('/register/step2');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '25%' }]} />
          </View>
          <Text style={styles.progressText}>Paso 1 de 4</Text>
        </View>

        {/* Title */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Cual es tu relacion?</Text>
          <Text style={styles.subtitle}>
            Selecciona como te relacionas con el estudiante
          </Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {relationshipOptions.map((option) => (
            <TouchableOpacity
              key={option.type}
              onPress={() => handleSelect(option.type)}
              activeOpacity={0.7}
            >
              <Surface
                style={[
                  styles.optionCard,
                  formData.relationship === option.type && styles.optionCardSelected,
                ]}
                elevation={1}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionEmoji}>{option.emoji}</Text>
                  <Text
                    style={[
                      styles.optionLabel,
                      formData.relationship === option.type && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioOuter,
                    formData.relationship === option.type && styles.radioOuterSelected,
                  ]}
                >
                  {formData.relationship === option.type && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </Surface>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
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
  optionsContainer: {
    gap: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionEmoji: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  optionLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
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
});
