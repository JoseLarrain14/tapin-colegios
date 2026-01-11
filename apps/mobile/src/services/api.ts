import axios, { AxiosInstance, AxiosError } from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: string;
    emailVerified: boolean;
    guardian?: {
      id: string;
      firstName: string;
      lastName: string;
      relationship: string;
      phone?: string;
      rut?: string;
    };
  };
  accessToken: string;
  refreshToken: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  relationship: 'father' | 'mother' | 'guardian' | 'other';
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse<unknown>>) => {
        if (error.response?.data?.message) {
          throw new Error(error.response.data.message);
        }
        if (error.message === 'Network Error') {
          throw new Error('Error de conexion. Verifica tu internet.');
        }
        throw error;
      }
    );
  }

  // Auth endpoints
  async register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await this.client.post<ApiResponse<AuthResponse>>('/auth/register', data);
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al registrar' };
    }
  }

  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await this.client.post<ApiResponse<AuthResponse>>('/auth/login', {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al iniciar sesion' };
    }
  }

  async logout(refreshToken: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.client.post<ApiResponse<void>>('/auth/logout', {
        refreshToken,
      });
      return response.data;
    } catch (error) {
      return { success: false, message: 'Error al cerrar sesion' };
    }
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<RefreshResponse>> {
    try {
      const response = await this.client.post<ApiResponse<RefreshResponse>>('/auth/refresh', {
        refreshToken,
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al refrescar token' };
    }
  }

  async getCurrentUser(accessToken: string): Promise<ApiResponse<AuthResponse['user']>> {
    try {
      const response = await this.client.get<ApiResponse<AuthResponse['user']>>('/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al obtener usuario' };
    }
  }

  // Helper method to set auth header for authenticated requests
  setAuthToken(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  clearAuthToken() {
    delete this.client.defaults.headers.common['Authorization'];
  }
}

export const apiService = new ApiService();
