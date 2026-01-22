'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

function NewPackageForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [type, setType] = useState<'balance' | 'ticket'>('ticket')
  const [ticketCount, setTicketCount] = useState('1')
  const [ticketType, setTicketType] = useState('almuerzo')
  const [active, setActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get cafeteriaId from URL or config
  const cafeteriaIdFromUrl = searchParams.get('cafeteriaId')

  const { data: configData } = useQuery({
    queryKey: ['admin-config'],
    queryFn: async () => {
      const response = await apiClient.admin.config()
      return response.data
    },
    enabled: !cafeteriaIdFromUrl,
  })

  const cafeteriaId = cafeteriaIdFromUrl || configData?.data?.cafeteria?.id

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (!cafeteriaId) throw new Error('No cafeteria configured')
      const response = await apiClient.packages.create(cafeteriaId, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] })
      router.push('/packages')
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || err.message || 'Error al crear el paquete')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!cafeteriaId) {
      setError('No hay cafetería configurada')
      return
    }

    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }

    const priceValue = parseInt(price)
    if (isNaN(priceValue) || priceValue <= 0) {
      setError('El precio debe ser mayor a 0')
      return
    }

    if (type === 'ticket') {
      const count = parseInt(ticketCount)
      if (isNaN(count) || count <= 0) {
        setError('La cantidad de tickets debe ser mayor a 0')
        return
      }
      if (!ticketType.trim()) {
        setError('El tipo de ticket es requerido')
        return
      }
    }

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || null,
      price: priceValue,
      type,
      ticketCount: type === 'ticket' ? parseInt(ticketCount) : null,
      ticketType: type === 'ticket' ? ticketType.trim() : null,
      active,
    })
  }

  if (!cafeteriaId && !configData) {
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nuevo Paquete</h1>
        <p className="text-gray-600 dark:text-gray-400">Crea un nuevo paquete de recarga</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nombre *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            placeholder="Ej: Almuerzo diario"
            required
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            placeholder="Descripción opcional"
          />
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tipo de paquete *
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="type"
                value="ticket"
                checked={true}
                readOnly
                className="h-4 w-4 text-blue-600 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Tickets</span>
            </label>
            {/* Opcion de Saldo eliminada - sistema simplificado a solo tickets */}
          </div>
        </div>

        {/* Precio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Precio (CLP) *
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min="0"
            step="1000"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            placeholder="5000"
            required
          />
        </div>

        {/* Campos de Tickets */}
        {type === 'ticket' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cantidad de Tickets *
              </label>
              <input
                type="number"
                value={ticketCount}
                onChange={(e) => setTicketCount(e.target.value)}
                min="1"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                placeholder="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo de Ticket *
              </label>
              <input
                type="text"
                value={ticketType}
                onChange={(e) => setTicketType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                placeholder="Ej: almuerzo, colación"
                required
              />
            </div>
          </>
        )}

        {/* Activo */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="active"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded border-gray-300"
          />
          <label htmlFor="active" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Activo (disponible para compra)
          </label>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            {createMutation.isPending ? 'Guardando...' : 'Crear Paquete'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NewPackagePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <NewPackageForm />
    </Suspense>
  )
}
