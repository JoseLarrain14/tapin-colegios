import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../constants/theme';

interface NetworkErrorProps {
  message?: string;
  onRetry: () => void;
  retrying?: boolean;
}

export function NetworkError({
  message = 'Error de conexion. Verifica tu internet e intenta nuevamente.',
  onRetry,
  retrying = false
}: NetworkErrorProps) {
  return (
    <View style={styles.container}>
      <Surface style={styles.card} elevation={2}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="wifi-off"
            size={64}
            color={colors.error}
          />
        </View>

        <Text style={styles.title}>Sin conexion</Text>

        <Text style={styles.message}>{message}</Text>

        <Button
          mode="contained"
          onPress={onRetry}
          style={styles.retryButton}
          loading={retrying}
          disabled={retrying}
          icon="refresh"
        >
          {retrying ? 'Reintentando...' : 'Reintentar'}
        </Button>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  card: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  iconContainer: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: 50,
    backgroundColor: colors.errorLight,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    minWidth: 160,
  },
});

export default NetworkError;
