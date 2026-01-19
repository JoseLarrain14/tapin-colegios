'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'


const DAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
]

const TIME_SLOTS = [
  { value: 'breakfast', label: 'Desayuno' },
  { value: 'lunch', label: 'Almuerzo' },
  { value: 'snack', label: 'Colación' },
]

export default function EditMenuItemPage() {
  const router = useRouter()
  const params = useParams()
  const queryClient = useQueryClient()
  const itemId = params.id as string

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [available, setAvailable] = useState(true)
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [selectedSlots, setSelectedSlots] = useState<string[]>(['breakfast', 'lunch', 'snack'])
  const [error, setError] = useState<string | null>(null)

  // TODO: Get cafeteriaId from auth context
  const cafeteriaId = 'demo-cafeteria'

  const { data, isLoading } = useQuery({
    queryKey: ['menu-item', itemId],
    queryFn: async () => {
      const response = await apiClient.menu.getById(cafeteriaId, itemId)
      return response.data
    },
  })

  useEffect(() => {
    if (data) {
      setName(data.name || '')
      setDescription(data.description || '')
      setPrice(String(data.price / 100))
      setCategory(data.category || '')
      setAvailable(data.available)
      try {
        setSelectedDays(JSON.parse(data.availableDays))
      } catch {
        setSelectedDays([1, 2, 3, 4, 5])
      }
      try {
        setSelectedSlots(JSON.parse(data.availableTimeSlots))
      } catch {
        setSelectedSlots(['breakfast', 'lunch', 'snack'])
      }
    }
  }, [data])

  const updateMutation = useMutation({
    mutationFn: async (updateData: Record<string, unknown>) => {
      const response = await apiClient.menu.update(cafeteriaId, itemId, updateData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] })
      router.push('/menu')
    },
    onError: (err: Error) => {
      setError(err.message || 'Error al actualizar el producto')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.menu.delete(cafeteriaId, itemId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] })
      router.push('/menu')
    },
    onError: (err: Error) => {
      setError(err.message || 'Error al eliminar el producto')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }

    const priceInCents = Math.round(parseFloat(price) * 100)
    if (isNaN(priceInCents) || priceInCents <= 0) {
      setError('El precio debe ser mayor a 0')
      return
    }

    updateMutation.mutate({
      name: name.trim(),
      description: description.trim() || null,
      price: priceInCents,
      category: category.trim() || null,
      available,
      availableDays: JSON.stringify(selectedDays),
      availableTimeSlots: JSON.stringify(selectedSlots),
    })
  }

  const handleDelete = () => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      deleteMutation.mutate()
    }
  }

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  const toggleSlot = (slot: string) => {
    setSelectedSlots(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Producto no encontrado</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Editar Producto</h1>
        <p className="text-gray-600 dark:text-gray-400">Modifica los datos del producto</p>
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
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          />
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
            step="10"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            required
          />
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Categoría
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Días disponibles */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Días disponibles *
          </label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(day => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedDays.includes(day.value)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        {/* Horarios disponibles */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Horarios disponibles *
          </label>
          <div className="flex flex-wrap gap-2">
            {TIME_SLOTS.map(slot => (
              <button
                key={slot.value}
                type="button"
                onClick={() => toggleSlot(slot.value)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedSlots.includes(slot.value)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>

        {/* Disponible */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="available"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded border-gray-300"
          />
          <label htmlFor="available" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Disponible para venta
          </label>
        </div>

        {/* Buttons */}
        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
          >
            {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
          </button>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
            >
              {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
