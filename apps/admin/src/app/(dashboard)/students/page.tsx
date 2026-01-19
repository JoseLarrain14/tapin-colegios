'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Plus, X, Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react'

interface Student {
  id: string
  schoolId: string
  rut: string
  firstName: string
  lastName: string
  fullName?: string
  grade: string | null
  section: string | null
  photoUrl: string | null
  dailyLimit: number
  active: boolean
  createdAt: string
  balance?: number
  totalTickets?: number
  school?: {
    id: string
    name: string
    code: string
  }
  wallet?: {
    id: string
    balance: number
  }
  tickets?: Record<string, number> | Array<{
    ticketType: string
    quantity: number
  }>
}

interface CreateStudentForm {
  rut: string
  firstName: string
  lastName: string
  grade: string
  section: string
}

interface ImportError {
  row: number
  rut?: string
  message: string
}

interface ImportResult {
  total: number
  created: number
  duplicates: number
  errors: number
  duplicateRuts: string[]
  errorDetails: ImportError[]
}

function formatRut(rut: string): string {
  const clean = rut.replace(/[^0-9kK]/g, '')
  if (clean.length < 2) return clean
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1).toUpperCase()
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formatted}-${dv}`
}

export default function StudentsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'true' | 'false'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState<CreateStudentForm>({
    rut: '',
    firstName: '',
    lastName: '',
    grade: '',
    section: '',
  })
  const [createError, setCreateError] = useState<string | null>(null)

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  // Fetch students using admin endpoint
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-students', search],
    queryFn: async () => {
      const response = await apiClient.adminStudents.list({ search: search || undefined })
      return response.data
    },
  })

  // Create student mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateStudentForm) => apiClient.adminStudents.create({
      rut: data.rut,
      firstName: data.firstName,
      lastName: data.lastName,
      grade: data.grade || undefined,
      section: data.section || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students'] })
      setShowCreateModal(false)
      setCreateForm({ rut: '', firstName: '', lastName: '', grade: '', section: '' })
      setCreateError(null)
    },
    onError: (error: any) => {
      setCreateError(error.response?.data?.message || 'Error al crear estudiante')
    },
  })

  // Import students mutation
  const importMutation = useMutation({
    mutationFn: (file: File) => apiClient.adminStudents.import(file),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-students'] })
      setImportResult(response.data.data)
      setImportFile(null)
      setImportError(null)
    },
    onError: (error: any) => {
      setImportError(error.response?.data?.message || 'Error al importar estudiantes')
    },
  })

  const students: Student[] = data?.data || []

  const filteredStudents = students.filter(student => {
    // Active filter only (search is done server-side)
    if (filterActive !== 'all' && String(student.active) !== filterActive) return false
    return true
  })

  // Get balance from either format
  const getBalance = (student: Student) => {
    if (typeof student.balance === 'number') return student.balance
    return student.wallet?.balance || 0
  }

  // Get total tickets from either format
  const getTotalTickets = (student: Student) => {
    if (typeof student.totalTickets === 'number') return student.totalTickets
    if (Array.isArray(student.tickets)) {
      return student.tickets.reduce((sum, t) => sum + t.quantity, 0)
    }
    if (student.tickets && typeof student.tickets === 'object') {
      return Object.values(student.tickets).reduce((sum, q) => sum + q, 0)
    }
    return 0
  }

  // Get tickets display
  const getTicketsDisplay = (student: Student) => {
    if (Array.isArray(student.tickets) && student.tickets.length > 0) {
      return student.tickets.map(t => `${t.quantity} ${t.ticketType}`).join(', ')
    }
    if (student.tickets && typeof student.tickets === 'object' && !Array.isArray(student.tickets)) {
      const entries = Object.entries(student.tickets)
      if (entries.length > 0) {
        return entries.map(([type, qty]) => `${qty} ${type}`).join(', ')
      }
    }
    return '-'
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    createMutation.mutate(createForm)
  }

  const handleImportSubmit = () => {
    if (!importFile) return
    setImportError(null)
    setImportResult(null)
    importMutation.mutate(importFile)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImportFile(file)
      setImportError(null)
      setImportResult(null)
    }
  }

  const closeImportModal = () => {
    setShowImportModal(false)
    setImportFile(null)
    setImportResult(null)
    setImportError(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">
          Error al cargar estudiantes
        </h3>
        <p className="text-yellow-700 dark:text-yellow-300">
          No se pudieron cargar los estudiantes. Intenta nuevamente.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Estudiantes</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Lista de estudiantes del colegio
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <Upload className="w-5 h-5" />
            Importar Excel
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Agregar Estudiante
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Buscar
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre o RUT..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          />
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Estudiantes</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{students.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Activos</p>
          <p className="text-2xl font-bold text-green-600">{students.filter(s => s.active).length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Saldo Total</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(students.reduce((sum, s) => sum + getBalance(s), 0))}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {search || filterActive !== 'all' ? 'No se encontraron estudiantes' : 'No hay estudiantes registrados'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Estudiante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    RUT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Curso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Sección
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Saldo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tickets
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {student.photoUrl ? (
                          <img
                            src={student.photoUrl}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                              {student.firstName[0]}{student.lastName[0]}
                            </span>
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {student.firstName} {student.lastName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatRut(student.rut)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {student.grade || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {student.section || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        getBalance(student) >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {formatCurrency(getBalance(student))}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {getTicketsDisplay(student)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        student.active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {student.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Student Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowCreateModal(false)}
            />

            {/* Modal */}
            <div className="relative inline-block bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreateSubmit}>
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Agregar Estudiante
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="px-6 py-4 space-y-4">
                  {createError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      RUT *
                    </label>
                    <input
                      type="text"
                      value={createForm.rut}
                      onChange={(e) => setCreateForm({ ...createForm, rut: e.target.value })}
                      placeholder="12.345.678-9"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        value={createForm.firstName}
                        onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Apellido *
                      </label>
                      <input
                        type="text"
                        value={createForm.lastName}
                        onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Curso
                      </label>
                      <input
                        type="text"
                        value={createForm.grade}
                        onChange={(e) => setCreateForm({ ...createForm, grade: e.target.value })}
                        placeholder="Ej: 8°"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Sección
                      </label>
                      <input
                        type="text"
                        value={createForm.section}
                        onChange={(e) => setCreateForm({ ...createForm, section: e.target.value })}
                        placeholder="Ej: A"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {createMutation.isPending ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Import Students Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={closeImportModal}
            />

            {/* Modal */}
            <div className="relative inline-block bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Importar Estudiantes
                </h3>
                <button
                  type="button"
                  onClick={closeImportModal}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-4 space-y-4">
                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Formato esperado
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        El archivo debe tener las columnas: <strong>RUT</strong>, <strong>Nombre</strong>, <strong>Apellido</strong>, <strong>Curso</strong> (opcional), <strong>Sección</strong> (opcional)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Error message */}
                {importError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <p className="text-sm text-red-600 dark:text-red-400">{importError}</p>
                  </div>
                )}

                {/* File input */}
                {!importResult && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Seleccionar archivo
                    </label>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-200"
                    />
                    {importFile && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Archivo seleccionado: {importFile.name}
                      </p>
                    )}
                  </div>
                )}

                {/* Import result */}
                {importResult && (
                  <div className="space-y-4">
                    {/* Success summary */}
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <p className="font-medium text-green-800 dark:text-green-200">
                          Importación completada
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p className="text-green-700 dark:text-green-300">
                          Total en archivo: <strong>{importResult.total}</strong>
                        </p>
                        <p className="text-green-700 dark:text-green-300">
                          Creados: <strong>{importResult.created}</strong>
                        </p>
                        <p className="text-yellow-700 dark:text-yellow-300">
                          Duplicados: <strong>{importResult.duplicates}</strong>
                        </p>
                        <p className="text-red-700 dark:text-red-300">
                          Errores: <strong>{importResult.errors}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Duplicates list */}
                    {importResult.duplicateRuts.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                          RUTs duplicados (ya existen en el colegio):
                        </p>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 max-h-24 overflow-y-auto">
                          <p className="text-sm text-yellow-600 dark:text-yellow-400">
                            {importResult.duplicateRuts.join(', ')}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Errors list */}
                    {importResult.errorDetails.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                          Errores encontrados:
                        </p>
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 max-h-32 overflow-y-auto space-y-1">
                          {importResult.errorDetails.map((err, idx) => (
                            <p key={idx} className="text-sm text-red-600 dark:text-red-400">
                              Fila {err.row}: {err.message}{err.rut ? ` (RUT: ${err.rut})` : ''}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeImportModal}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  {importResult ? 'Cerrar' : 'Cancelar'}
                </button>
                {!importResult && (
                  <button
                    type="button"
                    onClick={handleImportSubmit}
                    disabled={!importFile || importMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {importMutation.isPending ? 'Importando...' : 'Importar'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
