import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, Surface, ActivityIndicator, RadioButton, TextInput } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { apiService, Student, RechargePackage } from '../src/services/api';
import { colors, spacing, borderRadius } from '../src/constants/theme';

type PaymentMethod = 'credit_card' | 'debit_card' | 'transfer';

export default function RechargeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ studentId: string }>();
  const { accessToken } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [packages, setPackages] = useState<RechargePackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<RechargePackage | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [success, setSuccess] = useState(false);
  const [newBalance, setNewBalance] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [params.studentId]);

  const loadData = async () => {
    if (!accessToken || !params.studentId) {
      setError('No se pudo cargar la informacion');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get student details
      const studentResponse = await apiService.getStudent(params.studentId, accessToken);
      if (!studentResponse.success || !studentResponse.data) {
        setError('No se pudo cargar el estudiante');
        setLoading(false);
        return;
      }
      setStudent(studentResponse.data);

      // Get school's cafeteria and packages
      // First, we need to get the cafeteria ID from the school
      // For now, we'll create some default packages if none exist
      const schoolId = studentResponse.data.school.id;

      // Try to get cafeteria for this school
      const cafeteriaResponse = await apiService.getRechargePackages(schoolId, accessToken);

      if (cafeteriaResponse.success && cafeteriaResponse.data?.packages) {
        setPackages(cafeteriaResponse.data.packages);
      } else {
        // Use default suggested amounts if no packages
        setPackages([]);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const getAmount = (): number => {
    if (useCustomAmount) {
      const amount = parseInt(customAmount.replace(/\D/g, ''), 10);
      return isNaN(amount) ? 0 : amount;
    }
    return selectedPackage?.price || 0;
  };

  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleAmountChange = (text: string) => {
    // Remove non-numeric characters
    const numericValue = text.replace(/\D/g, '');
    setCustomAmount(numericValue);
    setUseCustomAmount(true);
    setSelectedPackage(null);
  };

  const handlePackageSelect = (pkg: RechargePackage) => {
    setSelectedPackage(pkg);
    setUseCustomAmount(false);
    setCustomAmount('');
  };

  const handleQuickAmountSelect = (amount: number) => {
    setCustomAmount(amount.toString());
    setUseCustomAmount(true);
    setSelectedPackage(null);
  };

  const handlePayment = async () => {
    const amount = getAmount();

    if (amount < 1000) {
      Alert.alert('Monto invalido', 'El monto minimo de recarga es $1.000');
      return;
    }

    if (!student || !accessToken) {
      Alert.alert('Error', 'No se pudo procesar el pago');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const response = await apiService.initPayment({
        studentId: student.id,
        amount,
        packageId: selectedPackage?.id,
        paymentMethod,
      }, accessToken);

      if (response.success && response.data) {
        setNewBalance(response.data.wallet.newBalance);
        setSuccess(true);
      } else {
        Alert.alert('Error', response.message || 'No se pudo procesar el pago');
      }
    } catch (err) {
      console.error('Payment error:', err);
      Alert.alert('Error', 'Error al procesar el pago');
    } finally {
      setProcessing(false);
    }
  };

  const quickAmounts = [5000, 10000, 15000, 20000, 30000, 50000];

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Surface style={styles.successCard} elevation={2}>
            <View style={styles.successIconContainer}>
              <MaterialCommunityIcons name="check-circle" size={80} color={colors.success} />
            </View>
            <Text style={styles.successTitle}>Pago Exitoso!</Text>
            <Text style={styles.successText}>
              Tu recarga de {formatCLP(getAmount())} se ha procesado correctamente.
            </Text>

            <View style={styles.successDetails}>
              <View style={styles.successRow}>
                <Text style={styles.successLabel}>Estudiante:</Text>
                <Text style={styles.successValue}>
                  {student?.firstName} {student?.lastName}
                </Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successLabel}>Monto recargado:</Text>
                <Text style={[styles.successValue, styles.amountSuccess]}>
                  +{formatCLP(getAmount())}
                </Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successLabel}>Nuevo saldo:</Text>
                <Text style={[styles.successValue, styles.balanceValue]}>
                  {formatCLP(newBalance)}
                </Text>
              </View>
            </View>

            <Button
              mode="contained"
              onPress={() => router.replace('/(tabs)')}
              style={styles.successButton}
              icon="home"
            >
              Volver al inicio
            </Button>

            <Button
              mode="outlined"
              onPress={() => router.push('/(tabs)/history')}
              style={styles.historyButton}
              icon="history"
            >
              Ver historial
            </Button>
          </Surface>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recargar saldo</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {error ? (
          <Surface style={styles.errorCard} elevation={1}>
            <Text style={styles.errorText}>{error}</Text>
            <Button mode="outlined" onPress={loadData}>Reintentar</Button>
          </Surface>
        ) : (
          <>
            {/* Student Info */}
            {student && (
              <Surface style={styles.studentCard} elevation={1}>
                <View style={styles.studentInfo}>
                  <View style={styles.studentAvatar}>
                    <Text style={styles.studentAvatarText}>
                      {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.studentDetails}>
                    <Text style={styles.studentName}>
                      {student.firstName} {student.lastName}
                    </Text>
                    <Text style={styles.studentSchool}>{student.school.name}</Text>
                  </View>
                </View>
                {/* Show balance only for non tickets_only schools */}
                {student.school.businessModel !== 'tickets_only' && (
                  <View style={styles.currentBalance}>
                    <Text style={styles.currentBalanceLabel}>Saldo actual</Text>
                    <Text style={styles.currentBalanceValue}>{formatCLP(student.balance)}</Text>
                  </View>
                )}
                {/* Show tickets for tickets_only schools */}
                {student.school.businessModel === 'tickets_only' && student.tickets && student.tickets.length > 0 && (
                  <View style={styles.currentBalance}>
                    <Text style={styles.currentBalanceLabel}>Tickets actuales</Text>
                    {student.tickets.map((ticket, idx) => (
                      <Text key={idx} style={styles.currentBalanceValue}>{ticket.quantity}x {ticket.type}</Text>
                    ))}
                  </View>
                )}
              </Surface>
            )}

            {/* Quick Amount Selection - hide for tickets_only schools */}
            {student?.school.businessModel !== 'tickets_only' && (
              <Surface style={styles.section} elevation={1}>
                <Text style={styles.sectionTitle}>Selecciona un monto</Text>
                <View style={styles.quickAmountsGrid}>
                  {quickAmounts.map((amount) => (
                    <TouchableOpacity
                      key={amount}
                      style={[
                        styles.quickAmountButton,
                        useCustomAmount && customAmount === amount.toString() && styles.quickAmountSelected,
                      ]}
                      onPress={() => handleQuickAmountSelect(amount)}
                    >
                      <Text style={[
                        styles.quickAmountText,
                        useCustomAmount && customAmount === amount.toString() && styles.quickAmountTextSelected,
                      ]}>
                        {formatCLP(amount)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Surface>
            )}

            {/* Custom Amount - hide for tickets_only schools */}
            {student?.school.businessModel !== 'tickets_only' && (
              <Surface style={styles.section} elevation={1}>
                <Text style={styles.sectionTitle}>O ingresa otro monto</Text>
                <TextInput
                  mode="outlined"
                  label="Monto personalizado"
                  value={customAmount ? formatCLP(parseInt(customAmount, 10)) : ''}
                  onChangeText={handleAmountChange}
                  keyboardType="numeric"
                  left={<TextInput.Icon icon="currency-usd" />}
                  style={styles.customAmountInput}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                />
                <Text style={styles.minAmountHint}>Monto minimo: $1.000</Text>
              </Surface>
            )}

            {/* Packages Section (if available) */}
            {packages.length > 0 && (
              <Surface style={styles.section} elevation={1}>
                <Text style={styles.sectionTitle}>
                  {student?.school.businessModel === 'tickets_only' ? 'Paquetes de tickets' : 'Paquetes disponibles'}
                </Text>
                {packages.map((pkg) => (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[
                      styles.packageItem,
                      selectedPackage?.id === pkg.id && styles.packageSelected,
                    ]}
                    onPress={() => handlePackageSelect(pkg)}
                  >
                    <View style={styles.packageInfo}>
                      <Text style={styles.packageName}>{pkg.name}</Text>
                      {pkg.description && (
                        <Text style={styles.packageDescription}>{pkg.description}</Text>
                      )}
                      {pkg.type === 'ticket' && pkg.ticketCount && (
                        <Text style={styles.packageTickets}>
                          {pkg.ticketCount} tickets incluidos
                        </Text>
                      )}
                    </View>
                    <Text style={[
                      styles.packagePrice,
                      selectedPackage?.id === pkg.id && styles.packagePriceSelected,
                    ]}>
                      {formatCLP(pkg.price)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </Surface>
            )}

            {/* Payment Method */}
            <Surface style={styles.section} elevation={1}>
              <Text style={styles.sectionTitle}>Metodo de pago</Text>
              <RadioButton.Group
                onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                value={paymentMethod}
              >
                <TouchableOpacity
                  style={styles.paymentOption}
                  onPress={() => setPaymentMethod('credit_card')}
                >
                  <RadioButton value="credit_card" color={colors.primary} />
                  <MaterialCommunityIcons name="credit-card" size={24} color={colors.textSecondary} />
                  <Text style={styles.paymentOptionText}>Tarjeta de credito</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.paymentOption}
                  onPress={() => setPaymentMethod('debit_card')}
                >
                  <RadioButton value="debit_card" color={colors.primary} />
                  <MaterialCommunityIcons name="credit-card-outline" size={24} color={colors.textSecondary} />
                  <Text style={styles.paymentOptionText}>Tarjeta de debito</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.paymentOption}
                  onPress={() => setPaymentMethod('transfer')}
                >
                  <RadioButton value="transfer" color={colors.primary} />
                  <MaterialCommunityIcons name="bank-transfer" size={24} color={colors.textSecondary} />
                  <Text style={styles.paymentOptionText}>Transferencia bancaria</Text>
                </TouchableOpacity>
              </RadioButton.Group>
            </Surface>

            {/* Summary */}
            {getAmount() > 0 && (
              <Surface style={styles.summaryCard} elevation={2}>
                <Text style={styles.summaryTitle}>Resumen</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Monto a recargar:</Text>
                  <Text style={styles.summaryValue}>{formatCLP(getAmount())}</Text>
                </View>
                {student && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Nuevo saldo estimado:</Text>
                    <Text style={[styles.summaryValue, styles.newBalanceValue]}>
                      {formatCLP(student.balance + getAmount())}
                    </Text>
                  </View>
                )}
              </Surface>
            )}

            {/* Pay Button */}
            <Button
              mode="contained"
              onPress={handlePayment}
              style={styles.payButton}
              contentStyle={styles.payButtonContent}
              labelStyle={styles.payButtonLabel}
              loading={processing}
              disabled={processing || getAmount() < 1000}
              icon="credit-card-check"
            >
              {processing ? 'Procesando...' : `Pagar ${formatCLP(getAmount())}`}
            </Button>

            <Text style={styles.disclaimer}>
              Este es un ambiente de prueba. No se realizaran cargos reales.
            </Text>
          </>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  errorCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    gap: spacing.md,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
  },
  studentCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentAvatarText: {
    color: colors.textOnPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  studentDetails: {
    marginLeft: spacing.md,
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  studentSchool: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  currentBalance: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentBalanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  currentBalanceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  section: {
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
  quickAmountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickAmountButton: {
    width: '31%',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  quickAmountSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  quickAmountTextSelected: {
    color: colors.primary,
  },
  customAmountInput: {
    backgroundColor: colors.background,
  },
  minAmountHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  packageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  packageSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  packageDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  packageTickets: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  packagePriceSelected: {
    color: colors.primary,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  paymentOptionText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  summaryCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  newBalanceValue: {
    color: colors.success,
  },
  payButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  payButtonContent: {
    height: 56,
  },
  payButtonLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Success styles
  successCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.success,
    marginBottom: spacing.md,
  },
  successText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  successDetails: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  successLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  successValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  amountSuccess: {
    color: colors.success,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  successButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    width: '100%',
    marginBottom: spacing.md,
  },
  historyButton: {
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    width: '100%',
  },
});
