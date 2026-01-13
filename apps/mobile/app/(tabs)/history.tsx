import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Platform, Linking } from 'react-native';
import { Text, Surface, ActivityIndicator, Button, Dialog, Portal, Paragraph } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, borderRadius } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/authStore';
import { apiService, Student, Order, WalletLog, Payment } from '../../src/services/api';
import { formatDateTime, formatRelativeTime, formatCLP, formatShortDate } from '../../src/utils/dateFormat';
import { NetworkError } from '../../src/components/NetworkError';

interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

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
  // Source indication: 'app' for in-app orders, 'casino' for POS purchases
  source?: 'app' | 'casino';
  // Order-specific fields for detail view
  orderItems?: OrderItem[];
  cafeteriaName?: string;
  pickupDate?: string;
  pickupTime?: string;
  comments?: string;
}

export default function HistoryTab() {
  const { accessToken } = useAuthStore();
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [totalSpent, setTotalSpent] = useState(0);
  const [exporting, setExporting] = useState(false);

  // Cancel order state
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<TransactionItem | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Order detail state
  const [detailDialogVisible, setDetailDialogVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<TransactionItem | null>(null);

  // Month filter state
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);

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
        source: 'app' as const, // Orders made through the app
        // Include order details for detail view
        orderItems: order.items,
        cafeteriaName: order.cafeteria.name,
        pickupDate: order.pickupDate,
        pickupTime: order.pickupTime,
        comments: order.comments,
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

  // Deep link: Auto-open order detail when orderId is passed via URL
  useEffect(() => {
    if (orderId && transactions.length > 0 && !loading) {
      const targetOrder = transactions.find(t => t.id === orderId && t.type === 'order');
      if (targetOrder) {
        setSelectedOrder(targetOrder);
        setDetailDialogVisible(true);
        // Clear the URL parameter to prevent re-opening on subsequent renders
        router.setParams({ orderId: undefined });
      }
    }
  }, [orderId, transactions, loading, router]);

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

  // Cancel order functions
  const canCancelOrder = (transaction: TransactionItem) => {
    // Only orders can be cancelled
    if (transaction.type !== 'order') return false;
    // Only pending, confirmed, or preparing orders can be cancelled
    return ['pending', 'confirmed', 'preparing'].includes(transaction.status || '');
  };

  const handleCancelPress = (transaction: TransactionItem) => {
    setOrderToCancel(transaction);
    setCancelDialogVisible(true);
  };

  const handleCancelConfirm = async () => {
    if (!orderToCancel || !accessToken) return;

    setCancelling(true);
    try {
      const response = await apiService.cancelOrder(orderToCancel.id, accessToken);

      if (response.success) {
        Alert.alert(
          'Pedido cancelado',
          'Tu pedido ha sido cancelado y el saldo ha sido reembolsado.',
          [{ text: 'OK' }]
        );
        // Reload data to get updated balances and statuses
        loadData();
      } else {
        Alert.alert(
          'Error',
          response.message || 'No se pudo cancelar el pedido',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Cancel order error:', error);
      Alert.alert(
        'Error',
        'Ocurrio un error al cancelar el pedido. Por favor, intenta de nuevo.',
        [{ text: 'OK' }]
      );
    } finally {
      setCancelling(false);
      setCancelDialogVisible(false);
      setOrderToCancel(null);
    }
  };

  const handleCancelDismiss = () => {
    setCancelDialogVisible(false);
    setOrderToCancel(null);
  };

  // Order detail handlers
  const handleOrderPress = (transaction: TransactionItem) => {
    if (transaction.type === 'order') {
      setSelectedOrder(transaction);
      setDetailDialogVisible(true);
    }
  };

  const handleDetailDismiss = () => {
    setDetailDialogVisible(false);
    setSelectedOrder(null);
  };

  const handleExport = async () => {
    if (!accessToken) return;

    setExporting(true);
    try {
      // Pass selectedStudent's ID to filter the export
      const result = await apiService.exportTransactionsCsv(accessToken, selectedStudent?.id);
      if (result.success && result.url) {
        // For web, open the URL with auth header via fetch and download
        if (Platform.OS === 'web') {
          try {
            const response = await fetch(result.url, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            });

            if (!response.ok) {
              throw new Error('Error al descargar el archivo');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transacciones_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            Alert.alert('Exito', 'Archivo CSV descargado correctamente');
          } catch (fetchError) {
            console.error('Download error:', fetchError);
            Alert.alert('Error', 'No se pudo descargar el archivo');
          }
        } else {
          // For native, use Linking to open the URL
          const supported = await Linking.canOpenURL(result.url);
          if (supported) {
            await Linking.openURL(result.url);
          } else {
            Alert.alert('Error', 'No se puede abrir el enlace de descarga');
          }
        }
      } else {
        Alert.alert('Error', result.message || 'Error al exportar transacciones');
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Error al exportar transacciones');
    } finally {
      setExporting(false);
    }
  };

  // Filter transactions by selected student
  // Helper to get available months from transactions
  const getAvailableMonths = () => {
    const monthsSet = new Set<string>();
    transactions.forEach(t => {
      const date = new Date(t.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(monthKey);
    });
    return Array.from(monthsSet).sort().reverse().map(key => {
      const [year, month] = key.split('-').map(Number);
      return new Date(year, month - 1, 1);
    });
  };

  const availableMonths = getAvailableMonths();

  // Format month for display
  const formatMonth = (date: Date) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Check if transaction is in selected month
  const isInSelectedMonth = (timestamp: string) => {
    if (!selectedMonth) return true;
    const date = new Date(timestamp);
    return date.getMonth() === selectedMonth.getMonth() &&
           date.getFullYear() === selectedMonth.getFullYear();
  };

  // Filter transactions by student and month
  const filteredTransactions = transactions.filter(t => {
    // Student filter
    if (selectedStudent && t.studentName && !t.studentName.includes(selectedStudent.firstName)) {
      return false;
    }
    // Month filter
    if (!isInSelectedMonth(t.timestamp)) {
      return false;
    }
    return true;
  });

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
      {/* Cancel Confirmation Dialog */}
      <Portal>
        <Dialog visible={cancelDialogVisible} onDismiss={handleCancelDismiss}>
          <Dialog.Title>Cancelar pedido</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              ¿Estas seguro que deseas cancelar este pedido? El saldo sera reembolsado a tu cuenta.
            </Paragraph>
            {orderToCancel && (
              <View style={styles.cancelDialogDetails}>
                <Text style={styles.cancelDialogAmount}>
                  Monto a reembolsar: {formatCLP(orderToCancel.amount)}
                </Text>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCancelDismiss} disabled={cancelling}>
              No, mantener
            </Button>
            <Button
              onPress={handleCancelConfirm}
              loading={cancelling}
              disabled={cancelling}
              textColor={colors.error}
            >
              Si, cancelar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Order Detail Dialog */}
      <Portal>
        <Dialog visible={detailDialogVisible} onDismiss={handleDetailDismiss}>
          <Dialog.Title>Detalle del pedido</Dialog.Title>
          <Dialog.Content>
            {selectedOrder && (
              <View>
                {/* Status */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Estado:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedOrder.status) }]}>
                      {getStatusText(selectedOrder.status)}
                    </Text>
                  </View>
                </View>

                {/* Date/Time of transaction */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fecha y hora:</Text>
                  <Text style={styles.detailValue}>{formatDateTime(selectedOrder.timestamp)}</Text>
                </View>

                {/* Cafeteria */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cafeteria:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.cafeteriaName}</Text>
                </View>

                {/* Student */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Estudiante:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.studentName}</Text>
                </View>

                {/* Validation method */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Metodo de validacion:</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.source === 'app' ? 'App movil' : 'Punto de venta'}
                  </Text>
                </View>

                {/* Pickup */}
                {selectedOrder.pickupDate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Retiro:</Text>
                    <Text style={styles.detailValue}>
                      {formatShortDate(selectedOrder.pickupDate)} {selectedOrder.pickupTime || ''}
                    </Text>
                  </View>
                )}

                {/* Items section */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Items del pedido</Text>
                  {selectedOrder.orderItems && selectedOrder.orderItems.map((item, index) => (
                    <View key={index} style={styles.orderItemRow}>
                      <Text style={styles.orderItemName}>{item.quantity}x {item.name}</Text>
                      <Text style={styles.orderItemPrice}>{formatCLP(item.price * item.quantity)}</Text>
                    </View>
                  ))}
                </View>

                {/* Total */}
                <View style={styles.detailTotalRow}>
                  <Text style={styles.detailTotalLabel}>Total:</Text>
                  <Text style={styles.detailTotalValue}>{formatCLP(selectedOrder.amount)}</Text>
                </View>

                {/* Comments */}
                {selectedOrder.comments && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Comentarios</Text>
                    <Text style={styles.detailComments}>{selectedOrder.comments}</Text>
                  </View>
                )}
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleDetailDismiss}>Cerrar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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

        {/* Month filter */}
        {availableMonths.length > 0 && (
          <Surface style={styles.filterCard} elevation={1}>
            <Text style={styles.filterTitle}>Filtrar por mes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    !selectedMonth && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedMonth(null)}
                  testID="month-filter-all"
                >
                  <Text style={[
                    styles.filterChipText,
                    !selectedMonth && styles.filterChipTextActive,
                  ]}>
                    Todo
                  </Text>
                </TouchableOpacity>
                {availableMonths.map((month, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.filterChip,
                      selectedMonth?.getTime() === month.getTime() && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedMonth(month)}
                    testID={`month-filter-${month.getMonth()}-${month.getFullYear()}`}
                  >
                    <Text style={[
                      styles.filterChipText,
                      selectedMonth?.getTime() === month.getTime() && styles.filterChipTextActive,
                    ]}>
                      {formatMonth(month)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Surface>
        )}

        {/* Summary card */}
        <Surface style={styles.summaryCard} elevation={1}>
          <Text style={styles.summaryTitle}>
            Resumen{selectedMonth ? ` - ${formatMonth(selectedMonth)}` : ''}
          </Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total gastado:</Text>
            <Text style={styles.summaryValue}>
              {formatCLP(filteredTransactions.filter(t => !t.isPositive).reduce((sum, t) => sum + t.amount, 0))}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Transacciones:</Text>
            <Text style={styles.summaryValue}>{filteredTransactions.length}</Text>
          </View>
        </Surface>

        {/* Export button */}
        {transactions.length > 0 && (
          <Button
            mode="outlined"
            onPress={handleExport}
            loading={exporting}
            disabled={exporting}
            icon="download"
            style={styles.exportButton}
            contentStyle={styles.exportButtonContent}
            labelStyle={styles.exportButtonLabel}
            testID="export-button"
          >
            {exporting ? 'Exportando...' : 'Exportar a CSV'}
          </Button>
        )}

        {/* Transactions list */}
        {filteredTransactions.length > 0 ? (
          <View style={styles.transactionsSection}>
            <Text style={styles.sectionTitle}>Movimientos recientes</Text>
            {filteredTransactions.map(transaction => (
              <TouchableOpacity
                key={transaction.id}
                onPress={() => handleOrderPress(transaction)}
                activeOpacity={transaction.type === 'order' ? 0.7 : 1}
                disabled={transaction.type !== 'order'}
                testID={`transaction-${transaction.id}`}
                accessibilityLabel={transaction.type === 'order' ? 'Ver detalles del pedido' : undefined}
              >
                <Surface style={styles.transactionCard} elevation={1}>
                  <View style={styles.transactionHeader}>
                    <View style={styles.transactionIconContainer}>
                      <Text style={styles.transactionIcon}>{getTypeIcon(transaction.type)}</Text>
                    </View>
                    <View style={styles.transactionInfo}>
                      <View style={styles.transactionTitleRow}>
                        <Text style={styles.transactionTitle}>{transaction.title}</Text>
                        {/* Source indicator for orders */}
                        {transaction.source && (
                          <View style={[styles.sourceBadge, transaction.source === 'app' ? styles.sourceApp : styles.sourceCasino]}>
                            <Text style={styles.sourceText}>
                              {transaction.source === 'app' ? 'Via App' : 'En cafeteria'}
                            </Text>
                          </View>
                        )}
                      </View>
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
                    <View style={styles.timestampContainer}>
                      <Text style={styles.timestampText}>
                        {formatDateTime(transaction.timestamp)}
                      </Text>
                      <Text style={styles.relativeTimeText}>
                        ({formatRelativeTime(transaction.timestamp)})
                      </Text>
                    </View>
                    {/* Cancel button for cancellable orders */}
                    {canCancelOrder(transaction) && (
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => handleCancelPress(transaction)}
                        testID={`cancel-order-${transaction.id}`}
                        accessibilityLabel="Cancelar pedido"
                        accessibilityRole="button"
                      >
                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {/* Tap hint for orders */}
                  {transaction.type === 'order' && (
                    <Text style={styles.tapHint}>Toca para ver detalles</Text>
                  )}
                </Surface>
              </TouchableOpacity>
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
    marginBottom: spacing.md,
  },
  exportButton: {
    marginBottom: spacing.lg,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  exportButtonContent: {
    paddingVertical: spacing.xs,
  },
  exportButtonLabel: {
    color: colors.primary,
    fontSize: 14,
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
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.errorLight,
    marginLeft: spacing.sm,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
  cancelDialogDetails: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  cancelDialogAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
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
  tapHint: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  // Order detail dialog styles
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  detailSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  orderItemName: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: spacing.md,
  },
  detailTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.primary,
  },
  detailTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  detailTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  detailComments: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  transactionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  sourceBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  sourceApp: {
    backgroundColor: colors.primaryLight,
  },
  sourceCasino: {
    backgroundColor: colors.warningLight || '#FEF3CD',
  },
  sourceText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.primary,
  },
});
