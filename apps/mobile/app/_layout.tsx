import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../src/constants/theme';
import { useAuthStore } from '../src/store/authStore';

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
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === 'register' || segments[0] === 'login';
    const isPublicRoute = segments[0] === 'forgot-password' || segments[0] === 'reset-password';
    const isRoot = segments.length === 0 || (segments.length === 1 && segments[0] === '');

    // Protected routes that require authentication
    const protectedRoutes = ['home', 'profile', 'edit-profile', 'students', 'add-student', 'edit-student', 'cafeteria', '(tabs)'];
    const isProtectedRoute = protectedRoutes.includes(segments[0] as string);
    const isInTabs = segments[0] === '(tabs)';

    if (isAuthenticated && (inAuthGroup || isRoot)) {
      // Redirect authenticated users to tabs (home)
      router.replace('/(tabs)');
    } else if (!isAuthenticated && (isProtectedRoute || isInTabs)) {
      // Redirect unauthenticated users to splash for protected routes
      router.replace('/');
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
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
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
