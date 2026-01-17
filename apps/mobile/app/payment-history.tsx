import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Surface, ActivityIndicator, Button, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../src/constants/theme';
import { useAuthStore } from '../src/store/authStore';
import { apiService, Payment } from '../src/services/api';
import { formatCLP } from '../src/utils/dateFormat';
import { NetworkError } from '../src/components/NetworkError';
import ScreenHeader from '../src/components/ScreenHeader';

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const { accessToken } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const loadData = useCallback(async () => {
    if (!accessToken) {
      setNetworkError('No se pudo cargar la informacion');
      setLoading(false);
      return;
    }

    try {
      setNetworkError(null);

      const response = await apiService.getPayments(accessToken);
      if (response.success && response.data) {
        setPayments(response.data.payments);
      } else {
        setNetworkError(response.message || 'Error al cargar historial de pagos');
      }
    } catch (error) {
      console.error('Load payment history error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error de conexion';
      setNetworkError(errorMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'pending':
      case 'processing':
        return colors.warning;
      case 'failed':
        return colors.error;
      case 'refunded':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'pending':
        return 'Pendiente';
      case 'processing':
        return 'Procesando';
      case 'failed':
        return 'Fallido';
      case 'refunded':
        return 'Reembolsado';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string): keyof typeof MaterialCommunityIcons.glyphMap => {
    switch (status) {
      case 'completed':
        return 'check-circle';
      case 'pending':
        return 'clock-outline';
      case 'processing':
        return 'sync';
      case 'failed':
        return 'close-circle';
      case 'refunded':
        return 'undo';
      default:
        return 'help-circle';
    }
  };

  const getPaymentMethodLabel = (gateway: string) => {
    switch (gateway) {
      case 'mock':
        return 'Tarjeta';
      case 'transbank':
        return 'Transbank';
      case 'mercadopago':
        return 'MercadoPago';
      default:
        return gateway;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Network error state
  if (networkError) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScreenHeader title="Historial de Pagos" />
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
        <ScreenHeader title="Historial de Pagos" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando historial...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader
        title="Historial de Pagos"
        rightAction={
          <View style={{ paddingRight: spacing.sm }}>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
              {payments.length} {payments.length === 1 ? 'pago' : 'pagos'}
            </Text>
          </View>
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

        {/* Payment Details Modal/Overlay */}
        {selectedPayment && (
          <Surface style={styles.detailsCard} elevation={3}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>Detalle del Pago</Text>
              <TouchableOpacity onPress={() => setSelectedPayment(null)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Monto:</Text>
              <Text style={styles.detailValue}>{formatCLP(selectedPayment.amount)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Estado:</Text>
              <Chip
                icon={() => (
                  <MaterialCommunityIcons
                    name={getStatusIcon(selectedPayment.status)}
                    size={16}
                    color={getStatusColor(selectedPayment.status)}
                  />
                )}
                style={[styles.statusChip, { backgroundColor: getStatusColor(selectedPayment.status) + '20' }]}
                textStyle={{ color: getStatusColor(selectedPayment.status) }}
              >
                {getStatusLabel(selectedPayment.status)}
              </Chip>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Metodo:</Text>
              <Text style={styles.detailValue}>{getPaymentMethodLabel(selectedPayment.gateway)}</Text>
            </View>

            {selectedPayment.student && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Estudiante:</Text>
                <Text style={styles.detailValue}>
                  {selectedPayment.student.firstName} {selectedPayment.student.lastName}
                </Text>
              </View>
            )}

            {selectedPayment.package && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Paquete:</Text>
                <Text style={styles.detailValue}>{selectedPayment.package.name}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Fecha:</Text>
              <Text style={styles.detailValue}>{formatDate(selectedPayment.createdAt)}</Text>
            </View>

            {selectedPayment.completedAt && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Completado:</Text>
                <Text style={styles.detailValue}>{formatDate(selectedPayment.completedAt)}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ID:</Text>
              <Text style={styles.detailValueSmall}>{selectedPayment.id}</Text>
            </View>

            <Button
              mode="outlined"
              onPress={() => setSelectedPayment(null)}
              style={styles.closeButton}
            >
              Cerrar
            </Button>
          </Surface>
        )}

        {/* Payments List */}
        {payments.length > 0 ? (
          <View style={styles.paymentsList}>
            {payments.map((payment) => (
              <TouchableOpacity
                key={payment.id}
                onPress={() => setSelectedPayment(payment)}
              >
                <Surface style={styles.paymentCard} elevation={1}>
                  <View style={styles.paymentHeader}>
                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentAmount}>{formatCLP(payment.amount)}</Text>
                      <Chip
                        icon={() => (
                          <MaterialCommunityIcons
                            name={getStatusIcon(payment.status)}
                            size={14}
                            color={getStatusColor(payment.status)}
                          />
                        )}
                        style={[styles.statusChipSmall, { backgroundColor: getStatusColor(payment.status) + '20' }]}
                        textStyle={{ color: getStatusColor(payment.status), fontSize: 11 }}
                      >
                        {getStatusLabel(payment.status)}
                      </Chip>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={24}
                      color={colors.textMuted}
                    />
                  </View>

                  <View style={styles.paymentDetails}>
                    {payment.student && (
                      <View style={styles.paymentDetailRow}>
                        <MaterialCommunityIcons name="account" size={16} color={colors.textSecondary} />
                        <Text style={styles.paymentDetailText}>
                          {payment.student.firstName} {payment.student.lastName}
                        </Text>
                      </View>
                    )}

                    <View style={styles.paymentDetailRow}>
                      <MaterialCommunityIcons name="credit-card" size={16} color={colors.textSecondary} />
                      <Text style={styles.paymentDetailText}>
                        {getPaymentMethodLabel(payment.gateway)}
                      </Text>
                    </View>

                    <View style={styles.paymentDetailRow}>
                      <MaterialCommunityIcons name="calendar" size={16} color={colors.textSecondary} />
                      <Text style={styles.paymentDetailText}>
                        {formatDate(payment.createdAt)}
                      </Text>
                    </View>
                  </View>
                </Surface>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Surface style={styles.emptyCard} elevation={1}>
            <MaterialCommunityIcons
              name="credit-card-off"
              size={48}
              color={colors.textMuted}
            />
            <Text style={styles.emptyTitle}>Sin pagos</Text>
            <Text style={styles.emptyText}>
              No hay pagos registrados todavia. Los pagos apareceran aqui cuando realices recargas.
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
  detailsCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
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
    fontWeight: '600',
    color: colors.textPrimary,
  },
  detailValueSmall: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  statusChip: {
    height: 28,
  },
  statusChipSmall: {
    height: 24,
  },
  closeButton: {
    marginTop: spacing.lg,
    borderColor: colors.primary,
  },
  paymentsList: {
    gap: spacing.md,
  },
  paymentCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  paymentDetails: {
    gap: spacing.xs,
  },
  paymentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  paymentDetailText: {
    fontSize: 13,
    color: colors.textSecondary,
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
