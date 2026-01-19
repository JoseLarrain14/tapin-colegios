'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import {
  Receipt,
  Search,
  Filter,
  ChevronDown,
  Download,
  X,
  Ticket,
  DollarSign,
  CreditCard,
  Activity,
  RefreshCw,
} from 'lucide-react'

/**
 * Transaction Types Configuration
 */
const TRANSACTION_TYPES = {
  deposit: {
    label: 'Recarga',
    color: 'text-purple-700 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-800',
  },
  purchase: {
    label: 'Compra',
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
  },
  refund: {
    label: 'Reembolso',
    color: 'text-orange-700 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800',
  },
  adjustment: {
    label: 'Ajuste',
    color: 'text-yellow-700 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  ticket: {
    label: 'Ticket',
    color: 'text-green-700 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
  },
} as const

const VALIDATION_METHODS = {
  rut_search: 'RUT',
  qr_code: 'QR',
  fingerprint: 'Huella',
  app_order: 'App',
} as const

type TabType = 'all' | 'tickets' | 'sales' | 'recharges'

interface Transaction {
  id: string
  date: string
  type: string
  amount: number
  description: string
  studentName: string
  studentRut: string
  studentGrade: string | null
  method: string | null
  operatorName: string | null
  source: string
}

interface Stats {
  ticketsConsumed: number
  totalSales: number
  totalRecharges: number
  transactionCount: number
}

export default function TransactionsPage() {
  // State
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  // Filters
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [methodFilter, setMethodFilter] = useState<string[]>([])
  const [search, setSearch] = useState<string>('')
  const [searchDebounced, setSearchDebounced] = useState<string>('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Get today's date for stats
  const today = new Date().toISOString().split('T')[0]

  // Fetch stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-transactions-stats', today],
    queryFn: async () => {
      const res = await apiClient.adminTransactions.stats({ dateFrom: today, dateTo: today })
      return res.data.data as Stats
    },
  })

  // Build type filter based on active tab
  const getTypeForTab = (): string | undefined => {
    switch (activeTab) {
      case 'tickets':
        return 'ticket'
      case 'sales':
        return 'purchase'
      case 'recharges':
        return 'deposit'
      default:
        return typeFilter.length === 1 ? typeFilter[0] : undefined
    }
  }

  // Fetch transactions
  const { data: transactionsData, isLoading: transactionsLoading, refetch } = useQuery({
    queryKey: ['admin-transactions', page, limit, dateFrom, dateTo, activeTab, typeFilter, searchDebounced],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit }
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo) params.dateTo = dateTo
      if (searchDebounced) params.search = searchDebounced

      const type = getTypeForTab()
      if (type) params.type = type

      const res = await apiClient.adminTransactions.list(params)
      return res.data
    },
  })

  const transactions = transactionsData?.data as Transaction[] || []
  const pagination = transactionsData?.pagination

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  // Get type config
  const getTypeConfig = (type: string) => {
    return (
      TRANSACTION_TYPES[type as keyof typeof TRANSACTION_TYPES] || {
        label: type,
        color: 'text-gray-700 dark:text-gray-400',
        bg: 'bg-gray-50 dark:bg-gray-900/20',
        border: 'border-gray-200 dark:border-gray-800',
      }
    )
  }

  // Get method label
  const getMethodLabel = (method: string | null): string => {
    if (!method) return '-'
    return VALIDATION_METHODS[method as keyof typeof VALIDATION_METHODS] || method
  }

  // Clear filters
  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setTypeFilter([])
    setMethodFilter([])
    setSearch('')
    setPage(1)
  }

  // Export CSV
  const handleExport = async () => {
    try {
      const params: Record<string, any> = {}
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo) params.dateTo = dateTo
      if (searchDebounced) params.search = searchDebounced
      const type = getTypeForTab()
      if (type) params.type = type

      const res = await apiClient.adminTransactions.export(params)
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `transacciones_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  // Tab counts (approximate based on stats)
  const getTabCount = (tab: TabType): number => {
    if (!statsData) return 0
    switch (tab) {
      case 'tickets':
        return statsData.ticketsConsumed
      case 'sales':
        return Math.floor(statsData.transactionCount * 0.4)
      case 'recharges':
        return Math.floor(statsData.transactionCount * 0.3)
      default:
        return statsData.transactionCount
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Transacciones
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Historial completo de operaciones del casino
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Tickets Validados */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Tickets Validados Hoy
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {statsLoading ? '...' : statsData?.ticketsConsumed || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Ticket className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        {/* Ventas del Día */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Ventas del Día
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {statsLoading ? '...' : formatCurrency(statsData?.totalSales || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Recargas del Día */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Recargas del Día
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {statsLoading ? '...' : formatCurrency(statsData?.totalRecharges || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* Transacciones Totales */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Transacciones Hoy
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {statsLoading ? '...' : statsData?.transactionCount || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
              <Activity className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'all', label: 'Todas' },
          { id: 'tickets', label: 'Tickets Hoy' },
          { id: 'sales', label: 'Ventas' },
          { id: 'recharges', label: 'Recargas' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as TabType)
              setPage(1)
            }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
            {statsData && (
              <span className="ml-2 text-xs text-gray-400">
                ({getTabCount(tab.id as TabType)})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4">
        <div className="flex items-center gap-4 mb-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o RUT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              showFilters
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fecha Desde
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    setPage(1)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fecha Hasta
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value)
                    setPage(1)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo
                </label>
                <select
                  value={typeFilter[0] || ''}
                  onChange={(e) => {
                    setTypeFilter(e.target.value ? [e.target.value] : [])
                    setPage(1)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={activeTab !== 'all'}
                >
                  <option value="">Todos</option>
                  <option value="purchase">Compra</option>
                  <option value="deposit">Recarga</option>
                  <option value="refund">Reembolso</option>
                  <option value="ticket">Ticket</option>
                </select>
              </div>

              {/* Method Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Método
                </label>
                <select
                  value={methodFilter[0] || ''}
                  onChange={(e) => {
                    setMethodFilter(e.target.value ? [e.target.value] : [])
                    setPage(1)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Todos</option>
                  <option value="rut_search">RUT</option>
                  <option value="qr_code">QR</option>
                  <option value="fingerprint">Huella</option>
                  <option value="app_order">App</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {(dateFrom || dateTo || typeFilter.length || methodFilter.length || search) && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading */}
      {transactionsLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      )}

      {/* Table */}
      {!transactionsLoading && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Fecha/Hora
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Estudiante
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      RUT
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Método
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Descripción
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Monto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Operador
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.map((tx) => {
                    const typeConfig = getTypeConfig(tx.type)
                    return (
                      <tr
                        key={tx.id}
                        onClick={() => setSelectedTransaction(tx)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {formatDate(tx.date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {tx.studentName}
                          {tx.studentGrade && (
                            <span className="ml-2 text-xs text-gray-500">({tx.studentGrade})</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-mono">
                          {tx.studentRut}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${typeConfig.bg} ${typeConfig.color} ${typeConfig.border}`}
                          >
                            {typeConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {getMethodLabel(tx.method)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                          {tx.description || '-'}
                        </td>
                        <td
                          className={`px-4 py-3 whitespace-nowrap text-sm font-medium text-right ${
                            tx.amount >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {tx.amount >= 0 ? '+' : ''}
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {tx.operatorName || '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {transactions.length === 0 && (
              <div className="p-12 text-center">
                <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No hay transacciones
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {search || dateFrom || dateTo
                    ? 'No se encontraron transacciones con los filtros aplicados'
                    : 'Aún no hay transacciones registradas'}
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination && transactions.length > 0 && (
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando {transactions.length} de {pagination.total} transacciones
                </p>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value))
                    setPage(1)
                  }}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                >
                  <option value={10}>10 por página</option>
                  <option value={25}>25 por página</option>
                  <option value={50}>50 por página</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Página {page} de {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Detalle de Transacción
              </h3>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Fecha</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDate(selectedTransaction.date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tipo</p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeConfig(selectedTransaction.type).bg} ${getTypeConfig(selectedTransaction.type).color} ${getTypeConfig(selectedTransaction.type).border}`}
                  >
                    {getTypeConfig(selectedTransaction.type).label}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Estudiante</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedTransaction.studentName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">RUT</p>
                  <p className="font-medium text-gray-900 dark:text-white font-mono">
                    {selectedTransaction.studentRut}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Curso</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedTransaction.studentGrade || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Método</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {getMethodLabel(selectedTransaction.method)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Monto</p>
                  <p
                    className={`text-lg font-bold ${
                      selectedTransaction.amount >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {selectedTransaction.amount >= 0 ? '+' : ''}
                    {formatCurrency(selectedTransaction.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Origen</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">
                    {selectedTransaction.source}
                  </p>
                </div>
              </div>
              {selectedTransaction.description && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Descripción</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedTransaction.description}
                  </p>
                </div>
              )}
              {selectedTransaction.operatorName && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Operador</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedTransaction.operatorName}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setSelectedTransaction(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
