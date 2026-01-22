'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { apiClient } from '@/lib/api'
import { School, Users, Receipt, TrendingUp, Loader2, GraduationCap, Ticket } from 'lucide-react'

/**
 * Dashboard Home Page
 *
 * Features:
 * - Welcome message with user name
 * - Real-time stats from API
 * - Recent activity feed
 * - Quick actions
 */

interface DashboardStats {
  activeSchools: { value: number; change: string }
  totalUsers: { value: number; change: string }
  activeStudents: { value: number; change: string }
  totalTickets: { value: number }
  transactionsToday: { value: number; change: string }
  revenueThisMonth: { value: number; formatted: string; change: string }
}

interface RecentActivity {
  id: string
  description: string
  amount: number
  type: string
  createdAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isSchoolAdmin = user?.role === 'school_admin'

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)
        setError(null)

        const response = await apiClient.stats.dashboard()

        if (response.data.success) {
          setStats(response.data.data.stats)
          setRecentActivity(response.data.data.recentActivity || [])
        } else {
          setError('No se pudieron cargar las estadísticas')
        }
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err)
        setError(err.response?.data?.message || 'Error al cargar las estadísticas')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // Format stats for display - conditionally show cards based on role
  const statsCards = stats ? [
    // Colegios Activos - only for super_admin (US-034)
    ...(!isSchoolAdmin ? [{
      label: 'Colegios Activos',
      value: stats.activeSchools.value.toString(),
      icon: School,
      change: stats.activeSchools.change,
      color: 'bg-blue-500',
    }] : []),
    // Estudiantes Activos (US-032)
    {
      label: 'Estudiantes Activos',
      value: stats.activeStudents.value.toLocaleString('es-CL'),
      icon: GraduationCap,
      change: stats.activeStudents.change,
      color: 'bg-cyan-500',
    },
    // Apoderados (renamed from Usuarios Totales - US-033)
    {
      label: 'Apoderados',
      value: stats.totalUsers.value.toLocaleString('es-CL'),
      icon: Users,
      change: stats.totalUsers.change,
      color: 'bg-green-500',
    },
    // Tickets Totales (US-037)
    {
      label: 'Tickets Totales',
      value: stats.totalTickets.value.toLocaleString('es-CL'),
      icon: Ticket,
      change: '',
      color: 'bg-amber-500',
    },
    {
      label: 'Transacciones Hoy',
      value: stats.transactionsToday.value.toString(),
      icon: Receipt,
      change: stats.transactionsToday.change,
      color: 'bg-purple-500',
    },
    {
      label: 'Ingresos Mes',
      value: stats.revenueThisMonth.formatted,
      icon: TrendingUp,
      change: stats.revenueThisMonth.change,
      color: 'bg-orange-500',
    },
  ] : []

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Bienvenido, {user?.name || user?.email.split('@')[0] || 'Admin'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Aquí tienes un resumen de la actividad de la plataforma
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
              <span className="text-red-600 dark:text-red-400 text-xl">⚠</span>
            </div>
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-100">
                Error al cargar estadísticas
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 animate-pulse"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gray-200 dark:bg-gray-700 w-12 h-12 rounded-lg" />
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      {!loading && !error && statsCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon
            const isPositive = stat.change.startsWith('+')
            const changeColor = isPositive
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'

            return (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {stat.value}
                  </p>
                  <p className={`text-xs ${changeColor} font-medium`}>
                    {stat.change}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* US-036: Show different first action based on role */}
          {isSchoolAdmin ? (
            <button
              onClick={() => router.push('/students')}
              className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
            >
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                Agregar Estudiante
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Registrar un nuevo estudiante en el colegio
              </p>
            </button>
          ) : (
            <button className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left">
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                Agregar Colegio
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Registrar un nuevo colegio en la plataforma
              </p>
            </button>
          )}

          <button className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors text-left">
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
              Crear Usuario
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Añadir un nuevo usuario al sistema
            </p>
          </button>

          <button
            onClick={() => router.push('/transactions')}
            className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-left"
          >
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
              Ver Reportes
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Generar reportes de transacciones
            </p>
          </button>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Actividad Reciente
        </h2>

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg animate-pulse"
              >
                <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && recentActivity.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No hay actividad reciente</p>
          </div>
        )}

        {!loading && recentActivity.length > 0 && (
          <div className="space-y-4">
            {recentActivity.map((activity) => {
              const typeColors: Record<string, string> = {
                purchase: 'bg-blue-500',
                refund: 'bg-orange-500',
                adjustment: 'bg-purple-500',
              }
              const dotColor = typeColors[activity.type] || 'bg-gray-500'

              // Format timestamp
              const date = new Date(activity.createdAt)
              const now = new Date()
              const diffMs = now.getTime() - date.getTime()
              const diffMins = Math.floor(diffMs / 60000)
              const diffHours = Math.floor(diffMins / 60)
              const diffDays = Math.floor(diffHours / 24)

              let timeAgo = ''
              if (diffDays > 0) {
                timeAgo = `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
              } else if (diffHours > 0) {
                timeAgo = `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
              } else if (diffMins > 0) {
                timeAgo = `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`
              } else {
                timeAgo = 'Hace un momento'
              }

              return (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className={`w-2 h-2 ${dotColor} rounded-full flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {timeAgo}
                      </p>
                      <span className="text-gray-400">•</span>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">
                        {new Intl.NumberFormat('es-CL', {
                          style: 'currency',
                          currency: 'CLP',
                        }).format(activity.amount)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
