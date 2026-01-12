import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Image } from 'react-native';
import { Text, Surface, IconButton, FAB, Avatar, ActivityIndicator, Button } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { apiService, Student } from '../src/services/api';
import { colors, spacing, borderRadius } from '../src/constants/theme';

export default function StudentsScreen() {
  const router = useRouter();
  const { accessToken } = useAuthStore();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      if (!accessToken) {
        setError('No estas autenticado');
        return;
      }

      const response = await apiService.getStudents(accessToken);
      if (response.success && response.data) {
        setStudents(response.data);
      } else {
        setError(response.message || 'Error al cargar estudiantes');
      }
    } catch (err) {
      setError('Error de conexion');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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

  const handleRefresh = () => {
    loadStudents(true);
  };

  const handleAddStudent = () => {
    router.push('/add-student');
  };

  const handleEditStudent = (student: Student) => {
    router.push({
      pathname: '/edit-student',
      params: { studentId: student.id },
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => router.back()}
          />
          <Text style={styles.title}>Mis Estudiantes</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando estudiantes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => router.back()}
        />
        <Text style={styles.title}>Mis Estudiantes</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {error && (
          <Surface style={styles.errorCard} elevation={1}>
            <Text style={styles.errorText}>{error}</Text>
            <Button mode="text" onPress={() => loadStudents()}>
              Reintentar
            </Button>
          </Surface>
        )}

        {students.length === 0 && !error && (
          <Surface style={styles.emptyCard} elevation={1}>
            <Text style={styles.emptyTitle}>No tienes estudiantes</Text>
            <Text style={styles.emptyText}>
              Agrega a tus hijos para comenzar a gestionar sus almuerzos escolares.
            </Text>
            <Button
              mode="contained"
              onPress={handleAddStudent}
              style={styles.emptyButton}
              icon="plus"
            >
              Agregar Estudiante
            </Button>
          </Surface>
        )}

        {students.map((student) => (
          <Surface key={student.id} style={styles.studentCard} elevation={1}>
            <View style={styles.studentHeader}>
              <View style={styles.studentInfo}>
                {student.photoUrl ? (
                  <Image
                    source={{ uri: student.photoUrl }}
                    style={styles.studentPhoto}
                  />
                ) : (
                  <Avatar.Text
                    size={48}
                    label={getInitials(student.firstName, student.lastName)}
                    style={styles.avatar}
                    labelStyle={styles.avatarLabel}
                  />
                )}
                <View style={styles.studentDetails}>
                  <Text style={styles.studentName}>
                    {student.firstName} {student.lastName}
                  </Text>
                  <Text style={styles.studentRut}>{student.rut}</Text>
                  {student.grade && (
                    <Text style={styles.studentGrade}>
                      {student.grade}{student.section ? ` - ${student.section}` : ''}
                    </Text>
                  )}
                </View>
              </View>
              <IconButton
                icon="pencil"
                size={20}
                onPress={() => handleEditStudent(student)}
                style={styles.editButton}
              />
            </View>

            <View style={styles.studentMeta}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Colegio</Text>
                <Text style={styles.metaValue}>{student.school.name}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Saldo</Text>
                <Text style={[
                  styles.metaValue,
                  student.balance > 0 ? styles.positiveBalance : styles.zeroBalance
                ]}>
                  {formatCLP(student.balance)}
                </Text>
              </View>
              {student.dailyLimit > 0 && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Limite diario</Text>
                  <Text style={styles.metaValue}>{formatCLP(student.dailyLimit)}</Text>
                </View>
              )}
            </View>

            {student.tickets && student.tickets.length > 0 && (
              <View style={styles.ticketsContainer}>
                <Text style={styles.ticketsTitle}>Tickets disponibles</Text>
                <View style={styles.ticketsList}>
                  {student.tickets.map((ticket, index) => (
                    <View key={index} style={styles.ticketBadge}>
                      <Text style={styles.ticketText}>
                        {ticket.quantity}x {ticket.type}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Surface>
        ))}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddStudent}
        label="Agregar"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 48,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 14,
  },
  errorCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.errorLight,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginBottom: spacing.sm,
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
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: colors.primary,
  },
  studentCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.md,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  studentPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarLabel: {
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
  studentRut: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  studentGrade: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  editButton: {
    margin: -8,
  },
  studentMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.lg,
  },
  metaItem: {
    minWidth: 80,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  positiveBalance: {
    color: colors.success,
  },
  zeroBalance: {
    color: colors.textSecondary,
  },
  ticketsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  ticketsTitle: {
    fontSize: 12,
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
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.primary,
  },
});
