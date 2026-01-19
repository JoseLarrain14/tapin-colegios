'use client'

import { useState } from 'react'
import { useSchools, useDeleteSchool } from '@/lib/queries'
import { School, Plus, Trash2, Edit, Search } from 'lucide-react'
import Link from 'next/link'

/**
 * Schools List Page
 *
 * Features:
 * - List all schools with pagination
 * - Search functionality
 * - Delete schools
 * - Navigate to edit/create pages
 *
 * Uses React Query for server state management
 */
export default function SchoolsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  // Fetch schools with React Query
  const { data, isLoading, error } = useSchools({
    page,
    limit: 10,
    search: search || undefined,
  })

  // Delete mutation
  const deleteSchool = useDeleteSchool()

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar el colegio "${name}"?`)) {
      return
    }

    try {
      await deleteSchool.mutateAsync(id)
      // React Query will automatically refetch the list
    } catch (error) {
      console.error('Error deleting school:', error)
      alert('Error al eliminar el colegio')
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Colegios
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona los colegios registrados en la plataforma
          </p>
        </div>

        <Link
          href="/schools/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Colegio
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar colegios..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
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
            Error al cargar los colegios. Por favor intenta de nuevo.
          </p>
        </div>
      )}

      {/* Schools Grid */}
      {!isLoading && !error && data?.schools && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {data.schools.map((school: any) => (
              <div
                key={school.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
              >
                {/* School Info */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                    <School className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {school.name}
                    </h3>
                    {school.address && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {school.address}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Estudiantes
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {school._count?.users || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Items Menú
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {school._count?.menuItems || 0}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/schools/${school.id}`}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(school.id, school.name)}
                    disabled={deleteSchool.isPending}
                    className="px-3 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data.pagination && (
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando {data.schools.length} de {data.pagination.total}{' '}
                colegios
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
          {data.schools.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-12 text-center">
              <School className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No hay colegios
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {search
                  ? 'No se encontraron colegios con ese criterio de búsqueda'
                  : 'Comienza agregando tu primer colegio'}
              </p>
              <Link
                href="/schools/new"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md transition-colors"
              >
                <Plus className="w-5 h-5" />
                Agregar Colegio
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
