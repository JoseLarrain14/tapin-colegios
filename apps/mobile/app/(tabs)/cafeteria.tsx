import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '../../src/constants/theme';

export default function CafeteriaTab() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Cafeteria</Text>
          <Text style={styles.subtitle}>Menu del casino escolar</Text>
        </View>

        {/* Placeholder */}
        <Surface style={styles.placeholderCard} elevation={1}>
          <Text style={styles.placeholderIcon}>🍽️</Text>
          <Text style={styles.placeholderTitle}>Proximamente</Text>
          <Text style={styles.placeholderText}>
            Aqui podras ver el menu del casino, realizar pedidos y gestionar las comidas de tus hijos.
          </Text>
        </Surface>

        {/* Week selector placeholder */}
        <Surface style={styles.weekCard} elevation={1}>
          <Text style={styles.weekTitle}>Semana actual</Text>
          <View style={styles.weekDays}>
            {['Lun', 'Mar', 'Mie', 'Jue', 'Vie'].map((day, index) => (
              <View
                key={day}
                style={[
                  styles.dayButton,
                  index === new Date().getDay() - 1 && styles.dayButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    index === new Date().getDay() - 1 && styles.dayTextActive,
                  ]}
                >
                  {day}
                </Text>
              </View>
            ))}
          </View>
        </Surface>

        {/* Empty menu state */}
        <Surface style={styles.emptyMenuCard} elevation={1}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>Sin menu disponible</Text>
          <Text style={styles.emptyText}>
            El menu de hoy aun no ha sido publicado. Vuelve mas tarde.
          </Text>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  placeholderCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 20,
  },
  weekCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  dayButtonActive: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  dayTextActive: {
    color: colors.textOnPrimary,
  },
  emptyMenuCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
