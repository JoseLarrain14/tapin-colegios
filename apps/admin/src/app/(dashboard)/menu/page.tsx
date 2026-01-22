'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

// Hook para obtener el cafeteriaId dinámicamente
function useCafeteriaId() {
  const { data: configData, isLoading } = useQuery({
    queryKey: ['admin-config'],
    queryFn: async () => {
      const response = await apiClient.admin.config()
      return response.data
    },
  })
  return {
    cafeteriaId: configData?.data?.cafeteria?.id,
    isLoadingConfig: isLoading,
  }
}

interface MenuItem {
  id: string
  cafeteriaId: string
  name: string
  description: string | null
  price: number
  category: string | null
  imageUrl: string | null
  available: boolean
  availableDays: string
  availableTimeSlots: string
  createdAt: string
  updatedAt: string
}

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const TIME_SLOTS: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  snack: 'Colación'
}

export default function MenuPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAvailable, setFilterAvailable] = useState<'all' | 'true' | 'false'>('all')

  // Obtener cafeteriaId dinámicamente desde la configuración del admin
  const { cafeteriaId, isLoadingConfig } = useCafeteriaId()

  const { data, isLoading, error } = useQuery({
    queryKey: ['menu', cafeteriaId],
    queryFn: async () => {
      const response = await apiClient.menu.list(cafeteriaId!)
      return response.data
    },
    enabled: !!cafeteriaId,
  })

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (!cafeteriaId) throw new Error('No cafeteria configured')
      await apiClient.menu.delete(cafeteriaId, itemId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] })
    },
  })

  const toggleAvailableMutation = useMutation({
    mutationFn: async ({ itemId, available }: { itemId: string; available: boolean }) => {
      if (!cafeteriaId) throw new Error('No cafeteria configured')
      await apiClient.menu.update(cafeteriaId, itemId, { available })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] })
    },
  })

  // Extract items from the API response structure
  const menuItems: MenuItem[] = Array.isArray(data?.data?.items) ? data.data.items : []

  const filteredItems = menuItems.filter(item => {
    if (filterCategory && item.category !== filterCategory) return false
    if (filterAvailable !== 'all' && String(item.available) !== filterAvailable) return false
    return true
  })

  const categories = [...new Set(menuItems.map(item => item.category).filter(Boolean))]

  const parseDays = (daysJson: string): number[] => {
    try {
      return JSON.parse(daysJson)
    } catch {
      return [1, 2, 3, 4, 5]
    }
  }

  const parseTimeSlots = (slotsJson: string): string[] => {
    try {
      return JSON.parse(slotsJson)
    } catch {
      return ['breakfast', 'lunch', 'snack']
    }
  }

  if (isLoadingConfig || isLoading) {
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
          No hay una cafetería configurada para tu colegio.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">
          Configuración Requerida
        </h3>
        <p className="text-yellow-700 dark:text-yellow-300">
          Necesitas configurar la cafetería antes de gestionar el menú.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Menú</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona los productos de la cafetería
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/menu/calendar"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Calendario
          </Link>
          <Link
            href="/menu/new"
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Nuevo Producto
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Categoría
          </label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          >
            <option value="">Todas</option>
            {categories.map(cat => (
              <option key={cat} value={cat || ''}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Disponibilidad
          </label>
          <select
            value={filterAvailable}
            onChange={(e) => setFilterAvailable(e.target.value as 'all' | 'true' | 'false')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Todos</option>
            <option value="true">Disponibles</option>
            <option value="false">No disponibles</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No hay productos en el menú
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Días
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
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                      {item.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.category || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {parseDays(item.availableDays).map(d => DAYS[d - 1]).join(', ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleAvailableMutation.mutate({ itemId: item.id, available: !item.available })}
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.available
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {item.available ? 'Disponible' : 'No disponible'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/menu/${item.id}`}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar este producto?')) {
                            deleteMutation.mutate(item.id)
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
