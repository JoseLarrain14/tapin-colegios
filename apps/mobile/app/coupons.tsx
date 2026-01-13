import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius } from '../src/constants/theme';

export default function CouponsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Mis Cupones</Text>
        </View>

        {/* Coming Soon Card */}
        <Surface style={styles.comingSoonCard} elevation={2}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🎟️</Text>
          </View>
          <Text style={styles.comingSoonTitle}>Proximamente</Text>
          <Text style={styles.comingSoonText}>
            Estamos trabajando en un sistema de cupones y descuentos para que puedas ahorrar en tus compras.
          </Text>
          <Text style={styles.comingSoonSubtext}>
            Pronto podras canjear codigos promocionales y acceder a ofertas exclusivas.
          </Text>
        </Surface>

        {/* Features Preview */}
        <Surface style={styles.featuresCard} elevation={1}>
          <Text style={styles.featuresTitle}>Lo que viene</Text>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>💰</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureName}>Descuentos exclusivos</Text>
              <Text style={styles.featureDescription}>Ofertas especiales para usuarios frecuentes</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🎁</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureName}>Codigos promocionales</Text>
              <Text style={styles.featureDescription}>Canjea codigos para obtener beneficios</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>⭐</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureName}>Programa de fidelidad</Text>
              <Text style={styles.featureDescription}>Acumula puntos con cada compra</Text>
            </View>
          </View>
        </Surface>

        {/* Back Button */}
        <Button
          mode="outlined"
          onPress={() => router.back()}
          style={styles.backButton}
          icon="arrow-left"
        >
          Volver
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  comingSoonCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  icon: {
    fontSize: 40,
  },
  comingSoonTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.md,
  },
  comingSoonText: {
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  featuresCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  backButton: {
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
});
