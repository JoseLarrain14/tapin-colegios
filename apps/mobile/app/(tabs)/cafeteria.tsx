import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/authStore';
import { apiService, MenuItem, Student } from '../../src/services/api';
import { NetworkError } from '../../src/components/NetworkError';

interface Cafeteria {
  id: string;
  name: string;
  schoolName: string;
}

export default function CafeteriaTab() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [cafeteria, setCafeteria] = useState<Cafeteria | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay() || 7);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const dayNames = ['', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
  const fullDayNames = ['', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

  // Get the start and end dates for the current week view
  const getWeekDateRange = useCallback(() => {
    const today = new Date();
    const currentDay = today.getDay() || 7;

    // Calculate Monday of the current/offset week
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDay - 1) + (weekOffset * 7));

    // Calculate Friday
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    return { monday, friday };
  }, [weekOffset]);

  // Get date for a specific day in the current week view
  const getDayDate = useCallback((day: number): Date => {
    const { monday } = getWeekDateRange();
    const date = new Date(monday);
    date.setDate(monday.getDate() + (day - 1));
    return date;
  }, [getWeekDateRange]);

  // Format date for display
  const formatShortDate = (date: Date): string => {
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  };

  const handlePreviousWeek = () => {
    if (weekOffset > 0) {
      setWeekOffset(prev => prev - 1);
    }
  };

  const handleNextWeek = () => {
    if (weekOffset < 4) {
      setWeekOffset(prev => prev + 1);
    }
  };

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

  // Reload menu when week changes
  useEffect(() => {
    if (cafeteria) {
      loadMenuForDay(cafeteria.id, selectedDay);
    }
  }, [weekOffset, cafeteria?.id]);

  // Get full date string for a specific day (YYYY-MM-DD format)
  const getDateString = useCallback((day: number): string => {
    const date = getDayDate(day);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayNum = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayNum}`;
  }, [getDayDate]);

  const loadMenuForDay = async (cafeteriaId: string, day: number) => {
    if (!accessToken) return;

    try {
      // Use the menu-planning resolve endpoint (date-based, respects WeeklyPattern)
      const dateStr = getDateString(day);
      const response = await apiService.getMenuByDate(cafeteriaId, dateStr, accessToken);

      if (response.success && response.data) {
        // Safely access items array
        const items = Array.isArray(response.data.items) ? response.data.items : [];
        // Convert items to MenuItem format (even if empty)
        const menuItemsList: MenuItem[] = items.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          imageUrl: item.imageUrl,
          available: true,
          availableDays: [day],
        }));
        setMenuItems(menuItemsList);
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
          <Text style={styles.title}>Menu del Dia</Text>
          <Text style={styles.subtitle}>
            {cafeteria ? cafeteria.name : 'Menu del casino escolar'}
          </Text>
        </View>

        {/* Student selector */}
        {students.length > 0 && (
          <Surface style={styles.studentSelectorCard} elevation={1}>
            <Text style={styles.selectorLabel}>Viendo menu para:</Text>
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

        {/* Week selector with navigation */}
        <Surface style={styles.weekCard} elevation={1}>
          {/* Week navigation header */}
          <View style={styles.weekNavigation}>
            <TouchableOpacity
              onPress={handlePreviousWeek}
              style={[styles.weekNavButton, weekOffset === 0 && styles.weekNavButtonDisabled]}
              disabled={weekOffset === 0}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={28}
                color={weekOffset === 0 ? colors.textMuted : colors.primary}
              />
            </TouchableOpacity>

            <View style={styles.weekDateRange}>
              <Text style={styles.weekTitle}>
                {weekOffset === 0 ? 'Esta semana' : weekOffset === 1 ? 'Proxima semana' : `En ${weekOffset} semanas`}
              </Text>
              <Text style={styles.weekDates}>
                {formatShortDate(getWeekDateRange().monday)} - {formatShortDate(getWeekDateRange().friday)}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleNextWeek}
              style={[styles.weekNavButton, weekOffset >= 4 && styles.weekNavButtonDisabled]}
              disabled={weekOffset >= 4}
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={28}
                color={weekOffset >= 4 ? colors.textMuted : colors.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Day selector */}
          <Text style={styles.daySelectionLabel}>Selecciona el dia</Text>
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
                <Text
                  style={[
                    styles.dayDateText,
                    selectedDay === day && styles.dayDateTextActive,
                  ]}
                >
                  {getDayDate(day).getDate()}
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
                </View>
              </Surface>
            ))}
          </View>
        ) : (
          <Surface style={styles.emptyMenuCard} elevation={1}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No hay menu disponible</Text>
            <Text style={styles.emptyText}>
              {cafeteria
                ? `No hay items de menu disponibles para ${fullDayNames[selectedDay]}.`
                : 'No se encontro una cafeteria para el colegio de tu hijo.'
              }
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  weekNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  weekNavButtonDisabled: {
    opacity: 0.5,
  },
  weekDateRange: {
    flex: 1,
    alignItems: 'center',
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  weekDates: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  daySelectionLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayButton: {
    width: 52,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  dayButtonActive: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayTextActive: {
    color: colors.textOnPrimary,
  },
  dayDateText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  dayDateTextActive: {
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
