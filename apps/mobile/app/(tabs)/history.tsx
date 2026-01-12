import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '../../src/constants/theme';

export default function HistoryTab() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Historial</Text>
          <Text style={styles.subtitle}>Transacciones y movimientos</Text>
        </View>

        {/* Placeholder */}
        <Surface style={styles.placeholderCard} elevation={1}>
          <Text style={styles.placeholderIcon}>📜</Text>
          <Text style={styles.placeholderTitle}>Proximamente</Text>
          <Text style={styles.placeholderText}>
            Aqui podras ver el historial de transacciones, compras y movimientos de saldo de tus hijos.
          </Text>
        </Surface>

        {/* Filter placeholder */}
        <Surface style={styles.filterCard} elevation={1}>
          <Text style={styles.filterTitle}>Filtros</Text>
          <View style={styles.filterRow}>
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>Todos los hijos</Text>
            </View>
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>Este mes</Text>
            </View>
          </View>
        </Surface>

        {/* Empty state */}
        <Surface style={styles.emptyCard} elevation={1}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>Sin transacciones</Text>
          <Text style={styles.emptyText}>
            Aun no hay transacciones registradas. Cuando tus hijos realicen compras en el casino, apareceran aqui.
          </Text>
        </Surface>

        {/* Summary placeholder */}
        <Surface style={styles.summaryCard} elevation={1}>
          <Text style={styles.summaryTitle}>Resumen del mes</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total gastado:</Text>
            <Text style={styles.summaryValue}>$0</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Transacciones:</Text>
            <Text style={styles.summaryValue}>0</Text>
          </View>
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
  filterCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
  },
  filterChipText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    marginBottom: spacing.lg,
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
  summaryCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
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
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
