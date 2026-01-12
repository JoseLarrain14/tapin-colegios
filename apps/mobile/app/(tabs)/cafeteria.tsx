import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Surface, Button, TextInput, Badge, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/authStore';
import { apiService, MenuItem, CartItem, Student } from '../../src/services/api';
import { NetworkError } from '../../src/components/NetworkError';

interface Cafeteria {
  id: string;
  name: string;
  schoolName: string;
}

export default function CafeteriaTab() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cafeteria, setCafeteria] = useState<Cafeteria | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay() || 7);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [comments, setComments] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const dayNames = ['', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
  const fullDayNames = ['', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

  // Get next weekday date for pickup
  const getPickupDate = useCallback((day: number): string => {
    const today = new Date();
    const currentDay = today.getDay() || 7;
    let daysToAdd = day - currentDay;
    if (daysToAdd <= 0) daysToAdd += 7;
    const pickupDate = new Date(today);
    pickupDate.setDate(today.getDate() + daysToAdd);
    return pickupDate.toISOString();
  }, []);

  // Load students and find cafeteria
  const loadData = useCallback(async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      setNetworkError(null);

      // Get students
      const studentsResponse = await apiService.getStudents(accessToken);
      if (!studentsResponse.success) {
        const errorMsg = studentsResponse.message || 'Error al cargar datos';
        if (errorMsg.toLowerCase().includes('conexion') ||
            errorMsg.toLowerCase().includes('network') ||
            errorMsg.toLowerCase().includes('internet') ||
            errorMsg.toLowerCase().includes('timeout') ||
            errorMsg.toLowerCase().includes('servidor')) {
          setNetworkError(errorMsg);
          return;
        }
      }

      if (studentsResponse.success && studentsResponse.data) {
        const studentList = Array.isArray(studentsResponse.data)
          ? studentsResponse.data
          : (studentsResponse.data as any).students || [];
        setStudents(studentList);

        if (studentList.length > 0) {
          setSelectedStudent(studentList[0]);

          // Get student details to find cafeteria
          const studentResponse = await apiService.getStudent(studentList[0].id, accessToken);
          if (studentResponse.success && studentResponse.data) {
            const student = studentResponse.data;
            const studentData = student as any;

            // Find cafeteria from student's school
            if (studentData.cafeteria) {
              setCafeteria({
                id: studentData.cafeteria.id,
                name: studentData.cafeteria.name,
                schoolName: student.school.name,
              });

              // Load menu for selected day
              await loadMenuForDay(studentData.cafeteria.id, selectedDay);
            }
          }
        }
      }
    } catch (error) {
      console.error('Load data error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error de conexion';
      if (errorMsg.toLowerCase().includes('conexion') ||
          errorMsg.toLowerCase().includes('network') ||
          errorMsg.toLowerCase().includes('internet') ||
          errorMsg.toLowerCase().includes('timeout') ||
          errorMsg.toLowerCase().includes('servidor')) {
        setNetworkError(errorMsg);
      } else {
        setNetworkError('Error de conexion. Verifica tu internet.');
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedDay]);

  const handleRetry = async () => {
    setRetrying(true);
    await loadData();
    setRetrying(false);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadMenuForDay = async (cafeteriaId: string, day: number) => {
    if (!accessToken) return;

    try {
      const response = await apiService.getMenuByDay(cafeteriaId, day, accessToken);
      if (response.success && response.data) {
        setMenuItems(response.data.items);
        if (!cafeteria) {
          setCafeteria({
            id: response.data.cafeteria.id,
            name: response.data.cafeteria.name,
            schoolName: response.data.cafeteria.schoolName,
          });
        }
      } else {
        setMenuItems([]);
      }
    } catch (error) {
      console.error('Load menu error:', error);
      setMenuItems([]);
    }
  };

  const handleDaySelect = async (day: number) => {
    setSelectedDay(day);
    if (cafeteria) {
      await loadMenuForDay(cafeteria.id, day);
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(ci => ci.menuItemId === item.id);
      if (existing) {
        return prev.map(ci =>
          ci.menuItemId === item.id
            ? { ...ci, quantity: ci.quantity + 1 }
            : ci
        );
      }
      return [...prev, {
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
      }];
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart(prev => {
      const existing = prev.find(ci => ci.menuItemId === menuItemId);
      if (existing && existing.quantity > 1) {
        return prev.map(ci =>
          ci.menuItemId === menuItemId
            ? { ...ci, quantity: ci.quantity - 1 }
            : ci
        );
      }
      return prev.filter(ci => ci.menuItemId !== menuItemId);
    });
  };

  const getCartQuantity = (menuItemId: string): number => {
    return cart.find(ci => ci.menuItemId === menuItemId)?.quantity || 0;
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleConfirmOrder = async () => {
    console.log('handleConfirmOrder - accessToken:', accessToken ? 'exists' : 'null');
    if (!accessToken || !selectedStudent || !cafeteria || cart.length === 0) {
      console.log('Missing data:', { accessToken: !!accessToken, selectedStudent: !!selectedStudent, cafeteria: !!cafeteria, cartLength: cart.length });
      if (!accessToken) {
        Alert.alert('Error', 'No hay sesion activa. Por favor, inicia sesion nuevamente.');
      }
      return;
    }

    // Check balance
    if (selectedStudent.balance < cartTotal) {
      Alert.alert(
        'Saldo insuficiente',
        `El saldo de ${selectedStudent.firstName} ($${selectedStudent.balance.toLocaleString('es-CL')}) no es suficiente para este pedido ($${cartTotal.toLocaleString('es-CL')}).`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setSubmitting(true);

      const response = await apiService.createOrder({
        studentId: selectedStudent.id,
        cafeteriaId: cafeteria.id,
        pickupDate: getPickupDate(selectedDay),
        pickupTime: '12:30',
        items: cart,
        comments: comments || undefined,
      }, accessToken);

      if (response.success && response.data) {
        setOrderId(response.data.id);
        setOrderSuccess(true);
        setCart([]);
        setComments('');
        setShowCart(false);
      } else {
        Alert.alert('Error', response.message || 'No se pudo crear el pedido');
      }
    } catch (error) {
      console.error('Create order error:', error);
      Alert.alert('Error', 'No se pudo crear el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  // Success screen
  if (orderSuccess) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>󰗠</Text>
          <Text style={styles.successTitle}>Pedido Creado!</Text>
          <Text style={styles.successSubtitle}>
            Tu pedido para {fullDayNames[selectedDay]} ha sido registrado exitosamente.
          </Text>

          <Surface style={styles.successCard} elevation={1}>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Estudiante:</Text>
              <Text style={styles.successValue}>{selectedStudent?.firstName} {selectedStudent?.lastName}</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Dia de retiro:</Text>
              <Text style={styles.successValue}>{fullDayNames[selectedDay]}</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Total:</Text>
              <Text style={[styles.successValue, { color: colors.primary }]}>${cartTotal.toLocaleString('es-CL')}</Text>
            </View>
          </Surface>

          <Button
            mode="contained"
            onPress={() => {
              setOrderSuccess(false);
              router.push('/history');
            }}
            style={styles.successButton}
            icon={() => <MaterialCommunityIcons name="clipboard-list" size={20} color={colors.textOnPrimary} />}
          >
            Ver mis pedidos
          </Button>

          <Button
            mode="outlined"
            onPress={() => setOrderSuccess(false)}
            style={styles.successButtonOutlined}
          >
            Hacer otro pedido
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Cart view
  if (showCart) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowCart(false)} style={styles.backButton}>
            <Text style={styles.backIcon}>󰁍</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Tu pedido</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Student info */}
          {selectedStudent && (
            <Surface style={styles.studentCard} elevation={1}>
              <Text style={styles.studentLabel}>Pedido para:</Text>
              <Text style={styles.studentName}>{selectedStudent.firstName} {selectedStudent.lastName}</Text>
              <Text style={styles.studentSchool}>{selectedStudent.school.name}</Text>
              <Text style={styles.pickupDay}>Retiro: {fullDayNames[selectedDay]} a las 12:30</Text>
            </Surface>
          )}

          {/* Cart items */}
          <Surface style={styles.cartCard} elevation={1}>
            <Text style={styles.cartTitle}>Items del pedido</Text>
            {cart.map(item => (
              <View key={item.menuItemId} style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemPrice}>${item.price.toLocaleString('es-CL')} x {item.quantity}</Text>
                </View>
                <View style={styles.cartItemActions}>
                  <TouchableOpacity onPress={() => removeFromCart(item.menuItemId)} style={styles.cartButton}>
                    <MaterialCommunityIcons name="minus" size={20} color={colors.error} />
                  </TouchableOpacity>
                  <Text style={styles.cartItemQuantity}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => addToCart({ id: item.menuItemId, name: item.name, price: item.price } as MenuItem)} style={styles.cartButton}>
                    <MaterialCommunityIcons name="plus" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={styles.cartTotal}>
              <Text style={styles.cartTotalLabel}>Total:</Text>
              <Text style={styles.cartTotalValue}>${cartTotal.toLocaleString('es-CL')}</Text>
            </View>
          </Surface>

          {/* Comments */}
          <Surface style={styles.commentsCard} elevation={1}>
            <Text style={styles.commentsLabel}>Comentarios (opcional)</Text>
            <TextInput
              mode="outlined"
              placeholder="Ej: Sin cebolla, extra salsa..."
              value={comments}
              onChangeText={setComments}
              multiline
              numberOfLines={3}
              style={styles.commentsInput}
            />
          </Surface>

          {/* Balance check */}
          {selectedStudent && (
            <Surface style={[styles.balanceCard, selectedStudent.balance < cartTotal && styles.balanceCardError]} elevation={1}>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Saldo disponible:</Text>
                <Text style={[styles.balanceValue, selectedStudent.balance < cartTotal && styles.balanceValueError]}>
                  ${selectedStudent.balance.toLocaleString('es-CL')}
                </Text>
              </View>
              {selectedStudent.balance < cartTotal && (
                <Text style={styles.balanceError}>
                  Saldo insuficiente. Recarga el saldo para completar el pedido.
                </Text>
              )}
            </Surface>
          )}

          {/* Confirm button */}
          <Button
            mode="contained"
            onPress={handleConfirmOrder}
            disabled={submitting || cart.length === 0 || !selectedStudent || (selectedStudent && selectedStudent.balance < cartTotal)}
            loading={submitting}
            style={styles.confirmButton}
            icon={() => <MaterialCommunityIcons name="check-circle" size={20} color={colors.textOnPrimary} />}
          >
            Confirmar pedido
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Network error state
  if (networkError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <NetworkError
          message={networkError}
          onRetry={handleRetry}
          retrying={retrying}
        />
      </SafeAreaView>
    );
  }

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando menu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Cafeteria</Text>
          <Text style={styles.subtitle}>
            {cafeteria ? cafeteria.name : 'Menu del casino escolar'}
          </Text>
        </View>

        {/* Student selector */}
        {students.length > 0 && (
          <Surface style={styles.studentSelectorCard} elevation={1}>
            <Text style={styles.selectorLabel}>Hacer pedido para:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.studentList}>
                {students.map(student => (
                  <TouchableOpacity
                    key={student.id}
                    onPress={() => setSelectedStudent(student)}
                    style={[
                      styles.studentChip,
                      selectedStudent?.id === student.id && styles.studentChipActive,
                    ]}
                  >
                    <Text style={[
                      styles.studentChipText,
                      selectedStudent?.id === student.id && styles.studentChipTextActive,
                    ]}>
                      {student.firstName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Surface>
        )}

        {/* Week selector */}
        <Surface style={styles.weekCard} elevation={1}>
          <Text style={styles.weekTitle}>Selecciona el dia de retiro</Text>
          <View style={styles.weekDays}>
            {[1, 2, 3, 4, 5].map((day) => (
              <TouchableOpacity
                key={day}
                onPress={() => handleDaySelect(day)}
                style={[
                  styles.dayButton,
                  selectedDay === day && styles.dayButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    selectedDay === day && styles.dayTextActive,
                  ]}
                >
                  {dayNames[day]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Surface>

        {/* Menu items */}
        {menuItems.length > 0 ? (
          <View style={styles.menuSection}>
            <Text style={styles.menuTitle}>Menu para {fullDayNames[selectedDay]}</Text>
            {menuItems.map(item => (
              <Surface key={item.id} style={styles.menuItemCard} elevation={1}>
                <View style={styles.menuItemContent}>
                  <View style={styles.menuItemInfo}>
                    <Text style={styles.menuItemName}>{item.name}</Text>
                    {item.description && (
                      <Text style={styles.menuItemDesc}>{item.description}</Text>
                    )}
                    <Text style={styles.menuItemPrice}>${item.price.toLocaleString('es-CL')}</Text>
                  </View>
                  <View style={styles.menuItemActions}>
                    {getCartQuantity(item.id) > 0 ? (
                      <View style={styles.quantityControl}>
                        <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.quantityButton}>
                          <MaterialCommunityIcons name="minus" size={18} color={colors.error} />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{getCartQuantity(item.id)}</Text>
                        <TouchableOpacity onPress={() => addToCart(item)} style={styles.quantityButton}>
                          <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => addToCart(item)} style={styles.addButton}>
                        <MaterialCommunityIcons name="plus" size={20} color={colors.textOnPrimary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Surface>
            ))}
          </View>
        ) : (
          <Surface style={styles.emptyMenuCard} elevation={1}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Sin menu disponible</Text>
            <Text style={styles.emptyText}>
              {cafeteria
                ? `No hay items de menu disponibles para ${fullDayNames[selectedDay]}.`
                : 'No se encontro una cafeteria para el colegio de tu hijo.'
              }
            </Text>
          </Surface>
        )}
      </ScrollView>

      {/* Floating cart button */}
      {cartCount > 0 && (
        <TouchableOpacity
          style={styles.floatingCart}
          onPress={() => setShowCart(true)}
        >
          <View style={styles.floatingCartContent}>
            <MaterialCommunityIcons name="cart" size={24} color={colors.textOnPrimary} />
            <Badge style={styles.cartBadge}>{cartCount}</Badge>
          </View>
          <Text style={styles.floatingCartText}>
            Ver pedido - ${cartTotal.toLocaleString('es-CL')}
          </Text>
        </TouchableOpacity>
      )}
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
    paddingBottom: 100,
  },
  header: {
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: spacing.md,
  },
  backIcon: {
    fontSize: 24,
    color: colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  studentSelectorCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  studentList: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  studentChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
  },
  studentChipActive: {
    backgroundColor: colors.primary,
  },
  studentChipText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  studentChipTextActive: {
    color: colors.textOnPrimary,
    fontWeight: '600',
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
  menuSection: {
    marginBottom: spacing.lg,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  menuItemCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
  },
  menuItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  menuItemDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  menuItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginTop: spacing.xs,
  },
  menuItemActions: {
    marginLeft: spacing.md,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginHorizontal: spacing.sm,
    minWidth: 20,
    textAlign: 'center',
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
  floatingCart: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingCartContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.error,
  },
  floatingCartText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  // Cart view styles
  studentCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
  },
  studentLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  studentSchool: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  pickupDay: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginTop: spacing.sm,
  },
  cartCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  cartItemPrice: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItemQuantity: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
  cartTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.primary,
  },
  cartTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cartTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  commentsCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
  },
  commentsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  commentsInput: {
    backgroundColor: colors.background,
  },
  balanceCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
  },
  balanceCardError: {
    borderWidth: 1,
    borderColor: colors.error,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
  },
  balanceValueError: {
    color: colors.error,
  },
  balanceError: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.sm,
  },
  confirmButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
  },
  // Success view styles
  successContainer: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 64,
    color: colors.success,
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  successCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    width: '100%',
    marginBottom: spacing.xl,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
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
  successButton: {
    width: '100%',
    marginBottom: spacing.md,
    backgroundColor: colors.primary,
  },
  successButtonOutlined: {
    width: '100%',
    borderColor: colors.primary,
  },
});
