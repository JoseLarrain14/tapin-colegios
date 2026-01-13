import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Surface, ActivityIndicator, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../src/constants/theme';
import { useAuthStore } from '../src/store/authStore';
import { apiService, Student, WalletLog } from '../src/services/api';
import { formatDateTime, formatCLP } from '../src/utils/dateFormat';
import { NetworkError } from '../src/components/NetworkError';

export default function WalletHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ studentId: string }>();
  const { accessToken } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [logs, setLogs] = useState<WalletLog[]>([]);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [currentBalance, setCurrentBalance] = useState(0);

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

      // Get wallet logs
      const logsResponse = await apiService.getWalletLogs(params.studentId, accessToken);
      if (logsResponse.success && logsResponse.data) {
        setLogs(logsResponse.data.logs || []);
        setCurrentBalance(logsResponse.data.currentBalance || 0);
      }
    } catch (error) {
      console.error('Load wallet history error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error de conexion';
      setNetworkError(errorMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, params.studentId]);

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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'cash-plus';
      case 'purchase':
        return 'cart';
      case 'refund':
        return 'cash-refund';
      case 'adjustment':
        return 'tune';
      default:
        return 'cash';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'Recarga';
      case 'purchase':
        return 'Compra';
      case 'refund':
        return 'Reembolso';
      case 'adjustment':
        return 'Ajuste';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'refund':
        return colors.success;
      case 'purchase':
        return colors.error;
      case 'adjustment':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  // Network error state
  if (networkError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando historial...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
        {/* Header */}
        <View style={styles.header}>
          <Button
            mode="text"
            onPress={() => router.back()}
            icon="arrow-left"
            style={styles.backButton}
            labelStyle={styles.backButtonLabel}
          >
            Volver
          </Button>
          <Text style={styles.title}>Historial de Saldo</Text>
          {student && (
            <Text style={styles.subtitle}>
              {student.firstName} {student.lastName}
            </Text>
          )}
        </View>

        {/* Current Balance Card */}
        <Surface style={styles.balanceCard} elevation={2}>
          <Text style={styles.balanceLabel}>Saldo Actual</Text>
          <Text style={[
            styles.balanceAmount,
            currentBalance > 0 ? styles.positiveBalance :
            currentBalance < 0 ? styles.negativeBalance :
            styles.zeroBalance
          ]}>
            {formatCLP(currentBalance)}
          </Text>
        </Surface>

        {/* Wallet Logs List */}
        {logs.length > 0 ? (
          <View style={styles.logsSection}>
            <Text style={styles.sectionTitle}>Movimientos</Text>
            {logs.map((log) => (
              <Surface key={log.id} style={styles.logCard} elevation={1}>
                <View style={styles.logHeader}>
                  <View style={[styles.logIconContainer, { backgroundColor: getTypeColor(log.type) + '20' }]}>
                    <MaterialCommunityIcons
                      name={getTypeIcon(log.type) as any}
                      size={20}
                      color={getTypeColor(log.type)}
                    />
                  </View>
                  <View style={styles.logInfo}>
                    <Text style={styles.logType}>{getTypeLabel(log.type)}</Text>
                    <Text style={styles.logDescription}>{log.description || '-'}</Text>
                  </View>
                  <View style={styles.logAmount}>
                    <Text style={[
                      styles.amountText,
                      log.amount >= 0 ? styles.positiveAmount : styles.negativeAmount
                    ]}>
                      {log.amount >= 0 ? '+' : ''}{formatCLP(log.amount)}
                    </Text>
                  </View>
                </View>
                <View style={styles.logDetails}>
                  <View style={styles.balanceChange}>
                    <Text style={styles.balanceChangeLabel}>Saldo:</Text>
                    <Text style={styles.balanceChangeValue}>
                      {formatCLP(log.balanceBefore)} → {formatCLP(log.balanceAfter)}
                    </Text>
                  </View>
                  <Text style={styles.logDate}>
                    {formatDateTime(log.createdAt)}
                  </Text>
                </View>
              </Surface>
            ))}
          </View>
        ) : (
          <Surface style={styles.emptyCard} elevation={1}>
            <MaterialCommunityIcons
              name="wallet-outline"
              size={48}
              color={colors.textMuted}
            />
            <Text style={styles.emptyTitle}>Sin movimientos</Text>
            <Text style={styles.emptyText}>
              Aun no hay movimientos registrados en la billetera. Los depositos, compras y ajustes apareceran aqui.
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
    marginBottom: spacing.xl,
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
  balanceCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
  },
  positiveBalance: {
    color: colors.success,
  },
  negativeBalance: {
    color: colors.error,
  },
  zeroBalance: {
    color: colors.textSecondary,
  },
  logsSection: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  logCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  logInfo: {
    flex: 1,
  },
  logType: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  logDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  positiveAmount: {
    color: colors.success,
  },
  negativeAmount: {
    color: colors.error,
  },
  logDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  balanceChange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceChangeLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  balanceChangeValue: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  logDate: {
    fontSize: 12,
    color: colors.textMuted,
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
