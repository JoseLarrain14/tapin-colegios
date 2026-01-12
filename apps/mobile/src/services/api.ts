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

export interface School {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  region?: string;
  logoUrl?: string;
}
export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  rut: string;
  grade?: string;
  section?: string;
  photoUrl?: string;
  dailyLimit: number;
  school: {
    id: string;
    name: string;
    code: string;
  };
  balance: number;
  tickets?: Array<{
    type: string;
    quantity: number;
    expiresAt?: string;
  }>;
  isPrimary?: boolean;
}

export interface CreateStudentData {
  firstName: string;
  lastName: string;
  rut: string;
  schoolId: string;
  grade?: string;
  section?: string;
  photoUrl?: string;
  dailyLimit?: number;
}

export interface UpdateStudentData {
  firstName?: string;
  lastName?: string;
  grade?: string;
  section?: string;
  photoUrl?: string;
  dailyLimit?: number;
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

  // School endpoints
  async searchSchools(query: string): Promise<ApiResponse<School[]>> {
    try {
      const response = await this.client.get<ApiResponse<School[]>>('/schools/search', {
        params: { q: query },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al buscar colegios' };
    }
  }

  async getSchoolByCode(code: string): Promise<ApiResponse<School>> {
    try {
      const response = await this.client.get<ApiResponse<School>>(`/schools/${code}`);
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al obtener colegio' };
    }
  }

  async getAllSchools(): Promise<ApiResponse<School[]>> {
    try {
      const response = await this.client.get<ApiResponse<School[]>>('/schools');
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al listar colegios' };
    }
  }


// Guardian endpoints - added to existing ApiService class

  // Guardian endpoints
  async updatePreferredSchool(schoolId: string, accessToken: string): Promise<ApiResponse<{ preferredSchool: School }>> {
    try {
      const response = await this.client.put<ApiResponse<{ preferredSchool: School }>>(
        '/guardians/preferred-school',
        { schoolId },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al actualizar colegio preferido' };
    }
  }

  async getGuardianProfile(accessToken: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get<ApiResponse<any>>('/guardians/profile', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al obtener perfil' };
    }
  }

  // Password reset endpoints
  async forgotPassword(email: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.client.post<ApiResponse<void>>('/auth/forgot-password', {
        email,
      });
      return response.data;
    } catch (error) {
      // Always return success for security (don't reveal if email exists)
      return { success: true, message: 'Si el correo existe, recibiras un enlace para restablecer tu contrasena' };
    }
  }

  async verifyResetToken(token: string): Promise<ApiResponse<{ valid: boolean }>> {
    try {
      const response = await this.client.get<ApiResponse<{ valid: boolean }>>('/auth/verify-reset-token', {
        params: { token },
      });
      return response.data;
    } catch (error) {
      return { success: false, message: 'Token invalido o expirado', data: { valid: false } };
    }
  }


  // Student endpoints
  async createStudent(data: CreateStudentData, accessToken: string): Promise<ApiResponse<Student>> {
    try {
      const response = await this.client.post<ApiResponse<Student>>('/students', data, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al crear estudiante' };
    }
  }

  async getStudents(accessToken: string): Promise<ApiResponse<Student[]>> {
    try {
      const response = await this.client.get<ApiResponse<Student[]>>('/students', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al listar estudiantes' };
    }
  }

  async getStudent(studentId: string, accessToken: string): Promise<ApiResponse<Student>> {
    try {
      const response = await this.client.get<ApiResponse<Student>>(`/students/${studentId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al obtener estudiante' };
    }
  }

  async updateStudent(studentId: string, data: UpdateStudentData, accessToken: string): Promise<ApiResponse<Student>> {
    try {
      const response = await this.client.put<ApiResponse<Student>>(`/students/${studentId}`, data, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al actualizar estudiante' };
    }
  }

  async deleteStudent(studentId: string, accessToken: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.client.delete<ApiResponse<void>>(`/students/${studentId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al eliminar estudiante' };
    }
  }

  async updateStudentLimit(studentId: string, dailyLimit: number, accessToken: string): Promise<ApiResponse<{ dailyLimit: number }>> {
    try {
      const response = await this.client.put<ApiResponse<{ dailyLimit: number }>>(`/students/${studentId}/limit`, { dailyLimit }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al actualizar limite' };
    }
  }

  async resetPassword(token: string, password: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.client.post<ApiResponse<void>>('/auth/reset-password', {
        token,
        password,
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al restablecer contrasena' };
    }
  }
}

export const apiService = new ApiService();
