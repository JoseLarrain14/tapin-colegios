import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Surface, ActivityIndicator, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../src/constants/theme';
import { useAuthStore } from '../src/store/authStore';
import { apiService, Student } from '../src/services/api';
import { formatCLP } from '../src/utils/dateFormat';
import { NetworkError } from '../src/components/NetworkError';
import ScreenHeader from '../src/components/ScreenHeader';

type Period = 'daily' | 'weekly' | 'monthly';

interface StatsData {
  period: string;
  startDate: string;
  endDate: string;
  summary: {
    totalSpent: number;
    transactionCount: number;
    averagePerTransaction: number;
    currentBalance: number;
  };
  chartData: Array<{
    label: string;
    spent: number;
    count: number;
  }>;
}

export default function SpendingStatsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ studentId: string }>();
  const { accessToken } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [period, setPeriod] = useState<Period>('daily');
  const [networkError, setNetworkError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!accessToken || !params.studentId) {
      setNetworkError('No se pudo cargar la informacion');
      setLoading(false);
      return;
    }

    try {
      setNetworkError(null);

      // Get student details
      const studentResponse = await apiService.getStudent(params.studentId, accessToken);
      if (studentResponse.success && studentResponse.data) {
        setStudent(studentResponse.data);
      }

      // Get stats
      const statsResponse = await apiService.getWalletStats(params.studentId, period, accessToken);
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      } else {
        // Si no hay stats disponibles, mostrar datos vacíos en lugar de error
        setStats({
          period,
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          summary: {
            totalSpent: 0,
            transactionCount: 0,
            averagePerTransaction: 0,
            currentBalance: studentResponse.data?.balance || 0,
          },
          chartData: [],
        });
      }
    } catch (error) {
      console.error('Load spending stats error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error de conexion';
      // Solo mostrar error de red si es realmente un problema de conectividad
      if (errorMsg.includes('Network') || errorMsg.includes('conexion') || errorMsg.includes('timeout') || errorMsg.includes('ECONNREFUSED')) {
        setNetworkError(errorMsg);
      } else {
        // Para otros errores (404, 500, etc.), mostrar estado vacío
        setStats({
          period,
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          summary: { totalSpent: 0, transactionCount: 0, averagePerTransaction: 0, currentBalance: 0 },
          chartData: [],
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, params.studentId, period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleRetry = () => {
    setLoading(true);
    loadData();
  };

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod);
    setLoading(true);
  };

  const getPeriodLabel = (p: Period) => {
    switch (p) {
      case 'daily':
        return 'Hoy';
      case 'weekly':
        return 'Semana';
      case 'monthly':
        return 'Mes';
    }
  };

  // Network error state
  if (networkError) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScreenHeader title="Estadisticas de Gastos" />
        <NetworkError
          message={networkError}
          onRetry={handleRetry}
          retrying={loading}
        />
      </SafeAreaView>
    );
  }

  // Loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScreenHeader title="Estadisticas de Gastos" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando estadisticas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate max spent for bar chart scaling
  const maxSpent = stats?.chartData?.length
    ? Math.max(...stats.chartData.map(d => d.spent), 1)
    : 1;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader
        title="Estadisticas de Gastos"
        rightAction={
          student ? (
            <View style={{ paddingRight: spacing.sm }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'right' }}>
                {student.firstName}
              </Text>
            </View>
          ) : null
        }
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.periodButton,
                period === p && styles.periodButtonActive,
              ]}
              onPress={() => handlePeriodChange(p)}
            >
              <Text style={[
                styles.periodButtonText,
                period === p && styles.periodButtonTextActive,
              ]}>
                {getPeriodLabel(p)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Card */}
        {stats && (
          <Surface style={styles.summaryCard} elevation={2}>
            <Text style={styles.summaryTitle}>Resumen</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <MaterialCommunityIcons name="cash-remove" size={24} color={colors.error} />
                <Text style={styles.summaryLabel}>Total Gastado</Text>
                <Text style={[styles.summaryValue, styles.spentValue]}>
                  {formatCLP(stats.summary.totalSpent)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <MaterialCommunityIcons name="cart" size={24} color={colors.primary} />
                <Text style={styles.summaryLabel}>Transacciones</Text>
                <Text style={styles.summaryValue}>
                  {stats.summary.transactionCount}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <MaterialCommunityIcons name="calculator" size={24} color={colors.warning} />
                <Text style={styles.summaryLabel}>Promedio</Text>
                <Text style={styles.summaryValue}>
                  {formatCLP(stats.summary.averagePerTransaction)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <MaterialCommunityIcons name="wallet" size={24} color={colors.success} />
                <Text style={styles.summaryLabel}>Saldo Actual</Text>
                <Text style={[styles.summaryValue, styles.balanceValue]}>
                  {formatCLP(stats.summary.currentBalance)}
                </Text>
              </View>
            </View>
          </Surface>
        )}

        {/* Chart */}
        {stats && stats.chartData.length > 0 && (
          <Surface style={styles.chartCard} elevation={1}>
            <Text style={styles.chartTitle}>Desglose</Text>
            <View style={styles.chart}>
              {stats.chartData.map((item, index) => (
                <View key={index} style={styles.chartItem}>
                  <Text style={styles.chartLabel}>{item.label}</Text>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        { width: `${(item.spent / maxSpent) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.chartAmount}>{formatCLP(item.spent)}</Text>
                </View>
              ))}
            </View>
          </Surface>
        )}

        {/* Empty State */}
        {stats && stats.chartData.length === 0 && (
          <Surface style={styles.emptyCard} elevation={1}>
            <MaterialCommunityIcons
              name="chart-bar"
              size={48}
              color={colors.textMuted}
            />
            <Text style={styles.emptyTitle}>Sin gastos</Text>
            <Text style={styles.emptyText}>
              No hay gastos registrados en este periodo. Los gastos apareceran aqui cuando se realicen compras.
            </Text>
          </Surface>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginLeft: -spacing.sm,
    marginBottom: spacing.sm,
  },
  backButtonLabel: {
    color: colors.primary,
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
  periodSelector: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodButtonTextActive: {
    color: colors.textOnPrimary,
  },
  summaryCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryItem: {
    width: '47%',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  spentValue: {
    color: colors.error,
  },
  balanceValue: {
    color: colors.success,
  },
  chartCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  chart: {
    gap: spacing.sm,
  },
  chartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chartLabel: {
    width: 70,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  chartAmount: {
    width: 70,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
