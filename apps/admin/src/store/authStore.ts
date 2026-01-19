import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  name?: string
  role: 'ADMIN' | 'SCHOOL_ADMIN' | 'PARENT' | 'STUDENT' | 'school_admin' | 'guardian'
  schoolId?: string
  emailVerified?: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean

  // Actions
  setUser: (user: User) => void
  setToken: (token: string) => void
  login: (user: User, token: string) => void
  logout: () => void
}

/**
 * Auth Store - Zustand store for authentication state
 *
 * Features:
 * - Persists to localStorage
 * - Type-safe user and token management
 * - Computed isAuthenticated based on token presence
 *
 * Usage:
 * ```tsx
 * const { user, login, logout, isAuthenticated } = useAuthStore()
 * ```
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setUser: (user) =>
        set({ user }),

      setToken: (token) =>
        set({ token, isAuthenticated: !!token }),

      login: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'tapin-auth-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
)
