import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'

// API base URL - defaults to localhost for development
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

/**
 * Axios instance configured for the Tap In API
 * - Automatically adds JWT token to requests
 * - Handles 401 errors (logout on unauthorized)
 * - Configured with proper headers
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 second timeout
})

// Request interceptor - Add JWT token to all requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Handle common errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized - Clear auth and redirect to login
    if (error.response?.status === 401) {
      const { logout } = useAuthStore.getState()
      logout()

      // Only redirect if we're in the browser
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message)
    }

    return Promise.reject(error)
  }
)

/**
 * API Client - Typed API methods
 */
export const apiClient = {
  // Auth endpoints
  auth: {
    login: (email: string, password: string) =>
      api.post('/auth/login', { email, password }),

    me: () => api.get('/auth/me'),

    logout: () => api.post('/auth/logout'),
  },

  // Schools endpoints
  schools: {
    list: (params?: { page?: number; limit?: number; search?: string }) =>
      api.get('/schools', { params }),

    getById: (id: string) => api.get(`/schools/${id}`),

    create: (data: any) => api.post('/schools', data),

    update: (id: string, data: any) => api.patch(`/schools/${id}`, data),

    delete: (id: string) => api.delete(`/schools/${id}`),
  },

  // Users endpoints
  users: {
    list: (params?: { page?: number; limit?: number; role?: string }) =>
      api.get('/users', { params }),

    getById: (id: string) => api.get(`/users/${id}`),

    create: (data: any) => api.post('/users', data),

    update: (id: string, data: any) => api.patch(`/users/${id}`, data),

    delete: (id: string) => api.delete(`/users/${id}`),
  },

  // Transactions endpoints
  transactions: {
    list: (params?: {
      page?: number
      limit?: number
      schoolId?: string
      userId?: string
      startDate?: string
      endDate?: string
    }) => api.get('/transactions', { params }),

    getById: (id: string) => api.get(`/transactions/${id}`),
  },

  // Menu items endpoints
  menu: {
    list: (cafeteriaId: string) =>
      api.get(`/menu/${cafeteriaId}`),

    getById: (cafeteriaId: string, itemId: string) =>
      api.get(`/menu/${cafeteriaId}`).then(res => {
        // API returns { success, data: { cafeteria, items, totalItems } }
        const items = Array.isArray(res.data?.data?.items) ? res.data.data.items : []
        return { data: items.find((item: { id: string }) => item.id === itemId) }
      }),

    create: (cafeteriaId: string, data: any) =>
      api.post(`/menu/${cafeteriaId}`, data),

    update: (cafeteriaId: string, itemId: string, data: any) =>
      api.put(`/menu/${cafeteriaId}/${itemId}`, data),

    delete: (cafeteriaId: string, itemId: string) =>
      api.delete(`/menu/${cafeteriaId}/${itemId}`),
  },

  // Students endpoints (guardian access)
  students: {
    list: () => api.get('/students'),

    getById: (id: string) => api.get(`/students/${id}`),
  },

  // Admin endpoints
  admin: {
    config: () => api.get('/admin/config'),

    students: {
      list: (params?: { page?: number; limit?: number; search?: string }) =>
        api.get('/admin/students', { params }),

      create: (data: { rut: string; firstName: string; lastName: string; grade?: string; section?: string }) =>
        api.post('/admin/students', data),
    },
  },

  // Legacy alias for adminStudents
  adminStudents: {
    list: (params?: { page?: number; limit?: number; search?: string }) =>
      api.get('/admin/students', { params }),

    create: (data: { rut: string; firstName: string; lastName: string; grade?: string; section?: string }) =>
      api.post('/admin/students', data),

    import: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.post('/admin/students/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    },
  },

  // Admin transactions endpoints
  adminTransactions: {
    list: (params?: {
      page?: number
      limit?: number
      dateFrom?: string
      dateTo?: string
      type?: string
      search?: string
    }) => api.get('/admin/transactions', { params }),

    stats: (params?: { dateFrom?: string; dateTo?: string }) =>
      api.get('/admin/transactions/stats', { params }),

    export: (params?: {
      dateFrom?: string
      dateTo?: string
      type?: string
      search?: string
    }) => api.get('/admin/transactions/export', { params, responseType: 'blob' }),
  },

  // Stats endpoints
  stats: {
    dashboard: () => api.get('/stats/dashboard'),
  },

  // Casino/POS endpoints
  casino: {
    consume: (data: { studentId: string; ticketType?: string; quantity?: number }) =>
      api.post('/casino/consume', data),

    consumptions: () =>
      api.get('/casino/consumptions'),
  },

  // Recharge packages endpoints
  packages: {
    list: (cafeteriaId: string) =>
      api.get(`/payments/packages/${cafeteriaId}`),

    getById: (cafeteriaId: string, packageId: string) =>
      api.get(`/payments/packages/${cafeteriaId}/${packageId}`),

    create: (cafeteriaId: string, data: any) =>
      api.post(`/payments/packages/${cafeteriaId}`, data),

    update: (cafeteriaId: string, packageId: string, data: any) =>
      api.put(`/payments/packages/${cafeteriaId}/${packageId}`, data),

    delete: (cafeteriaId: string, packageId: string) =>
      api.delete(`/payments/packages/${cafeteriaId}/${packageId}`),
  },

  // Menu templates endpoints
  menuTemplates: {
    list: (cafeteriaId: string) =>
      api.get(`/menu-templates/${cafeteriaId}`),

    getById: (cafeteriaId: string, templateId: string) =>
      api.get(`/menu-templates/${cafeteriaId}/${templateId}`),

    create: (cafeteriaId: string, data: { name: string; description?: string; color?: string; active?: boolean; menuItemIds?: string[] }) =>
      api.post(`/menu-templates/${cafeteriaId}`, data),

    update: (cafeteriaId: string, templateId: string, data: { name?: string; description?: string | null; color?: string | null; active?: boolean }) =>
      api.put(`/menu-templates/${cafeteriaId}/${templateId}`, data),

    delete: (cafeteriaId: string, templateId: string) =>
      api.delete(`/menu-templates/${cafeteriaId}/${templateId}`),

    addItem: (cafeteriaId: string, templateId: string, menuItemId: string, sortOrder?: number) =>
      api.post(`/menu-templates/${cafeteriaId}/${templateId}/items`, { menuItemId, sortOrder }),

    removeItem: (cafeteriaId: string, templateId: string, itemId: string) =>
      api.delete(`/menu-templates/${cafeteriaId}/${templateId}/items/${itemId}`),
  },

  // Menu planning endpoints
  menuPlanning: {
    getWeeklyPattern: (cafeteriaId: string) =>
      api.get(`/menu-planning/${cafeteriaId}/weekly-pattern`),

    updatePatternDay: (cafeteriaId: string, dayOfWeek: number, menuItemIds: string[]) =>
      api.put(`/menu-planning/${cafeteriaId}/weekly-pattern/day/${dayOfWeek}`, { menuItemIds }),

    getCalendar: (cafeteriaId: string, from: string, to: string) =>
      api.get(`/menu-planning/${cafeteriaId}/calendar`, { params: { from, to } }),

    getDateMenu: (cafeteriaId: string, date: string) =>
      api.get(`/menu-planning/${cafeteriaId}/date/${date}`),

    setDateMenu: (cafeteriaId: string, date: string, menuItemIds: string[], note?: string) =>
      api.put(`/menu-planning/${cafeteriaId}/date/${date}`, { menuItemIds, note }),

    clearDateMenu: (cafeteriaId: string, date: string) =>
      api.delete(`/menu-planning/${cafeteriaId}/date/${date}`),

    resolveMenu: (cafeteriaId: string, date: string) =>
      api.get(`/menu-planning/${cafeteriaId}/resolve/${date}`),
  },
}

export default api
