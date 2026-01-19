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
    businessModel?: 'tickets_only' | 'balance_only' | 'mixed';
    allowNegativeBalance?: boolean;
  };
  balance: number;
  tickets?: Array<{
    type: string;
    quantity: number;
    expiresAt?: string;
  }>;
  isPrimary?: boolean;
  updatedAt?: string; // Used for optimistic concurrency control
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
  updatedAt?: string; // For optimistic concurrency control
}

export interface RechargePackage {
  id: string;
  name: string;
  description?: string;
  price: number;
  type: 'ticket' | 'balance';
  ticketCount?: number;
  ticketType?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  amount: number;
  gateway: string;
  gatewayTxId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  student?: { id: string; firstName: string; lastName: string };
  package?: { id: string; name: string; type: string; price?: number };
  createdAt: string;
  completedAt?: string;
}

export interface PaymentResult {
  payment: {
    id: string;
    amount: number;
    status: string;
    gateway: string;
    gatewayTxId: string;
    createdAt: string;
    completedAt: string;
  };
  wallet: {
    id: string;
    newBalance: number;
  };
  walletLog: {
    id: string;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string;
    createdAt: string;
  };
}

export interface WalletDetails {
  id: string;
  studentId: string;
  balance: number;
  calculatedBalance: number;
  balanceMatches: boolean;
  recentLogs: WalletLog[];
}

export interface WalletLog {
  id: string;
  type: 'deposit' | 'purchase' | 'refund' | 'adjustment';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  createdAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  imageUrl?: string;
  available: boolean;
  availableDays: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  student: { id: string; firstName: string; lastName: string };
  cafeteria: { id: string; name: string };
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  pickupDate: string;
  pickupTime?: string;
  items: CartItem[];
  total: number;
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderData {
  studentId: string;
  cafeteriaId: string;
  pickupDate: string;
  pickupTime?: string;
  items: CartItem[];
  comments?: string;
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
        // Handle server response errors
        if (error.response?.data?.message) {
          throw new Error(error.response.data.message);
        }

        // Handle network/connection errors
        if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
          throw new Error('Error de conexion. Verifica tu internet.');
        }

        // Handle timeout errors
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          throw new Error('La conexion tardo demasiado. Intenta de nuevo.');
        }

        // Handle connection refused (server down)
        if (error.code === 'ERR_CONNECTION_REFUSED' || error.message?.includes('ECONNREFUSED')) {
          throw new Error('No se pudo conectar al servidor. Intenta mas tarde.');
        }

        // Handle DNS resolution errors
        if (error.code === 'ENOTFOUND' || error.message?.includes('ENOTFOUND')) {
          throw new Error('No se pudo conectar. Verifica tu conexion a internet.');
        }

        // Generic error fallback
        throw new Error('Error de conexion. Por favor intenta de nuevo.');
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

  async updateGuardianProfile(
    data: { firstName?: string; lastName?: string; phone?: string; rut?: string },
    accessToken: string
  ): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.put<ApiResponse<any>>('/guardians/profile', data, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al actualizar perfil' };
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

  // Search for existing student by RUT (for linking)
  async searchStudentByRut(rut: string, accessToken: string): Promise<ApiResponse<{
    id: string;
    firstName: string;
    lastName: string;
    rut: string;
    grade?: string;
    section?: string;
    photoUrl?: string;
    school: { id: string; name: string; code: string };
  }>> {
    try {
      const response = await this.client.get(`/students/search-by-rut/${encodeURIComponent(rut)}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al buscar estudiante' };
    }
  }

  // Link an existing student to the guardian
  async linkStudent(studentId: string, accessToken: string): Promise<ApiResponse<{
    id: string;
    student: {
      id: string;
      firstName: string;
      lastName: string;
      rut: string;
      school: { id: string; name: string };
    };
    isPrimary: boolean;
  }>> {
    try {
      const response = await this.client.post('/students/link', { studentId }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al vincular estudiante' };
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

  async updateStudent(studentId: string, data: UpdateStudentData, accessToken: string): Promise<ApiResponse<Student> & { code?: string }> {
    try {
      const response = await this.client.put<ApiResponse<Student>>(`/students/${studentId}`, data, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      // Handle 409 Conflict (concurrent modification)
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const responseData = error.response.data as any;
        return {
          success: false,
          message: responseData.message || 'El registro ha sido modificado por otro usuario',
          code: responseData.code || 'CONCURRENT_MODIFICATION',
        };
      }
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

  async uploadImage(uri: string, accessToken: string): Promise<ApiResponse<{ filename: string; url: string }>> {
    try {
      const formData = new FormData();

      // Get filename and type from URI
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      // Append the file to FormData
      formData.append('file', {
        uri,
        name: filename,
        type,
      } as any);

      const response = await this.client.post<ApiResponse<{ filename: string; url: string }>>('/uploads/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al subir imagen' };
    }
  }

  // Recharge packages endpoints
  async getRechargePackages(cafeteriaId: string, accessToken: string): Promise<ApiResponse<{
    cafeteria: { id: string; name: string; schoolName: string };
    packages: RechargePackage[];
    totalPackages: number;
  }>> {
    try {
      const response = await this.client.get<ApiResponse<{
        cafeteria: { id: string; name: string; schoolName: string };
        packages: RechargePackage[];
        totalPackages: number;
      }>>(`/payments/packages/${cafeteriaId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al obtener paquetes de recarga' };
    }
  }

  // Get packages by school ID (for mobile app)
  async getRechargePackagesBySchool(schoolId: string, accessToken: string): Promise<ApiResponse<{
    cafeteria: { id: string; name: string; schoolName: string };
    packages: RechargePackage[];
    totalPackages: number;
  }>> {
    try {
      const response = await this.client.get<ApiResponse<{
        cafeteria: { id: string; name: string; schoolName: string };
        packages: RechargePackage[];
        totalPackages: number;
      }>>(`/payments/packages/school/${schoolId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al obtener paquetes de recarga' };
    }
  }

  // Payment endpoints
  async initPayment(data: {
    studentId: string;
    amount: number;
    packageId?: string;
    paymentMethod?: 'credit_card' | 'debit_card' | 'transfer';
    simulateFailure?: boolean; // For testing payment failures
  }, accessToken: string): Promise<ApiResponse<PaymentResult>> {
    try {
      const response = await this.client.post<ApiResponse<PaymentResult>>('/payments/init', data, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        // Return the API error response for failed payments
        return error.response.data as ApiResponse<PaymentResult>;
      }
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al procesar pago' };
    }
  }

  async getPayments(accessToken: string): Promise<ApiResponse<{
    payments: Payment[];
    totalPayments: number;
  }>> {
    try {
      const response = await this.client.get<ApiResponse<{
        payments: Payment[];
        totalPayments: number;
      }>>('/payments', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al obtener historial de pagos' };
    }
  }

  async getPayment(paymentId: string, accessToken: string): Promise<ApiResponse<Payment>> {
    try {
      const response = await this.client.get<ApiResponse<Payment>>(`/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al obtener pago' };
    }
  }

  // Wallet endpoints
  async getWallet(studentId: string, accessToken: string): Promise<ApiResponse<WalletDetails>> {
    try {
      const response = await this.client.get<ApiResponse<WalletDetails>>(`/wallets/${studentId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al obtener billetera' };
    }
  }

  async getWalletLogs(studentId: string, accessToken: string): Promise<ApiResponse<{
    logs: WalletLog[];
    totalCount: number;
    sumOfAmounts: number;
    currentBalance: number;
    balanceMatches: boolean;
  }>> {
    try {
      const response = await this.client.get<ApiResponse<{
        logs: WalletLog[];
        totalCount: number;
        sumOfAmounts: number;
        currentBalance: number;
        balanceMatches: boolean;
      }>>(`/wallets/${studentId}/logs`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al obtener historial de billetera' };
    }
  }



  // Stats interface
  async getWalletStats(studentId: string, period: 'daily' | 'weekly' | 'monthly', accessToken: string): Promise<ApiResponse<{
    period: string;
    startDate: string;
    endDate: string;
    summary: {
      totalSpent: number;
      transactionCount: number;
      averagePerTransaction: number;
      currentBalance: number;
    };
    chartData: Array<{
      label: string;
      spent: number;
      count: number;
    }>;
  }>> {
    try {
      const response = await this.client.get<ApiResponse<{
        period: string;
        startDate: string;
        endDate: string;
        summary: {
          totalSpent: number;
          transactionCount: number;
          averagePerTransaction: number;
          currentBalance: number;
        };
        chartData: Array<{
          label: string;
          spent: number;
          count: number;
        }>;
      }>>(`/wallets/${studentId}/stats?period=${period}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al obtener estadisticas' };
    }
  }

  // Menu endpoints
  async getMenu(cafeteriaId: string, accessToken: string): Promise<ApiResponse<{
    cafeteria: { id: string; name: string; schoolName: string };
    items: MenuItem[];
    totalItems: number;
  }>> {
    try {
      const response = await this.client.get<ApiResponse<{
        cafeteria: { id: string; name: string; schoolName: string };
        items: MenuItem[];
        totalItems: number;
      }>>(`/menu/${cafeteriaId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al obtener menu' };
    }
  }

  async getMenuByDay(
    cafeteriaId: string,
    dayOfWeek: number,
    accessToken: string,
    timeSlot?: 'breakfast' | 'lunch' | 'snack'
  ): Promise<ApiResponse<{
    cafeteria: { id: string; name: string; schoolName: string };
    dayOfWeek: number;
    dayName: string;
    timeSlot: string | null;
    timeSlotLabel: string | null;
    availableTimeSlots: Array<{ value: string; label: string }>;
    items: MenuItem[];
    totalItems: number;
  }>> {
    try {
      const url = timeSlot
        ? `/menu/${cafeteriaId}/day/${dayOfWeek}?timeSlot=${timeSlot}`
        : `/menu/${cafeteriaId}/day/${dayOfWeek}`;
      const response = await this.client.get<ApiResponse<{
        cafeteria: { id: string; name: string; schoolName: string };
        dayOfWeek: number;
        dayName: string;
        timeSlot: string | null;
        timeSlotLabel: string | null;
        availableTimeSlots: Array<{ value: string; label: string }>;
        items: MenuItem[];
        totalItems: number;
      }>>(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al obtener menu del dia' };
    }
  }

  // Order endpoints
  async getOrders(accessToken: string): Promise<ApiResponse<{
    orders: Order[];
    totalOrders: number;
  }>> {
    try {
      const response = await this.client.get<ApiResponse<{
        orders: Order[];
        totalOrders: number;
      }>>('/orders', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al obtener pedidos' };
    }
  }

  async getOrder(orderId: string, accessToken: string): Promise<ApiResponse<Order>> {
    try {
      const response = await this.client.get<ApiResponse<Order>>(`/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al obtener pedido' };
    }
  }

  async createOrder(data: CreateOrderData, accessToken: string): Promise<ApiResponse<Order>> {
    try {
      const response = await this.client.post<ApiResponse<Order>>('/orders', data, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al crear pedido' };
    }
  }

  async cancelOrder(orderId: string, accessToken: string): Promise<ApiResponse<Order>> {
    try {
      const response = await this.client.put<ApiResponse<Order>>(`/orders/${orderId}/cancel`, {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al cancelar pedido' };
    }
  }

  // Push notification endpoints
  async registerPushToken(token: string, platform: 'ios' | 'android' | 'web', accessToken: string): Promise<ApiResponse<{ tokenId: string }>> {
    try {
      const response = await this.client.post<ApiResponse<{ tokenId: string }>>('/notifications/token', {
        token,
        platform,
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al registrar token' };
    }
  }

  async deletePushToken(token: string, accessToken: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.client.delete<ApiResponse<void>>('/notifications/token', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        data: { token },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al eliminar token' };
    }
  }

  async getNotifications(accessToken: string): Promise<ApiResponse<Notification[]>> {
    try {
      const response = await this.client.get<ApiResponse<Notification[]>>('/notifications', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al obtener notificaciones' };
    }
  }

  async markNotificationRead(notificationId: string, accessToken: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.client.put<ApiResponse<void>>(`/notifications/${notificationId}/read`, {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al marcar notificacion' };
    }
  }

  async markAllNotificationsRead(accessToken: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.client.put<ApiResponse<void>>('/notifications/read-all', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al marcar notificaciones' };
    }
  }

  // Export transactions as CSV
  async exportTransactionsCsv(accessToken: string, studentId?: string): Promise<{ success: boolean; url?: string; message?: string }> {
    try {
      // For web, we need to construct the URL for download
      const baseUrl = this.client.defaults.baseURL || API_URL;
      let exportUrl = `${baseUrl}/orders/export/csv`;

      // Add studentId filter if provided
      if (studentId) {
        exportUrl += `?studentId=${studentId}`;
      }

      return {
        success: true,
        url: exportUrl,
      };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Error al exportar transacciones' };
    }
  }
}

// Notification interface
export interface Notification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export const apiService = new ApiService();
