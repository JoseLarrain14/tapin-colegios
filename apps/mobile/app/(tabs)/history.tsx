import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { colors, spacing, borderRadius } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/authStore';
import { apiService, Student, Order, WalletLog, Payment } from '../../src/services/api';
import { formatDateTime, formatRelativeTime, formatCLP, formatShortDate } from '../../src/utils/dateFormat';
import { NetworkError } from '../../src/components/NetworkError';

interface TransactionItem {
  id: string;
  type: 'order' | 'payment' | 'wallet_log';
  title: string;
  description: string;
  amount: number;
  isPositive: boolean;
  timestamp: string;
  status?: string;
  studentName?: string;
}

export default function HistoryTab() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [totalSpent, setTotalSpent] = useState(0);

  const loadData = useCallback(async () => {
    if (!accessToken) return;

    try {
      setNetworkError(null);

      // Get students
      const studentsResponse = await apiService.getStudents(accessToken);
      if (studentsResponse.success && studentsResponse.data) {
        const studentList = Array.isArray(studentsResponse.data)
          ? studentsResponse.data
          : (studentsResponse.data as any).students || [];
        setStudents(studentList);

        if (studentList.length > 0 && !selectedStudent) {
          setSelectedStudent(studentList[0]);
        }
      }

      // Get orders
      const ordersResponse = await apiService.getOrders(accessToken);
      const orders = ordersResponse.success && ordersResponse.data
        ? ordersResponse.data.orders || []
        : [];

      // Get payments
      const paymentsResponse = await apiService.getPayments(accessToken);
      const payments = paymentsResponse.success && paymentsResponse.data
        ? paymentsResponse.data.payments || []
        : [];

      // Transform orders to transaction items
      const orderTransactions: TransactionItem[] = orders.map((order: Order) => ({
        id: order.id,
        type: 'order' as const,
        title: 'Pedido en cafeteria',
        description: `${order.items.length} item${order.items.length !== 1 ? 's' : ''} - ${order.cafeteria.name}`,
        amount: order.total,
        isPositive: false,
        timestamp: order.createdAt,
        status: order.status,
        studentName: `${order.student.firstName} ${order.student.lastName}`,
      }));

      // Transform payments to transaction items
      const paymentTransactions: TransactionItem[] = payments.map((payment: Payment) => ({
        id: payment.id,
        type: 'payment' as const,
        title: payment.package ? `Recarga: ${payment.package.name}` : 'Recarga de saldo',
        description: payment.student ? `Para ${payment.student.firstName}` : 'Recarga',
        amount: payment.amount,
        isPositive: true,
        timestamp: payment.createdAt,
        status: payment.status,
        studentName: payment.student ? `${payment.student.firstName} ${payment.student.lastName}` : undefined,
      }));

      // Combine and sort by timestamp (most recent first)
      const allTransactions = [...orderTransactions, ...paymentTransactions].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setTransactions(allTransactions);

      // Calculate total spent (orders only)
      const spent = orderTransactions.reduce((sum, t) => sum + t.amount, 0);
      setTotalSpent(spent);
    } catch (error) {
      console.error('Load history error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error de conexion';
      setNetworkError(errorMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, selectedStudent]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Reload when screen gains focus
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

  // Filter transactions by selected student
  const filteredTransactions = selectedStudent
    ? transactions.filter(t => !t.studentName || t.studentName.includes(selectedStudent.firstName))
    : transactions;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return colors.success;
      case 'pending':
      case 'confirmed':
      case 'preparing':
      case 'ready':
        return colors.warning;
      case 'failed':
      case 'cancelled':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'delivered': return 'Entregado';
      case 'pending': return 'Pendiente';
      case 'confirmed': return 'Confirmado';
      case 'preparing': return 'Preparando';
      case 'ready': return 'Listo';
      case 'failed': return 'Fallido';
      case 'cancelled': return 'Cancelado';
      case 'processing': return 'Procesando';
      case 'refunded': return 'Reembolsado';
      default: return status || '';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'order': return '🍽️';
      case 'payment': return '💳';
      case 'wallet_log': return '💰';
      default: return '📋';
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
          <Text style={styles.title}>Historial</Text>
          <Text style={styles.subtitle}>Transacciones y movimientos</Text>
        </View>

        {/* Student filter */}
        {students.length > 1 && (
          <Surface style={styles.filterCard} elevation={1}>
            <Text style={styles.filterTitle}>Filtrar por hijo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    !selectedStudent && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedStudent(null)}
                >
                  <Text style={[
                    styles.filterChipText,
                    !selectedStudent && styles.filterChipTextActive,
                  ]}>
                    Todos
                  </Text>
                </TouchableOpacity>
                {students.map(student => (
                  <TouchableOpacity
                    key={student.id}
                    style={[
                      styles.filterChip,
                      selectedStudent?.id === student.id && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedStudent(student)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      selectedStudent?.id === student.id && styles.filterChipTextActive,
                    ]}>
                      {student.firstName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Surface>
        )}

        {/* Summary card */}
        <Surface style={styles.summaryCard} elevation={1}>
          <Text style={styles.summaryTitle}>Resumen</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total gastado:</Text>
            <Text style={styles.summaryValue}>{formatCLP(totalSpent)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Transacciones:</Text>
            <Text style={styles.summaryValue}>{filteredTransactions.length}</Text>
          </View>
        </Surface>

        {/* Transactions list */}
        {filteredTransactions.length > 0 ? (
          <View style={styles.transactionsSection}>
            <Text style={styles.sectionTitle}>Movimientos recientes</Text>
            {filteredTransactions.map(transaction => (
              <Surface key={transaction.id} style={styles.transactionCard} elevation={1}>
                <View style={styles.transactionHeader}>
                  <View style={styles.transactionIconContainer}>
                    <Text style={styles.transactionIcon}>{getTypeIcon(transaction.type)}</Text>
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionTitle}>{transaction.title}</Text>
                    <Text style={styles.transactionDescription}>{transaction.description}</Text>
                    {transaction.studentName && (
                      <Text style={styles.transactionStudent}>{transaction.studentName}</Text>
                    )}
                  </View>
                  <View style={styles.transactionAmount}>
                    <Text style={[
                      styles.amountText,
                      transaction.isPositive ? styles.amountPositive : styles.amountNegative,
                    ]}>
                      {transaction.isPositive ? '+' : '-'}{formatCLP(transaction.amount)}
                    </Text>
                    {transaction.status && (
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(transaction.status) }]}>
                          {getStatusText(transaction.status)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.transactionFooter}>
                  <Text style={styles.timestampText}>
                    {formatDateTime(transaction.timestamp)}
                  </Text>
                  <Text style={styles.relativeTimeText}>
                    ({formatRelativeTime(transaction.timestamp)})
                  </Text>
                </View>
              </Surface>
            ))}
          </View>
        ) : (
          <Surface style={styles.emptyCard} elevation={1}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Sin transacciones</Text>
            <Text style={styles.emptyText}>
              Aun no hay transacciones registradas. Cuando realices recargas o pedidos, apareceran aqui.
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
  filterCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.textOnPrimary,
  },
  summaryCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
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
  transactionsSection: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  transactionCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  transactionIcon: {
    fontSize: 20,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  transactionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  transactionStudent: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '700',
  },
  amountPositive: {
    color: colors.success,
  },
  amountNegative: {
    color: colors.error,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  transactionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  timestampText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  relativeTimeText: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  emptyCard: {
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
