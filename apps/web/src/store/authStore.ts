import { create } from 'zustand';
import { getJSON, setJSON, removeItem } from '../lib/storage';
import { apiService } from '../lib/api';

interface Guardian {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string;
  phone?: string;
  rut?: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  guardian?: Guardian;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  checkAuth: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  relationship: 'father' | 'mother' | 'guardian' | 'other';
}

const TOKEN_KEY = 'auth_tokens';
const USER_KEY = 'auth_user';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken });
    // Store tokens in localStorage
    setJSON(TOKEN_KEY, { accessToken, refreshToken });
  },

  clearAuth: () => {
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null
    });
    removeItem(TOKEN_KEY);
    removeItem(USER_KEY);
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });

      // Get stored tokens
      const tokens = getJSON<{ accessToken: string; refreshToken: string }>(TOKEN_KEY);
      if (!tokens) {
        set({ isLoading: false });
        return false;
      }

      const { accessToken, refreshToken } = tokens;
      set({ accessToken, refreshToken });

      // Try to get current user
      const response = await apiService.getCurrentUser(accessToken);

      if (response.success && response.data) {
        set({
          user: response.data,
          isAuthenticated: true,
          isLoading: false
        });
        return true;
      } else {
        // Token might be expired, try to refresh
        const refreshed = await get().refreshAccessToken();
        set({ isLoading: false });
        return refreshed;
      }
    } catch {
      set({ isLoading: false });
      get().clearAuth();
      return false;
    }
  },

  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiService.login(email, password);

      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false
        });
        // Store tokens
        setJSON(TOKEN_KEY, { accessToken, refreshToken });
        setJSON(USER_KEY, user);
      } else {
        throw new Error(response.message || 'Error al iniciar sesion');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al iniciar sesion';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  register: async (data) => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiService.register(data);

      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false
        });
        // Store tokens
        setJSON(TOKEN_KEY, { accessToken, refreshToken });
        setJSON(USER_KEY, user);
      } else {
        throw new Error(response.message || 'Error al registrar');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al registrar';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      const { refreshToken } = get();

      if (refreshToken) {
        await apiService.logout(refreshToken);
      }
    } catch {
      // Ignore logout errors
    } finally {
      // Clear auth token from API client headers
      apiService.clearAuthToken();
      get().clearAuth();
    }
  },

  refreshAccessToken: async () => {
    try {
      const { refreshToken } = get();
      if (!refreshToken) return false;

      const response = await apiService.refreshToken(refreshToken);

      if (response.success && response.data) {
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        set({ accessToken, refreshToken: newRefreshToken });
        setJSON(TOKEN_KEY, {
          accessToken,
          refreshToken: newRefreshToken
        });

        // Get user data with new token
        const userResponse = await apiService.getCurrentUser(accessToken);
        if (userResponse.success && userResponse.data) {
          set({ user: userResponse.data, isAuthenticated: true });
        }

        return true;
      }
      return false;
    } catch {
      get().clearAuth();
      return false;
    }
  },
}));
