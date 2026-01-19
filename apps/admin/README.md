# Tap In Colegios - Panel de Administración

Panel web de administración para la plataforma de gestión de cafeterías escolares.

## Stack Tecnológico

- **Next.js 14** - Framework React con App Router
- **TypeScript** - Tipado estático
- **TailwindCSS** - Estilos utilitarios
- **shadcn/ui** - Componentes UI
- **Zustand** - Estado global
- **React Query** - Server state management
- **Axios** - Cliente HTTP

## Estructura del Proyecto

```
apps/admin/
├── src/
│   ├── app/                    # App Router
│   │   ├── (auth)/            # Grupo de rutas de autenticación
│   │   │   └── login/         # Página de login
│   │   ├── (dashboard)/       # Grupo de rutas del dashboard
│   │   │   └── page.tsx       # Dashboard principal
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Página principal (redirect)
│   │   ├── providers.tsx      # Proveedores de contexto
│   │   └── globals.css        # Estilos globales
│   ├── lib/                   # Utilidades
│   │   ├── api.ts            # Cliente API
│   │   └── utils.ts          # Funciones de utilidad
│   ├── store/                # Stores de Zustand
│   │   └── authStore.ts      # Store de autenticación
│   └── middleware.ts         # Middleware de Next.js
├── public/                    # Archivos estáticos
└── package.json
```

## Comandos

```bash
# Desarrollo (desde la raíz del proyecto)
pnpm --filter @tapin/admin dev

# O usando npm desde apps/admin
cd apps/admin
npm run dev

# Build producción
npm run build

# Iniciar producción
npm run start

# Linter
npm run lint
```

## Troubleshooting

### Error 500 en archivos estáticos

Si ves errores 500 en archivos como `webpack.js`, `page.js`, etc:

1. **Limpiar caché de Next.js:**
   ```bash
   cd apps/admin
   rm -rf .next
   ```

2. **Matar procesos duplicados:**
   - El error suele ocurrir cuando hay múltiples instancias del servidor corriendo
   - En Windows: `netstat -ano | findstr :3000` y luego `taskkill //F //PID [PID]`
   - En Linux/Mac: `lsof -ti:3000 | xargs kill`

3. **Reinstalar dependencias:**
   ```bash
   # Desde la raíz del monorepo
   pnpm install
   ```

4. **Iniciar servidor limpiamente:**
   ```bash
   pnpm --filter @tapin/admin dev
   ```

### Puerto en uso

Si el puerto 3000 está ocupado, Next.js automáticamente intentará usar 3001, 3002, etc. Verifica en qué puerto se inició:

```bash
netstat -ano | findstr :3000
```

## Variables de Entorno

Crea un archivo `.env.local` basado en `.env.example`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Instalación

Desde la raíz del monorepo:

```bash
# Instalar dependencias
npm install

# Ejecutar solo el admin
npm run dev:admin
```

## Autenticación

El panel usa JWT tokens almacenados en:
- **localStorage**: Para persistencia del estado (vía Zustand)
- **Cookies**: Para validación en middleware de Next.js

El middleware protege todas las rutas excepto `/login`.

## API Client

El cliente API (`src/lib/api.ts`) está configurado para:
- Agregar automáticamente el token JWT a las requests
- Manejar errores 401 (logout automático)
- Timeout de 15 segundos
- Base URL configurable via env vars

### Uso del API Client

```typescript
import { apiClient } from '@/lib/api'

// Login
const { data } = await apiClient.auth.login(email, password)

// Listar colegios
const { data } = await apiClient.schools.list({ page: 1, limit: 10 })

// Crear usuario
const { data } = await apiClient.users.create(userData)
```

## Store de Autenticación

```typescript
import { useAuthStore } from '@/store/authStore'

function Component() {
  const { user, token, isAuthenticated, login, logout } = useAuthStore()

  // Usar estado...
}
```

## Componentes

Por ahora el proyecto usa componentes nativos HTML estilizados con Tailwind. Para agregar componentes de shadcn/ui:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
# etc...
```

## Rutas Protegidas

El middleware (`src/middleware.ts`) protege automáticamente todas las rutas bajo `/(dashboard)`. Si el usuario no está autenticado, se redirige a `/login`.

## Próximos Pasos

- [ ] Agregar componentes shadcn/ui
- [ ] Implementar páginas CRUD para colegios
- [ ] Implementar páginas CRUD para usuarios
- [ ] Implementar gestión de menú
- [ ] Implementar vista de transacciones
- [ ] Agregar filtros y búsqueda
- [ ] Implementar reportes y analytics
- [ ] Agregar tests unitarios
- [ ] Configurar CI/CD
