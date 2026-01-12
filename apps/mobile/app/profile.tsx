import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Surface, Avatar, Button, ActivityIndicator, Divider } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { apiService } from '../src/services/api';
import { colors, spacing, borderRadius } from '../src/constants/theme';

interface GuardianProfile {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  rut?: string;
  relationship: string;
  preferredSchool?: {
    id: string;
    name: string;
    code: string;
    city?: string;
    region?: string;
  };
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    school: {
      id: string;
      name: string;
      code: string;
    };
  }>;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, accessToken } = useAuthStore();
  const [profile, setProfile] = useState<GuardianProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async (showRefresh = false) => {
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

      const response = await apiService.getGuardianProfile(accessToken);
      if (response.success && response.data) {
        setProfile(response.data);
      } else {
        setError(response.message || 'Error al cargar perfil');
      }
    } catch (err) {
      setError('Error de conexion');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [accessToken])
  );

  const handleRefresh = () => {
    loadProfile(true);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const handleEditProfile = () => {
    router.push('/edit-profile');
  };

  const handleViewStudents = () => {
    router.push('/students');
  };

  const getInitials = () => {
    if (!profile) return '?';
    return `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();
  };

  const getRelationshipLabel = (relationship: string) => {
    switch (relationship) {
      case 'father':
        return 'Padre';
      case 'mother':
        return 'Madre';
      case 'guardian':
        return 'Apoderado/Tutor';
      case 'other':
        return 'Otro';
      default:
        return relationship;
    }
  };

  // Get unique schools from students
  const getAssociatedSchools = () => {
    if (!profile) return [];
    const schoolMap = new Map();
    profile.students.forEach((student) => {
      if (!schoolMap.has(student.school.id)) {
        schoolMap.set(student.school.id, student.school);
      }
    });
    return Array.from(schoolMap.values());
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Mi Perfil</Text>
        </View>

        {error && (
          <Surface style={styles.errorCard} elevation={1}>
            <Text style={styles.errorText}>{error}</Text>
            <Button mode="text" onPress={() => loadProfile()}>
              Reintentar
            </Button>
          </Surface>
        )}

        {profile && (
          <>
            {/* Profile Card */}
            <Surface style={styles.profileCard} elevation={2}>
              <View style={styles.avatarSection}>
                <Avatar.Text
                  size={80}
                  label={getInitials()}
                  style={styles.avatar}
                  labelStyle={styles.avatarLabel}
                />
                <View style={styles.nameSection}>
                  <Text style={styles.fullName}>
                    {profile.firstName} {profile.lastName}
                  </Text>
                  <Text style={styles.relationship}>
                    {getRelationshipLabel(profile.relationship)}
                  </Text>
                </View>
              </View>
            </Surface>

            {/* Contact Info */}
            <Surface style={styles.infoCard} elevation={1}>
              <Text style={styles.sectionTitle}>Informacion de Contacto</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Correo electronico</Text>
                <Text style={styles.infoValue}>{user?.email || '-'}</Text>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Telefono</Text>
                <Text style={styles.infoValue}>{profile.phone || 'No registrado'}</Text>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>RUT</Text>
                <Text style={styles.infoValue}>{profile.rut || 'No registrado'}</Text>
              </View>
            </Surface>

            {/* Associated Schools */}
            <Surface style={styles.infoCard} elevation={1}>
              <Text style={styles.sectionTitle}>Colegios Asociados</Text>

              {getAssociatedSchools().length > 0 ? (
                getAssociatedSchools().map((school, index) => (
                  <View key={school.id}>
                    {index > 0 && <Divider style={styles.divider} />}
                    <View style={styles.schoolRow}>
                      <View style={styles.schoolIcon}>
                        <Text style={styles.schoolIconText}>🏫</Text>
                      </View>
                      <View style={styles.schoolInfo}>
                        <Text style={styles.schoolName}>{school.name}</Text>
                        <Text style={styles.schoolCode}>Codigo: {school.code}</Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noSchoolsText}>
                  No hay colegios asociados. Agrega un estudiante para vincular un colegio.
                </Text>
              )}
            </Surface>

            {/* Students Summary */}
            <Surface style={styles.infoCard} elevation={1}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Mis Estudiantes</Text>
                <Button
                  mode="text"
                  onPress={handleViewStudents}
                  compact
                  labelStyle={styles.viewAllLabel}
                >
                  Ver todos
                </Button>
              </View>

              {profile.students.length > 0 ? (
                profile.students.slice(0, 3).map((student, index) => (
                  <View key={student.id}>
                    {index > 0 && <Divider style={styles.divider} />}
                    <View style={styles.studentRow}>
                      <Avatar.Text
                        size={40}
                        label={`${student.firstName.charAt(0)}${student.lastName.charAt(0)}`}
                        style={styles.studentAvatar}
                      />
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>
                          {student.firstName} {student.lastName}
                        </Text>
                        <Text style={styles.studentSchool}>{student.school.name}</Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noStudentsText}>
                  No tienes estudiantes registrados.
                </Text>
              )}

              {profile.students.length > 3 && (
                <Text style={styles.moreStudentsText}>
                  +{profile.students.length - 3} estudiante(s) mas
                </Text>
              )}
            </Surface>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              <Button
                mode="contained"
                onPress={handleEditProfile}
                style={styles.editButton}
                icon="pencil"
              >
                Editar Perfil
              </Button>

              <Button
                mode="outlined"
                onPress={handleViewStudents}
                style={styles.actionButton}
                icon="account-group"
              >
                Ver Estudiantes
              </Button>

              <Button
                mode="outlined"
                onPress={handleLogout}
                style={[styles.actionButton, styles.logoutButton]}
                labelStyle={styles.logoutLabel}
                icon="logout"
              >
                Cerrar Sesion
              </Button>
            </View>
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
    fontSize: 14,
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
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
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
  profileCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    marginBottom: spacing.lg,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: colors.card,
  },
  avatarLabel: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '700',
  },
  nameSection: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  fullName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  relationship: {
    fontSize: 14,
    color: colors.textOnPrimary,
    opacity: 0.9,
    marginTop: 2,
  },
  infoCard: {
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  viewAllLabel: {
    fontSize: 14,
    color: colors.primary,
  },
  infoRow: {
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  divider: {
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
  },
  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  schoolIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  schoolIconText: {
    fontSize: 20,
  },
  schoolInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  schoolName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  schoolCode: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  noSchoolsText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  studentAvatar: {
    backgroundColor: colors.primary,
  },
  studentInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  studentSchool: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  noStudentsText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  moreStudentsText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  actionsContainer: {
    gap: spacing.md,
  },
  editButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  actionButton: {
    borderRadius: borderRadius.lg,
    borderColor: colors.primary,
  },
  logoutButton: {
    borderColor: colors.error,
  },
  logoutLabel: {
    color: colors.error,
  },
});
