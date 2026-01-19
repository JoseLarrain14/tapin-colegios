# AGENTS.md - Casino Escolar Tap In

Este archivo contiene patrones, convenciones y aprendizajes del proyecto.
Ralph actualiza este archivo después de cada iteración.

## Tech Stack

- **API**: Fastify + TypeScript + Prisma (SQLite)
- **Mobile**: React Native + Expo + TypeScript
- **Admin**: Next.js 14 + TypeScript + TailwindCSS
- **Monorepo**: npm workspaces

## Estructura del Proyecto

```
packages/api/           # Backend API
├── src/routes/         # Endpoints por dominio
├── src/services/       # Lógica de negocio
├── prisma/schema.prisma # Modelos de BD

apps/mobile/            # App React Native
├── app/                # Pantallas (Expo Router)
├── components/         # Componentes reutilizables
├── store/              # Zustand stores

apps/admin/             # Panel admin Next.js
├── app/(dashboard)/    # Páginas del dashboard
├── app/(auth)/         # Login
├── components/         # Componentes UI
```

## Convenciones

### API (Fastify)
- Rutas en `packages/api/src/routes/[domain].routes.ts`
- Validación con Zod schemas
- Auth via JWT en header `Authorization: Bearer <token>`
- Roles: `guardian`, `school_admin`, `super_admin`, `cafeteria_operator`

### Admin (Next.js)
- Páginas en `apps/admin/app/(dashboard)/[page]/page.tsx`
- Auth token en `localStorage.getItem('adminToken')`
- API base: `process.env.NEXT_PUBLIC_API_URL` o `http://localhost:3000`
- Usar componentes de `@/components/ui/`

### Mobile (React Native)
- Pantallas en `apps/mobile/app/`
- Auth store en `apps/mobile/store/auth.ts`
- API calls via fetch con token del store

## Comandos

```bash
# Desarrollo
pnpm dev:api          # API en puerto 3000
pnpm dev:admin        # Admin en puerto 3001
pnpm dev:mobile       # Expo

# Build
pnpm build            # Todo
pnpm build:api        # Solo API
pnpm build:admin      # Solo admin

# Tests
pnpm test             # Todos los tests
pnpm lint             # Linting
```

## Gotchas

- El admin usa localStorage para auth, no cookies
- SQLite no soporta algunas operaciones de Prisma (ej: createMany con skipDuplicates)
- En Windows, usar Git Bash para scripts bash

## Aprendizajes de Ralph

### Iteración 1 - Casino Funcional (Enero 2026)

#### Patrones de Autenticación
- Usar `verifyAuth()` helper para verificar JWT, luego verificar rol manualmente
- Para `school_admin`, obtener `schoolId` desde tabla `SchoolAdmin` via `getSchoolAdminSchoolId()`
- Token decodificado tiene: `{ userId, role, schoolId? }`

#### Endpoints Admin
- `GET /api/v1/admin/students` - Lista estudiantes del colegio del admin
- `POST /api/v1/admin/students` - Crear estudiante con wallet
- `POST /api/v1/admin/students/import` - Importar desde Excel/CSV
- `GET /api/v1/admin/config` - Obtener school y cafeteria del admin

#### Endpoints Casino/POS
- `POST /api/v1/casino/consume` - Marcar consumo de ticket
- `GET /api/v1/casino/consumptions` - Historial de consumos del día

#### Endpoints Estudiantes (Guardian)
- `GET /api/v1/students/search-by-rut/:rut` - Buscar estudiante existente
- `POST /api/v1/students/link` - Vincular estudiante a apoderado
- `GET /api/v1/payments/packages/school/:schoolId` - Paquetes por colegio

#### Validación RUT Chileno
```typescript
function calculateVerificationDigit(rutNumber: string): string {
  let sum = 0, multiplier = 2;
  for (let i = rutNumber.length - 1; i >= 0; i--) {
    sum += parseInt(rutNumber[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
}
```

#### Soluciones a Problemas Comunes

**Next.js useSearchParams() error:**
```tsx
// Error: useSearchParams() should be wrapped in Suspense
// Solución: Extraer componente y envolver en Suspense
function FormContent() {
  const params = useSearchParams()
  // ...
}
export default function Page() {
  return <Suspense fallback={<Loading/>}><FormContent/></Suspense>
}
```

**Mobile pasaba schoolId pero API esperaba cafeteriaId:**
- Solución: Crear endpoint `/payments/packages/school/:schoolId` que encuentra cafeteria automáticamente

**Multipart file upload en Fastify:**
```typescript
import multipart from '@fastify/multipart';
await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } });
const file = await request.file();
const buffer = await file.toBuffer();
```

**JSX conditional con múltiples elementos:**
```tsx
// Usar Fragment para envolver múltiples elementos
{condition && (
  <>
    <Component1 />
    <Component2 />
  </>
)}
```

#### Estructura de Tickets
- Tabla `StudentTicket` con `ticketType` (ej: "almuerzo") y `quantity`
- Consumo crea `Transaction` con `ticketsUsed` JSON field
- Un estudiante puede tener múltiples tipos de tickets
