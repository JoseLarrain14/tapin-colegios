'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

import { formatCurrency } from '@/lib/utils'

interface RechargePackage {
  id: string
  cafeteriaId: string
  name: string
  description: string | null
  price: number
  type: 'ticket' | 'balance'
  ticketCount: number | null
  ticketType: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export default function PackagesPage() {
  const queryClient = useQueryClient()
  const [filterType, setFilterType] = useState<'all' | 'ticket'>('all')
  const [filterActive, setFilterActive] = useState<'all' | 'true' | 'false'>('all')

  // Get admin config (school and cafeteria)
  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ['admin-config'],
    queryFn: async () => {
      const response = await apiClient.admin.config()
      return response.data
    },
  })

  const cafeteriaId = configData?.data?.cafeteria?.id

  const { data, isLoading, error } = useQuery({
    queryKey: ['packages', cafeteriaId],
    queryFn: async () => {
      if (!cafeteriaId) return { data: { packages: [] } }
      const response = await apiClient.packages.list(cafeteriaId)
      return response.data
    },
    enabled: !!cafeteriaId,
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ packageId, active }: { packageId: string; active: boolean }) => {
      if (!cafeteriaId) throw new Error('No cafeteria configured')
      await apiClient.packages.update(cafeteriaId, packageId, { active })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (packageId: string) => {
      if (!cafeteriaId) throw new Error('No cafeteria configured')
      await apiClient.packages.delete(cafeteriaId, packageId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] })
    },
  })

  // Extract packages from the API response structure
  const packages: RechargePackage[] = Array.isArray(data?.data?.packages) ? data.data.packages : []

  const filteredPackages = packages.filter(pkg => {
    if (filterType !== 'all' && pkg.type !== filterType) return false
    if (filterActive !== 'all' && String(pkg.active) !== filterActive) return false
    return true
  })

  if (configLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!cafeteriaId) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">
          Configuración Requerida
        </h3>
        <p className="text-yellow-700 dark:text-yellow-300">
          No hay una cafetería configurada para tu colegio. Contacta al administrador del sistema.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">
          Error al cargar paquetes
        </h3>
        <p className="text-yellow-700 dark:text-yellow-300">
          No se pudieron cargar los paquetes. Intenta nuevamente.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paquetes de Recarga</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona los paquetes de recarga disponibles
          </p>
        </div>
        <Link
          href={`/packages/new?cafeteriaId=${cafeteriaId}`}
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nuevo Paquete
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tipo
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'ticket')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Todos</option>
            <option value="ticket">Tickets</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Estado
          </label>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as 'all' | 'true' | 'false')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {filteredPackages.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No hay paquetes de recarga
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Paquete
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Contenido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPackages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 dark:text-white">{pkg.name}</div>
                      {pkg.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {pkg.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        Tickets
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(pkg.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {pkg.ticketCount} tickets de {pkg.ticketType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleActiveMutation.mutate({ packageId: pkg.id, active: !pkg.active })}
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          pkg.active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {pkg.active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/packages/${pkg.id}?cafeteriaId=${cafeteriaId}`}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar este paquete?')) {
                            deleteMutation.mutate(pkg.id)
                          }
                        }}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
