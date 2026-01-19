# Ejemplos de Código - Panel Admin

## Tabla de Contenidos

1. [Uso de React Query](#uso-de-react-query)
2. [Uso de Auth Store](#uso-de-auth-store)
3. [Llamadas al API](#llamadas-al-api)
4. [Formularios](#formularios)
5. [Componentes Reutilizables](#componentes-reutilizables)

---

## Uso de React Query

### Fetch de Datos (Query)

```tsx
'use client'

import { useSchools } from '@/lib/queries'

export default function SchoolsList() {
  const { data, isLoading, error, refetch } = useSchools({
    page: 1,
    limit: 10,
  })

  if (isLoading) return <div>Cargando...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      {data.schools.map((school) => (
        <div key={school.id}>{school.name}</div>
      ))}
      <button onClick={() => refetch()}>Recargar</button>
    </div>
  )
}
```

### Mutación de Datos (Create/Update/Delete)

```tsx
'use client'

import { useCreateSchool } from '@/lib/queries'
import { useState } from 'react'

export default function CreateSchoolForm() {
  const [name, setName] = useState('')
  const createSchool = useCreateSchool()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createSchool.mutateAsync({ name, address: '' })
      alert('Colegio creado!')
      setName('')
    } catch (error) {
      alert('Error al crear colegio')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre del colegio"
      />
      <button disabled={createSchool.isPending}>
        {createSchool.isPending ? 'Creando...' : 'Crear'}
      </button>
    </form>
  )
}
```

---

## Uso de Auth Store

### Obtener Datos del Usuario

```tsx
'use client'

import { useAuthStore } from '@/store/authStore'

export default function UserProfile() {
  const { user, isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <div>No autenticado</div>
  }

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <p>Rol: {user.role}</p>
    </div>
  )
}
```

### Login Programático

```tsx
'use client'

import { useAuthStore } from '@/store/authStore'
import { apiClient } from '@/lib/api'

export default function LoginButton() {
  const { login } = useAuthStore()

  const handleLogin = async () => {
    try {
      const response = await apiClient.auth.login(
        'admin@colegio.cl',
        'admin123'
      )
      const { user, token } = response.data

      login(user, token)

      // Guardar en cookie para middleware
      document.cookie = `tapin-auth-token=${token}; path=/; max-age=2592000`

      // Redirigir
      window.location.href = '/dashboard'
    } catch (error) {
      console.error('Login error:', error)
    }
  }

  return <button onClick={handleLogin}>Login</button>
}
```

### Logout

```tsx
'use client'

import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const { logout } = useAuthStore()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    document.cookie = 'tapin-auth-token=; path=/; max-age=0'
    router.push('/login')
  }

  return <button onClick={handleLogout}>Cerrar Sesión</button>
}
```

---

## Llamadas al API

### Uso del API Client Directo

```tsx
import { apiClient } from '@/lib/api'

// GET request
const getSchools = async () => {
  try {
    const response = await apiClient.schools.list({ page: 1, limit: 10 })
    console.log(response.data)
  } catch (error) {
    console.error(error)
  }
}

// POST request
const createSchool = async () => {
  try {
    const response = await apiClient.schools.create({
      name: 'Colegio Ejemplo',
      address: 'Calle 123',
    })
    console.log(response.data)
  } catch (error) {
    console.error(error)
  }
}

// PATCH request
const updateSchool = async (id: string) => {
  try {
    const response = await apiClient.schools.update(id, {
      name: 'Nuevo Nombre',
    })
    console.log(response.data)
  } catch (error) {
    console.error(error)
  }
}

// DELETE request
const deleteSchool = async (id: string) => {
  try {
    await apiClient.schools.delete(id)
    console.log('Deleted')
  } catch (error) {
    console.error(error)
  }
}
```

### Agregar Nuevo Endpoint al API Client

En `src/lib/api.ts`:

```typescript
export const apiClient = {
  // ... existing endpoints

  // Nuevo endpoint
  stats: {
    dashboard: () => api.get('/stats/dashboard'),
    schoolStats: (schoolId: string) => api.get(`/stats/school/${schoolId}`),
  },
}
```

Luego crear el hook de React Query en `src/lib/queries.ts`:

```typescript
export function useDashboardStats() {
  return useQuery({
    queryKey: ['stats', 'dashboard'],
    queryFn: async () => {
      const response = await apiClient.stats.dashboard()
      return response.data
    },
  })
}
```

---

## Formularios

### Formulario Simple sin Librería

```tsx
'use client'

import { useState } from 'react'
import { useCreateSchool } from '@/lib/queries'

export default function SchoolForm() {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
  })

  const createSchool = useCreateSchool()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createSchool.mutateAsync(formData)
      alert('Colegio creado exitosamente')
      setFormData({ name: '', address: '', phone: '' })
    } catch (error) {
      alert('Error al crear colegio')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Nombre del Colegio
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Dirección</label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          className="w-full px-4 py-2 border rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Teléfono</label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="w-full px-4 py-2 border rounded-md"
        />
      </div>

      <button
        type="submit"
        disabled={createSchool.isPending}
        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {createSchool.isPending ? 'Creando...' : 'Crear Colegio'}
      </button>
    </form>
  )
}
```

### Instalación de React Hook Form (Opcional)

```bash
npm install react-hook-form zod @hookform/resolvers
```

Luego puedes usar shadcn/ui form:

```bash
npx shadcn-ui@latest add form
```

---

## Componentes Reutilizables

### Loading Spinner

```tsx
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <div className="flex items-center justify-center py-8">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-b-2 border-blue-600`}
      />
    </div>
  )
}
```

### Empty State

```tsx
import { Icon } from 'lucide-react'

interface EmptyStateProps {
  icon: Icon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border p-12 text-center">
      <Icon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
```

### Error Alert

```tsx
interface ErrorAlertProps {
  message: string
  onRetry?: () => void
}

export function ErrorAlert({ message, onRetry }: ErrorAlertProps) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
            Error
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  )
}
```

### Stat Card

```tsx
import { Icon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: Icon
  change?: string
  color?: string
}

export function StatCard({
  label,
  value,
  icon: Icon,
  change,
  color = 'bg-blue-500',
}: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className={`${color} p-3 rounded-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {value}
        </p>
        {change && (
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">
            {change}
          </p>
        )}
      </div>
    </div>
  )
}
```

### Uso de Stat Card

```tsx
import { StatCard } from '@/components/stat-card'
import { School, Users } from 'lucide-react'

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        label="Colegios Activos"
        value="12"
        icon={School}
        change="+2 este mes"
        color="bg-blue-500"
      />
      <StatCard
        label="Usuarios Totales"
        value="1,234"
        icon={Users}
        change="+89 este mes"
        color="bg-green-500"
      />
    </div>
  )
}
```

---

## Paginación Reutilizable

```tsx
interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 border rounded-md disabled:opacity-50"
      >
        Anterior
      </button>
      <span className="text-sm">
        Página {currentPage} de {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="px-4 py-2 border rounded-md disabled:opacity-50"
      >
        Siguiente
      </button>
    </div>
  )
}
```

---

## Modal/Dialog Ejemplo

Instalar componente dialog de shadcn/ui:

```bash
npx shadcn-ui@latest add dialog
```

Luego usar:

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function DeleteConfirmDialog({ onConfirm, itemName }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button>Eliminar</button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Estás seguro?</DialogTitle>
          <DialogDescription>
            Esto eliminará permanentemente "{itemName}". Esta acción no se puede
            deshacer.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 border rounded-md">Cancelar</button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md"
          >
            Eliminar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Tips de Performance

### 1. Memoización de Componentes

```tsx
import { memo } from 'react'

const SchoolCard = memo(({ school }) => {
  return <div>{school.name}</div>
})
```

### 2. React Query con Stale Time

```tsx
const { data } = useSchools({
  // Cache por 5 minutos
  staleTime: 5 * 60 * 1000,
})
```

### 3. Lazy Loading de Imágenes

```tsx
import Image from 'next/image'

<Image
  src="/school-logo.png"
  alt="Logo"
  width={100}
  height={100}
  loading="lazy"
/>
```

### 4. Code Splitting con Dynamic Import

```tsx
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Cargando...</p>,
})
```
