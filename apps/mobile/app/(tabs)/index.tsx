import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text, Button, Surface, Avatar, ActivityIndicator } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { apiService, Student } from '../../src/services/api';
import { colors, spacing, borderRadius } from '../../src/constants/theme';
import { NetworkError } from '../../src/components/NetworkError';

export default function HomeTab() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const loadStudents = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getStudents(accessToken);
      if (response.success && response.data) {
        setStudents(response.data);
        // Auto-select first student if none selected
        if (response.data.length > 0 && !selectedStudent) {
          setSelectedStudent(response.data[0]);
        }
        setError(null);
      } else if (!response.success) {
        // Check if it's a network error
        const errorMsg = response.message || 'Error al cargar datos';
        if (errorMsg.toLowerCase().includes('conexion') ||
            errorMsg.toLowerCase().includes('network') ||
            errorMsg.toLowerCase().includes('internet')) {
          setError(errorMsg);
        }
      }
    } catch (err) {
      console.error('Error loading students:', err);
      const errorMsg = err instanceof Error ? err.message : 'Error de conexion';
      if (errorMsg.toLowerCase().includes('conexion') ||
          errorMsg.toLowerCase().includes('network') ||
          errorMsg.toLowerCase().includes('internet') ||
          errorMsg.toLowerCase().includes('timeout')) {
        setError(errorMsg);
      } else {
        setError('Error de conexion. Verifica tu internet.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    await loadStudents();
    setRetrying(false);
  };

  useEffect(() => {
    loadStudents();
  }, [accessToken]);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadStudents();
    }, [accessToken])
  );

  const handleAddStudent = () => {
    router.push('/add-student');
  };

  const handleViewStudents = () => {
    router.push('/students');
  };

  const getInitials = () => {
    if (!user?.guardian) return '?';
    const first = user.guardian.firstName?.charAt(0) || '';
    const last = user.guardian.lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase();
  };

  const getStudentInitials = (student: Student) => {
    return `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase();
  };

  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const hasStudents = students.length > 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <NetworkError
          message={error}
          onRetry={handleRetry}
          retrying={retrying}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola,</Text>
            <Text style={styles.userName}>
              {user?.guardian?.firstName || 'Usuario'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
            <Avatar.Text
              size={48}
              label={getInitials()}
              style={styles.avatar}
              labelStyle={styles.avatarLabel}
            />
          </TouchableOpacity>
        </View>

        {hasStudents ? (
          <>
            {/* Student Selector - Horizontal scrollable */}
            <View style={styles.studentSelectorContainer}>
              <Text style={styles.sectionTitle}>Mis Hijos</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.studentSelectorContent}
              >
                {students.map((student) => (
                  <TouchableOpacity
                    key={student.id}
                    onPress={() => setSelectedStudent(student)}
                    style={[
                      styles.studentAvatarContainer,
                      selectedStudent?.id === student.id && styles.studentAvatarSelected,
                    ]}
                  >
                    {student.photoUrl ? (
                      <Image
                        source={{ uri: student.photoUrl }}
                        style={styles.studentAvatarImage}
                      />
                    ) : (
                      <Avatar.Text
                        size={56}
                        label={getStudentInitials(student)}
                        style={[
                          styles.studentAvatar,
                          selectedStudent?.id === student.id && styles.studentAvatarActiveStyle,
                        ]}
                        labelStyle={styles.studentAvatarLabel}
                      />
                    )}
                    <Text
                      style={[
                        styles.studentAvatarName,
                        selectedStudent?.id === student.id && styles.studentAvatarNameSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {student.firstName}
                    </Text>
                  </TouchableOpacity>
                ))}
                {/* Add Student Button */}
                <TouchableOpacity
                  onPress={handleAddStudent}
                  style={styles.addStudentAvatarContainer}
                >
                  <View style={styles.addStudentCircle}>
                    <Text style={styles.addStudentPlus}>+</Text>
                  </View>
                  <Text style={styles.addStudentText}>Agregar</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Selected Student Balance Card */}
            {selectedStudent && (
              <Surface style={styles.balanceCard} elevation={2}>
                <View style={styles.balanceHeader}>
                  <View>
                    <Text style={styles.balanceStudentName}>
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </Text>
                    <Text style={styles.balanceSchool}>{selectedStudent.school.name}</Text>
                  </View>
                </View>

                {/* Show balance only if not tickets_only mode */}
                {selectedStudent.school.businessModel !== 'tickets_only' && (
                  <View style={styles.balanceAmountContainer}>
                    <Text style={styles.balanceLabel}>Saldo disponible</Text>
                    <Text style={[
                      styles.balanceAmount,
                      selectedStudent.balance > 0 ? styles.positiveBalance : selectedStudent.balance < 0 ? styles.negativeBalance : styles.zeroBalance
                    ]}>
                      {formatCLP(selectedStudent.balance)}
                    </Text>
                  </View>
                )}

                {selectedStudent.dailyLimit > 0 && selectedStudent.school.businessModel !== 'tickets_only' && (
                  <View style={styles.limitContainer}>
                    <Text style={styles.limitLabel}>Limite diario:</Text>
                    <Text style={styles.limitValue}>{formatCLP(selectedStudent.dailyLimit)}</Text>
                  </View>
                )}

                {/* Show tickets if available or if tickets_only mode */}
                {((selectedStudent.tickets && selectedStudent.tickets.length > 0) || selectedStudent.school.businessModel === 'tickets_only') && (
                  <View style={styles.ticketsContainer}>
                    <Text style={styles.ticketsLabel}>
                      {selectedStudent.school.businessModel === 'tickets_only' ? 'Tickets:' : 'Tickets disponibles:'}
                    </Text>
                    <View style={styles.ticketsList}>
                      {selectedStudent.tickets && selectedStudent.tickets.length > 0 ? (
                        selectedStudent.tickets.map((ticket, index) => (
                          <View key={index} style={styles.ticketBadge}>
                            <Text style={styles.ticketText}>
                              {ticket.quantity}x {ticket.type}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.noTicketsText}>Sin tickets disponibles</Text>
                      )}
                    </View>
                  </View>
                )}

                <View style={styles.balanceActions}>
                  <Button
                    mode="contained"
                    onPress={() => router.push(`/recharge?studentId=${selectedStudent.id}`)}
                    style={styles.rechargeButton}
                    icon="cash-plus"
                  >
                    Recargar
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={handleViewStudents}
                    style={styles.detailsButton}
                    icon="eye"
                  >
                    Ver detalles
                  </Button>
                  {selectedStudent.school.businessModel !== 'tickets_only' && (
                    <>
                      <Button
                        mode="text"
                        onPress={() => router.push(`/wallet-history?studentId=${selectedStudent.id}`)}
                        style={styles.historyButton}
                        icon="history"
                      >
                        Ver historial
                      </Button>
                      <Button
                        mode="text"
                        onPress={() => router.push(`/spending-stats?studentId=${selectedStudent.id}`)}
                        style={styles.statsButton}
                        icon="chart-bar"
                      >
                        Ver estadisticas
                      </Button>
                    </>
                  )}
                </View>
              </Surface>
            )}

            {/* Quick Actions */}
            <Surface style={styles.quickActionsCard} elevation={1}>
              <Text style={styles.sectionTitle}>Acciones rapidas</Text>
              <View style={styles.quickActionsRow}>
                <TouchableOpacity style={styles.quickActionItem} onPress={handleViewStudents}>
                  <View style={styles.quickActionIcon}>
                    <Text style={styles.quickActionIconText}>👨‍👩‍👧‍👦</Text>
                  </View>
                  <Text style={styles.quickActionLabel}>Estudiantes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/(tabs)/history')}>
                  <View style={styles.quickActionIcon}>
                    <Text style={styles.quickActionIconText}>📜</Text>
                  </View>
                  <Text style={styles.quickActionLabel}>Historial</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/(tabs)/cafeteria')}>
                  <View style={styles.quickActionIcon}>
                    <Text style={styles.quickActionIconText}>🍽️</Text>
                  </View>
                  <Text style={styles.quickActionLabel}>Menu</Text>
                </TouchableOpacity>
              </View>
            </Surface>
          </>
        ) : (
          <>
            {/* Welcome Card - Only show when no students */}
            <Surface style={styles.welcomeCard} elevation={2}>
              <Text style={styles.welcomeTitle}>Bienvenido a Tap In Colegios</Text>
              <Text style={styles.welcomeText}>
                Tu registro fue exitoso. Ahora puedes agregar a tus hijos y comenzar a gestionar sus almuerzos escolares.
              </Text>
            </Surface>

            {/* User Info */}
            <Surface style={styles.infoCard} elevation={1}>
              <Text style={styles.infoTitle}>Informacion de la cuenta</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Correo:</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Rol:</Text>
                <Text style={styles.infoValue}>
                  {user?.role === 'guardian' ? 'Apoderado' : user?.role}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Relacion:</Text>
                <Text style={styles.infoValue}>
                  {user?.guardian?.relationship === 'father' ? 'Padre' :
                   user?.guardian?.relationship === 'mother' ? 'Madre' :
                   user?.guardian?.relationship === 'guardian' ? 'Apoderado/Tutor' :
                   user?.guardian?.relationship === 'other' ? 'Otro' :
                   user?.guardian?.relationship}
                </Text>
              </View>
            </Surface>

            {/* Placeholder for next steps */}
            <Surface style={styles.nextStepsCard} elevation={1}>
              <Text style={styles.nextStepsTitle}>Proximos pasos</Text>
              <Text style={styles.nextStepsText}>
                1. Agrega a tus hijos desde el menu de estudiantes
              </Text>
              <Text style={styles.nextStepsText}>
                2. Selecciona el colegio de cada estudiante
              </Text>
              <Text style={styles.nextStepsText}>
                3. Carga saldo o compra tickets de almuerzo
              </Text>
            </Surface>

            {/* View Students Button */}
            <Button
              mode="outlined"
              onPress={handleViewStudents}
              style={styles.viewStudentsButton}
              contentStyle={styles.viewStudentsButtonContent}
              labelStyle={styles.viewStudentsButtonLabel}
              icon="account-group"
            >
              Ver Mis Estudiantes
            </Button>

            {/* Add Student Button */}
            <Button
              mode="contained"
              onPress={handleAddStudent}
              style={styles.addStudentButton}
              contentStyle={styles.addStudentButtonContent}
              labelStyle={styles.addStudentButtonLabel}
              icon="plus"
            >
              Agregar Estudiante
            </Button>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  avatarLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  welcomeCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.lg,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  welcomeText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  infoCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  nextStepsCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.xl,
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  nextStepsText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  viewStudentsButton: {
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  viewStudentsButtonContent: {
    height: 52,
  },
  viewStudentsButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  addStudentButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  addStudentButtonContent: {
    height: 52,
  },
  addStudentButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
  // Student Selector Styles
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  studentSelectorContainer: {
    marginBottom: spacing.lg,
  },
  studentSelectorContent: {
    paddingRight: spacing.lg,
    gap: spacing.md,
  },
  studentAvatarContainer: {
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    minWidth: 72,
  },
  studentAvatarSelected: {
    backgroundColor: colors.primaryLight,
  },
  studentAvatar: {
    backgroundColor: colors.textSecondary,
  },
  studentAvatarActiveStyle: {
    backgroundColor: colors.primary,
  },
  studentAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  studentAvatarLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  studentAvatarName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    maxWidth: 64,
  },
  studentAvatarNameSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  addStudentAvatarContainer: {
    alignItems: 'center',
    padding: spacing.sm,
    minWidth: 72,
  },
  addStudentCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
  },
  addStudentPlus: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '600',
  },
  addStudentText: {
    fontSize: 12,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  // Balance Card Styles
  balanceCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  balanceStudentName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  balanceSchool: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  balanceAmountContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
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
  zeroBalance: {
    color: colors.textSecondary,
  },
  negativeBalance: {
    color: colors.error,
  },
  limitContainer: {
    color: colors.textSecondary,
  },
  limitContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  limitLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  limitValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  ticketsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  ticketsLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  ticketsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ticketBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  ticketText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  noTicketsText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  balanceActions: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  rechargeButton: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  detailsButton: {
    flex: 1,
    borderColor: colors.primary,
  },
  historyButton: {
    marginTop: spacing.sm,
  },
  statsButton: {
    marginTop: spacing.xs,
  },
  // Quick Actions Styles
  quickActionsCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionItem: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickActionIconText: {
    fontSize: 24,
  },
  quickActionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
