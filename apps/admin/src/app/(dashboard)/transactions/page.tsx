'use client'

import { useState } from 'react'
import { useTransactions } from '@/lib/queries'
import { Receipt, Search, Filter, ChevronDown } from 'lucide-react'

/**
 * Transaction Types Configuration
 * Maps transaction types to display properties (colors, labels)
 */
const TRANSACTION_TYPES = {
  deposit: {
    label: 'Depósito',
    color: 'text-green-700 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
  },
  purchase: {
    label: 'Compra',
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
  },
  refund: {
    label: 'Reembolso',
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
  },
  adjustment: {
    label: 'Ajuste',
    color: 'text-yellow-700 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
} as const

/**
 * Transactions Page
 *
 * Features:
 * - List all transactions with pagination
 * - Filter by type and date range
 * - Color-coded transaction types
 * - Formatted amounts and dates
 * - Responsive table layout
 *
 * Uses React Query for server state management
 */
export default function TransactionsPage() {
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  // Fetch transactions with React Query
  const { data, isLoading, error } = useTransactions({
    page,
    limit: 20,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  /**
   * Format currency in CLP (Chilean Peso)
   * Handles both positive and negative amounts
   */
  const formatCurrency = (cents: number): string => {
    const amount = cents / 100
    const formatter = new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    })
    return formatter.format(amount)
  }

  /**
   * Format date to readable Spanish format
   */
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

  /**
   * Get transaction type configuration
   */
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

  // Filter transactions by type (client-side for now)
  const filteredTransactions = data?.transactions?.filter((tx: any) => {
    if (!typeFilter) return true
    return tx.type === typeFilter
  })

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Transacciones
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Historial completo de transacciones de billeteras
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium mb-4"
        >
          <Filter className="w-4 h-4" />
          Filtros
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
          />
        </button>

        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Transacción
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Todos</option>
                  <option value="deposit">Depósito</option>
                  <option value="purchase">Compra</option>
                  <option value="refund">Reembolso</option>
                  <option value="adjustment">Ajuste</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fecha Desde
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fecha Hasta
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {(typeFilter || startDate || endDate) && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setTypeFilter('')
                    setStartDate('')
                    setEndDate('')
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-red-800 dark:text-red-200">
            Error al cargar las transacciones. Por favor intenta de nuevo.
          </p>
        </div>
      )}

      {/* Transactions Table */}
      {!isLoading && !error && filteredTransactions && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Saldo Después
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTransactions.map((transaction: any) => {
                    const typeConfig = getTypeConfig(transaction.type)
                    return (
                      <tr
                        key={transaction.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {formatDate(transaction.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${typeConfig.bg} ${typeConfig.color} ${typeConfig.border}`}
                          >
                            {typeConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {transaction.description || '-'}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                            transaction.amount >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {transaction.amount >= 0 ? '+' : ''}
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 text-right font-medium">
                          {formatCurrency(transaction.balanceAfter)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTransactions.map((transaction: any) => {
                const typeConfig = getTypeConfig(transaction.type)
                return (
                  <div key={transaction.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${typeConfig.bg} ${typeConfig.color} ${typeConfig.border}`}
                      >
                        {typeConfig.label}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(transaction.createdAt)}
                      </span>
                    </div>
                    {transaction.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {transaction.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-lg font-semibold ${
                          transaction.amount >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {transaction.amount >= 0 ? '+' : ''}
                        {formatCurrency(transaction.amount)}
                      </span>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Saldo
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(transaction.balanceAfter)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pagination */}
          {data.pagination && (
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando {filteredTransactions.length} de{' '}
                {data.pagination.total} transacciones
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Página {page} de {data.pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredTransactions.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No hay transacciones
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {typeFilter || startDate || endDate
                  ? 'No se encontraron transacciones con los filtros aplicados'
                  : 'Aún no hay transacciones registradas'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
