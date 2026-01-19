# Panel Admin - Setup Completo

## Resumen

Se ha configurado exitosamente el panel de administración Next.js en `apps/admin/` con toda la estructura base, autenticación, y ejemplos de uso.

## Archivos Creados

### Configuración Base

- `apps/admin/package.json` - Dependencias y scripts
- `apps/admin/tsconfig.json` - Configuración TypeScript
- `apps/admin/next.config.js` - Configuración Next.js
- `apps/admin/tailwind.config.js` - Configuración Tailwind
- `apps/admin/postcss.config.js` - Configuración PostCSS
- `apps/admin/.eslintrc.json` - Configuración ESLint
- `apps/admin/components.json` - Configuración shadcn/ui
- `apps/admin/.gitignore` - Archivos ignorados
- `apps/admin/.env.example` - Variables de entorno ejemplo

### Documentación

- `apps/admin/README.md` - Documentación general
- `apps/admin/INSTALLATION.md` - Instrucciones de instalación
- `SETUP-ADMIN.md` - Este archivo

### App Router

**Layouts:**
- `src/app/layout.tsx` - Root layout con providers
- `src/app/providers.tsx` - React Query provider
- `src/app/page.tsx` - Home page (redirect)
- `src/app/globals.css` - Estilos globales

**Auth Routes:**
- `src/app/(auth)/layout.tsx` - Auth layout
- `src/app/(auth)/login/page.tsx` - Login page (FUNCIONAL)

**Dashboard Routes:**
- `src/app/(dashboard)/layout.tsx` - Dashboard layout con sidebar
- `src/app/(dashboard)/page.tsx` - Dashboard home
- `src/app/(dashboard)/schools/page.tsx` - Ejemplo CRUD de colegios

### Librerías y Utilidades

- `src/lib/utils.ts` - Funciones de utilidad (cn, formatters)
- `src/lib/api.ts` - Cliente Axios configurado con interceptores
- `src/lib/queries.ts` - React Query hooks (useSchools, useUsers, etc.)

### Estado Global

- `src/store/authStore.ts` - Zustand store para autenticación

### Middleware

- `src/middleware.ts` - Protección de rutas Next.js

### Componentes UI

- `src/components/ui/button.tsx` - Button component (shadcn/ui)
- `src/components/ui/card.tsx` - Card components (shadcn/ui)

## Stack Tecnológico Implementado

- **Next.js 14.2.5** - App Router
- **React 18.3.1** - UI Library
- **TypeScript 5.3.3** - Type Safety
- **TailwindCSS 3.4.1** - Styling
- **Zustand 4.5.1** - Global State
- **React Query 5.24.1** - Server State
- **Axios 1.6.7** - HTTP Client
- **Radix UI** - Headless components
- **Lucide React** - Icons
- **shadcn/ui** - UI Components

## Características Implementadas

### Autenticación

- Login funcional con email/password
- JWT token storage (localStorage + cookies)
- Auth store con Zustand (persistencia)
- Middleware de protección de rutas
- Logout con limpieza de estado

### Cliente API

- Axios configurado con:
  - Base URL configurable
  - Interceptor de autenticación (JWT)
  - Interceptor de errores 401
  - Timeout de 15 segundos
- Endpoints organizados por entidad:
  - auth (login, me, logout)
  - schools (CRUD completo)
  - users (CRUD completo)
  - transactions (list, getById)
  - menuItems (CRUD completo)

### React Query

- Provider configurado
- Hooks personalizados para cada entidad
- Query keys organizados
- Invalidación automática de cache
- Mutations con optimistic updates
- Estados de loading/error manejados

### UI/UX

- Layouts responsivos
- Sidebar colapsable en mobile
- Dark mode ready (variables CSS)
- Componentes shadcn/ui base
- Estilos Tailwind configurados
- Scrollbar personalizado

### Ejemplo CRUD

- Página de listado de colegios (`/schools`)
- Búsqueda y filtros
- Paginación
- Delete con confirmación
- Estados vacíos
- Loading states
- Error handling

## Próximos Pasos

### 1. Instalar Dependencias

```bash
# Desde la raíz del monorepo
npm install
```

### 2. Configurar Variables de Entorno

```bash
cd apps/admin
cp .env.example .env.local
```

Editar `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### 3. Ejecutar en Desarrollo

```bash
# Desde la raíz
npm run dev:admin

# El panel estará en http://localhost:3000
```

### 4. Login

Usa las credenciales del seed del API o crea un usuario admin.

### 5. Desarrollo Continuo

Archivos a crear según necesidad:

**Páginas CRUD:**
- `src/app/(dashboard)/schools/new/page.tsx` - Crear colegio
- `src/app/(dashboard)/schools/[id]/page.tsx` - Editar colegio
- `src/app/(dashboard)/users/page.tsx` - Listar usuarios
- `src/app/(dashboard)/users/new/page.tsx` - Crear usuario
- `src/app/(dashboard)/users/[id]/page.tsx` - Editar usuario
- `src/app/(dashboard)/menu-items/page.tsx` - Gestión de menú
- `src/app/(dashboard)/transactions/page.tsx` - Historial

**Componentes adicionales:**
```bash
npx shadcn-ui@latest add input
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add form
npx shadcn-ui@latest add select
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add dropdown-menu
```

**Features avanzados:**
- [ ] Subida de imágenes
- [ ] Exportación a Excel/PDF
- [ ] Gráficos con Recharts
- [ ] Notificaciones en tiempo real
- [ ] Filtros avanzados
- [ ] Tema dark/light toggle
- [ ] Tests con Jest/Vitest
- [ ] Storybook para componentes

## Estructura de Archivos Final

```
apps/admin/
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── schools/
│   │   │       └── page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── providers.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── ui/
│   │       ├── button.tsx
│   │       └── card.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   ├── queries.ts
│   │   └── utils.ts
│   ├── store/
│   │   └── authStore.ts
│   └── middleware.ts
├── .env.example
├── .eslintrc.json
├── .gitignore
├── components.json
├── INSTALLATION.md
├── next.config.js
├── package.json
├── postcss.config.js
├── README.md
├── tailwind.config.js
└── tsconfig.json
```

## Scripts Agregados al Root

En `package.json` del root:

```json
{
  "scripts": {
    "dev:admin": "npm run dev --workspace=apps/admin",
    "build:admin": "npm run build --workspace=apps/admin"
  }
}
```

## Convenciones de Código

### Componentes

- Use client components con `'use client'` directive
- Functional components con TypeScript
- Props interfaces exportadas
- JSDoc comments para funciones públicas

### Hooks

- Custom hooks prefijados con `use`
- React Query hooks en `src/lib/queries.ts`
- Store hooks desde `src/store/`

### Estilos

- Tailwind classes primero
- Use `cn()` helper para conditional classes
- CSS modules solo si es necesario
- Variables CSS en `globals.css`

### API Calls

- NUNCA llamar axios directamente
- SIEMPRE usar `apiClient` o React Query hooks
- Error handling con try/catch
- Loading states manejados por React Query

### Rutas

- Grupos de rutas con `(nombre)`
- Server components por defecto
- Client components solo cuando sea necesario
- Layouts para estructura compartida

## Troubleshooting

Ver `apps/admin/INSTALLATION.md` sección Troubleshooting.

## Contacto

Si encuentras problemas o tienes preguntas sobre la arquitectura, revisa:
1. README.md en apps/admin
2. INSTALLATION.md en apps/admin
3. Comentarios en el código fuente
