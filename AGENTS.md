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

(Ralph agregará aprendizajes aquí después de cada iteración)
