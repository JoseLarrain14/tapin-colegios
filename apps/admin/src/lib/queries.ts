/**
 * React Query Hooks
 *
 * Custom hooks using @tanstack/react-query for server state management.
 * These hooks handle caching, loading states, and error handling automatically.
 *
 * Usage:
 * ```tsx
 * const { data, isLoading, error } = useSchools()
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './api'
import type { AxiosError } from 'axios'

// Query keys for cache management
export const queryKeys = {
  schools: {
    all: ['schools'] as const,
    lists: () => [...queryKeys.schools.all, 'list'] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.schools.lists(), filters] as const,
    details: () => [...queryKeys.schools.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.schools.details(), id] as const,
  },
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    lists: () => [...queryKeys.transactions.all, 'list'] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.transactions.lists(), filters] as const,
    details: () => [...queryKeys.transactions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.transactions.details(), id] as const,
  },
  menuItems: {
    all: ['menuItems'] as const,
    lists: () => [...queryKeys.menuItems.all, 'list'] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.menuItems.lists(), filters] as const,
    details: () => [...queryKeys.menuItems.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.menuItems.details(), id] as const,
  },
  packages: {
    all: ['packages'] as const,
    lists: () => [...queryKeys.packages.all, 'list'] as const,
    list: (cafeteriaId: string) =>
      [...queryKeys.packages.lists(), cafeteriaId] as const,
    details: () => [...queryKeys.packages.all, 'detail'] as const,
    detail: (cafeteriaId: string, packageId: string) =>
      [...queryKeys.packages.details(), cafeteriaId, packageId] as const,
  },
}

// Schools Queries
export function useSchools(params?: {
  page?: number
  limit?: number
  search?: string
}) {
  return useQuery({
    queryKey: queryKeys.schools.list(params || {}),
    queryFn: async () => {
      const response = await apiClient.schools.list(params)
      return response.data
    },
  })
}

export function useSchool(id: string) {
  return useQuery({
    queryKey: queryKeys.schools.detail(id),
    queryFn: async () => {
      const response = await apiClient.schools.getById(id)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateSchool() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.schools.create(data)
      return response.data
    },
    onSuccess: () => {
      // Invalidate and refetch schools list
      queryClient.invalidateQueries({ queryKey: queryKeys.schools.lists() })
    },
  })
}

export function useUpdateSchool(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.schools.update(id, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schools.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.schools.lists() })
    },
  })
}

export function useDeleteSchool() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.schools.delete(id)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schools.lists() })
    },
  })
}

// Users Queries
export function useUsers(params?: {
  page?: number
  limit?: number
  role?: string
}) {
  return useQuery({
    queryKey: queryKeys.users.list(params || {}),
    queryFn: async () => {
      const response = await apiClient.users.list(params)
      return response.data
    },
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: async () => {
      const response = await apiClient.users.getById(id)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.users.create(data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() })
    },
  })
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.users.update(id, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.users.delete(id)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() })
    },
  })
}

// Transactions Queries
export function useTransactions(params?: {
  page?: number
  limit?: number
  schoolId?: string
  userId?: string
  startDate?: string
  endDate?: string
}) {
  return useQuery({
    queryKey: queryKeys.transactions.list(params || {}),
    queryFn: async () => {
      const response = await apiClient.transactions.list(params)
      return response.data
    },
  })
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: queryKeys.transactions.detail(id),
    queryFn: async () => {
      const response = await apiClient.transactions.getById(id)
      return response.data
    },
    enabled: !!id,
  })
}

// Menu Items Queries - Using apiClient.menu directly in pages

// Packages Queries
export function usePackages(cafeteriaId: string) {
  return useQuery({
    queryKey: queryKeys.packages.list(cafeteriaId),
    queryFn: async () => {
      const response = await apiClient.packages.list(cafeteriaId)
      return response.data
    },
    enabled: !!cafeteriaId,
  })
}

export function usePackage(cafeteriaId: string, packageId: string) {
  return useQuery({
    queryKey: queryKeys.packages.detail(cafeteriaId, packageId),
    queryFn: async () => {
      const response = await apiClient.packages.getById(cafeteriaId, packageId)
      return response.data
    },
    enabled: !!cafeteriaId && !!packageId,
  })
}

export function useCreatePackage(cafeteriaId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.packages.create(cafeteriaId, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.packages.list(cafeteriaId) })
    },
  })
}

export function useUpdatePackage(cafeteriaId: string, packageId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.packages.update(cafeteriaId, packageId, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.packages.detail(cafeteriaId, packageId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.packages.list(cafeteriaId) })
    },
  })
}

export function useDeletePackage(cafeteriaId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (packageId: string) => {
      const response = await apiClient.packages.delete(cafeteriaId, packageId)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.packages.list(cafeteriaId) })
    },
  })
}
