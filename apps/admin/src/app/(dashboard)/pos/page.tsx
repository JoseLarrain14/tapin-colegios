'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { Search, Ticket, User, Check, Loader2, Clock, History } from 'lucide-react'

interface Student {
  id: string
  firstName: string
  lastName: string
  fullName: string
  rut: string
  grade: string | null
  section: string | null
  photoUrl: string | null
  balance: number
  tickets: Record<string, number>
  totalTickets: number
}

interface ConsumeResult {
  studentId: string
  ticketType: string
  remaining: number
  total: number
}

export default function POSPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [lastConsume, setLastConsume] = useState<ConsumeResult | null>(null)
  // PERFORMANCE: Track tab visibility to pause polling
  const [isTabVisible, setIsTabVisible] = useState(true)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // PERFORMANCE: Track page visibility to pause polling when tab is not visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === 'visible')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Fetch students when search has at least 2 characters
  const { data, isLoading, error } = useQuery({
    queryKey: ['pos-students', debouncedSearch],
    queryFn: async () => {
      if (debouncedSearch.length < 2) return { data: [] }
      const response = await apiClient.admin.students.list({
        search: debouncedSearch,
        limit: 10,
      })
      return response.data
    },
    enabled: debouncedSearch.length >= 2,
  })

  // Consume ticket mutation
  const consumeMutation = useMutation({
    mutationFn: async ({ studentId, ticketType }: { studentId: string; ticketType: string }) => {
      const response = await apiClient.casino.consume({ studentId, ticketType, quantity: 1 })
      return response.data
    },
    onSuccess: (data: any) => {
      // Update last consume for success message
      setLastConsume({
        studentId: data.data.student.id,
        ticketType: data.data.consumption.ticketType,
        remaining: data.data.remainingTickets[data.data.consumption.ticketType],
        total: data.data.remainingTickets.total,
      })
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['pos-students'] })
      queryClient.invalidateQueries({ queryKey: ['pos-consumptions'] })
      // Clear success message after 3 seconds
      setTimeout(() => setLastConsume(null), 3000)
    },
  })

  // Fetch today's consumptions
  // PERFORMANCE: Only poll when tab is visible to save resources
  const { data: consumptionsData, refetch: refetchConsumptions } = useQuery({
    queryKey: ['pos-consumptions'],
    queryFn: async () => {
      const response = await apiClient.casino.consumptions()
      return response.data
    },
    refetchInterval: isTabVisible ? 30000 : false, // Only refresh when tab is visible
  })

  const students: Student[] = data?.data || []
  const consumptions = consumptionsData?.data?.consumptions || []

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  const clearSearch = () => {
    setSearch('')
    setDebouncedSearch('')
  }

  const handleConsume = (studentId: string, ticketType: string) => {
    consumeMutation.mutate({ studentId, ticketType })
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          POS Casino
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
          Busca estudiantes por nombre o RUT para registrar consumos
        </p>
      </div>

      {/* Large Search Input */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por nombre o RUT..."
            className="w-full pl-20 pr-6 py-6 text-2xl border-2 border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
            autoFocus
          />
          {search && (
            <button
              onClick={clearSearch}
              className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          )}
        </div>
        {search.length > 0 && search.length < 2 && (
          <p className="mt-2 text-gray-500 text-lg">
            Escribe al menos 2 caracteres para buscar
          </p>
        )}
      </div>

      {/* Loading State */}
      {isLoading && debouncedSearch.length >= 2 && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <p className="text-lg text-red-800 dark:text-red-200">
            Error al buscar estudiantes. Intenta nuevamente.
          </p>
        </div>
      )}

      {/* Results */}
      {!isLoading && debouncedSearch.length >= 2 && (
        <div className="space-y-4">
          {students.length === 0 ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-8 text-center">
              <User className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
              <p className="text-xl text-yellow-800 dark:text-yellow-200">
                No se encontraron estudiantes con &quot;{debouncedSearch}&quot;
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {students.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  onConsume={handleConsume}
                  isConsuming={consumeMutation.isPending && consumeMutation.variables?.studentId === student.id}
                  lastConsume={lastConsume?.studentId === student.id ? lastConsume : null}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && debouncedSearch.length < 2 && (
        <div className="text-center py-16">
          <Search className="w-24 h-24 mx-auto text-gray-300 dark:text-gray-600 mb-6" />
          <p className="text-2xl text-gray-500 dark:text-gray-400">
            Busca un estudiante para comenzar
          </p>
        </div>
      )}

      {/* Today's Consumptions History */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <History className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Consumos de hoy
            </h2>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-lg font-medium">
              {consumptions.length}
            </span>
          </div>
        </div>

        {consumptions.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
            <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg text-gray-500 dark:text-gray-400">
              No hay consumos registrados hoy
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Hora
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Estudiante
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    RUT
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Curso
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Ticket
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {consumptions.map((consumption: any) => (
                  <tr key={consumption.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-lg text-gray-900 dark:text-white">
                      {new Date(consumption.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-lg font-medium text-gray-900 dark:text-white">
                      {consumption.student?.fullName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-lg text-gray-600 dark:text-gray-400">
                      {consumption.student?.rut || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-lg text-gray-600 dark:text-gray-400">
                      {consumption.student?.grade ? `${consumption.student.grade}°${consumption.student.section || ''}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {consumption.ticketsUsed?.map((t: any, i: number) => (
                        <span key={i} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
                          {t.quantity}x {t.type}
                        </span>
                      ))}
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

interface StudentCardProps {
  student: Student
  onConsume: (studentId: string, ticketType: string) => void
  isConsuming: boolean
  lastConsume: ConsumeResult | null
}

function StudentCard({ student, onConsume, isConsuming, lastConsume }: StudentCardProps) {
  const initials = `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`
  const hasTickets = student.totalTickets > 0

  // Get the first ticket type for consumption (usually "almuerzo")
  const ticketTypes = Object.entries(student.tickets).filter(([_, qty]) => qty > 0)
  const defaultTicketType = ticketTypes.length > 0 ? ticketTypes[0][0] : 'almuerzo'

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 p-6 transition-all ${
      lastConsume ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 hover:shadow-xl'
    }`}>
      {/* Success Message */}
      {lastConsume && (
        <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center gap-3">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          <div>
            <p className="text-lg font-bold text-green-800 dark:text-green-200">
              Consumo registrado
            </p>
            <p className="text-green-700 dark:text-green-300">
              Ticket de {lastConsume.ticketType} usado. Quedan {lastConsume.total} tickets.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-6">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {student.photoUrl ? (
            <img
              src={student.photoUrl}
              alt={student.fullName}
              className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-600"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center border-4 border-blue-400">
              <span className="text-3xl font-bold text-white">{initials}</span>
            </div>
          )}
        </div>

        {/* Student Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
            {student.fullName}
          </h3>
          <p className="text-xl text-gray-600 dark:text-gray-400 mt-1">
            RUT: {student.rut}
          </p>
          {(student.grade || student.section) && (
            <p className="text-lg text-gray-500 dark:text-gray-400 mt-1">
              {student.grade && `${student.grade}°`}
              {student.grade && student.section && ' '}
              {student.section && student.section}
            </p>
          )}
        </div>

        {/* Tickets Info */}
        <div className="flex-shrink-0 text-center">
          <div className={`inline-flex items-center gap-3 px-6 py-4 rounded-xl ${
            hasTickets
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
          }`}>
            <Ticket className="w-8 h-8" />
            <div>
              <span className="text-4xl font-bold">{student.totalTickets}</span>
              <span className="text-lg ml-2">tickets</span>
            </div>
          </div>
          {Object.entries(student.tickets).length > 0 && (
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {Object.entries(student.tickets).map(([type, qty]) => (
                <span key={type} className="block">
                  {qty}x {type}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Consume Button */}
        <div className="flex-shrink-0">
          <button
            onClick={() => onConsume(student.id, defaultTicketType)}
            disabled={!hasTickets || isConsuming}
            className={`px-8 py-6 rounded-2xl text-xl font-bold transition-all ${
              hasTickets && !isConsuming
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl active:scale-95'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            {isConsuming ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin" />
                Marcando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Check className="w-6 h-6" />
                Marcar consumo
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
