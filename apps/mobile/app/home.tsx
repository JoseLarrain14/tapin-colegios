import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Surface, Avatar, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { colors, spacing, borderRadius } from '../src/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const handleAddStudent = () => {
    router.push('/add-student');
  };

  const getInitials = () => {
    if (!user?.guardian) return '?';
    const first = user.guardian.firstName?.charAt(0) || '';
    const last = user.guardian.lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola,</Text>
            <Text style={styles.userName}>
              {user?.guardian?.firstName || 'Usuario'}
            </Text>
          </View>
          <Avatar.Text
            size={48}
            label={getInitials()}
            style={styles.avatar}
            labelStyle={styles.avatarLabel}
          />
        </View>

        {/* Welcome Card */}
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

        {/* Logout Button */}
        <Button
          mode="outlined"
          onPress={handleLogout}
          style={styles.logoutButton}
          labelStyle={styles.logoutButtonLabel}
        >
          Cerrar Sesion
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
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
  logoutButton: {
    borderColor: colors.error,
    borderRadius: borderRadius.lg,
  },
  logoutButtonLabel: {
    color: colors.error,
  },
});
