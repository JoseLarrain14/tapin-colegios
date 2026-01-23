import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useFonts } from 'expo-font';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../src/constants/theme';
import { useAuthStore } from '../src/store/authStore';

// Load icon fonts for web (only runs on client, not during SSR)
function loadWebIconFonts() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  // Check if already loaded
  if (document.getElementById('mdi-font-css')) return;

  // Load Material Design Icons CSS from CDN
  const link = document.createElement('link');
  link.id = 'mdi-font-css';
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css';
  document.head.appendChild(link);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Custom theme for React Native Paper
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primaryLight,
    secondary: colors.textSecondary,
    background: colors.background,
    surface: colors.surface,
    error: colors.error,
  },
};

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const { checkAuth, isAuthenticated } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      await checkAuth();
      setIsInitialized(true);
    };
    initAuth();
  }, []);

  // Handle routing based on auth state
  useEffect(() => {
    console.log('[AUTH] useEffect triggered:', { isInitialized, isAuthenticated, segments });

    if (!isInitialized) {
      console.log('[AUTH] Not initialized yet, skipping');
      return;
    }

    const inAuthGroup = segments[0] === 'register' || segments[0] === 'login';
    const isPublicRoute = segments[0] === 'forgot-password' || segments[0] === 'reset-password';
    const isRoot = segments.length === 0;

    // Protected routes that require authentication
    const protectedRoutes = ['profile', 'edit-profile', 'students', 'add-student', 'edit-student', 'cafeteria', '(tabs)'];
    const isProtectedRoute = protectedRoutes.includes(segments[0] as string);
    const isInTabs = segments[0] === '(tabs)';

    console.log('[AUTH] Route check:', { isInTabs, isProtectedRoute, isRoot, segment0: segments[0] });

    if (isAuthenticated && (inAuthGroup || isRoot)) {
      // Redirect authenticated users to tabs (home)
      console.log('[AUTH] Redirecting to tabs (authenticated user on auth page)');
      router.replace('/(tabs)');
    } else if (!isAuthenticated && (isProtectedRoute || isInTabs)) {
      // Redirect unauthenticated users to splash for protected routes
      console.log('[AUTH] Redirecting to splash (unauthenticated on protected route)');
      router.replace('/');
    } else {
      console.log('[AUTH] No redirect needed');
    }
  }, [isAuthenticated, segments, isInitialized]);

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...MaterialCommunityIcons.font,
  });

  // Load icon fonts for web on client mount
  useEffect(() => {
    loadWebIconFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider
        theme={theme}
        settings={{
          icon: props => <MaterialCommunityIcons {...props} />,
        }}
      >
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <AuthProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
          </AuthProvider>
        </SafeAreaProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
