import { useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { colors, spacing, borderRadius, typography } from '../src/constants/theme';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    // Check if user is already authenticated
    checkAuth().then((authenticated) => {
      if (authenticated) {
        router.replace('/home');
      }
    });
  }, []);

  const handleRegister = () => {
    router.push('/register');
  };

  const handleSignIn = () => {
    router.push('/login');
  };

  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryDark]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Logo Area */}
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>TAP IN</Text>
              <Text style={styles.logoSubtext}>COLEGIOS</Text>
            </View>
          </View>

          {/* Tagline */}
          <View style={styles.taglineContainer}>
            <Text style={styles.tagline}>
              Gestiona el almuerzo de tus hijos de manera simple y segura
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleRegister}
              style={styles.registerButton}
              labelStyle={styles.registerButtonLabel}
              contentStyle={styles.buttonContent}
            >
              Registrarse
            </Button>

            <Button
              mode="outlined"
              onPress={handleSignIn}
              style={styles.signInButton}
              labelStyle={styles.signInButtonLabel}
              contentStyle={styles.buttonContent}
            >
              Iniciar Sesion
            </Button>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Al continuar, aceptas nuestros Terminos y Condiciones
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 180,
    height: 180,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textOnPrimary,
    letterSpacing: 2,
  },
  logoSubtext: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textOnPrimary,
    opacity: 0.9,
    marginTop: 4,
  },
  taglineContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
  },
  tagline: {
    fontSize: 18,
    textAlign: 'center',
    color: colors.textOnPrimary,
    lineHeight: 26,
  },
  buttonContainer: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  registerButton: {
    backgroundColor: colors.textOnPrimary,
    borderRadius: borderRadius.lg,
  },
  registerButtonLabel: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  signInButton: {
    borderColor: colors.textOnPrimary,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
  },
  signInButtonLabel: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  footer: {
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: colors.textOnPrimary,
    opacity: 0.8,
    textAlign: 'center',
  },
});
