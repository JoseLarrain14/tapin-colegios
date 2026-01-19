# Panel Admin - Guía de Setup

## Inicio Rápido

### 1. Instalar dependencias
```bash
cd apps/admin
pnpm install
```

### 2. Configurar entorno
```bash
cp .env.example .env.local
# Editar: NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

### 3. Ejecutar
```bash
pnpm dev
# Panel en http://localhost:3000
```

### 4. Login
- **URL:** http://localhost:3000/login
- **Email:** admin@colegio.cl
- **Password:** admin123

---

## Stack Tecnológico

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Next.js | 14.2.5 | App Router |
| React | 18.3.1 | UI |
| TypeScript | 5.3.3 | Type Safety |
| TailwindCSS | 3.4.1 | Estilos |
| Zustand | 4.5.1 | Estado global |
| React Query | 5.24.1 | Server state |
| Axios | 1.6.7 | HTTP client |
| shadcn/ui | - | Componentes UI |
| Playwright | 1.57.0 | E2E Testing |

---

## Estructura del Proyecto

```
apps/admin/
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx     # Login
│   │   └── (dashboard)/
│   │       ├── page.tsx              # Dashboard
│   │       ├── menu/                 # CRUD menú
│   │       ├── packages/             # CRUD paquetes
│   │       ├── students/             # Estudiantes
│   │       └── transactions/         # Transacciones
│   ├── components/ui/                # shadcn/ui
│   ├── lib/
│   │   ├── api.ts                    # Cliente Axios
│   │   └── queries.ts                # React Query hooks
│   ├── store/authStore.ts            # Zustand auth
│   └── middleware.ts                 # Protección rutas
├── tests/                            # Playwright tests
└── playwright.config.ts              # Config E2E
```

---

## Páginas Disponibles

| Ruta | Descripción |
|------|-------------|
| `/login` | Autenticación |
| `/` | Dashboard con estadísticas |
| `/menu` | Gestión de productos del menú |
| `/menu/new` | Crear producto |
| `/menu/[id]` | Editar producto |
| `/packages` | Gestión de paquetes de recarga |
| `/packages/new` | Crear paquete |
| `/packages/[id]` | Editar paquete |
| `/students` | Lista de estudiantes |
| `/transactions` | Historial de transacciones |

---

## Autenticación

- JWT almacenado en localStorage y cookies
- Middleware protege rutas `/dashboard/*`
- Auth store con Zustand (persistencia)
- Interceptor Axios añade token automáticamente

---

## Cliente API

```typescript
// Usar siempre los hooks de React Query
import { useMenu, useCreateMenuItem } from '@/lib/queries';

// O el cliente directo
import { apiClient } from '@/lib/api';
await apiClient.menu.getAll();
```

---

## Comandos Útiles

```bash
# Desarrollo
pnpm dev

# Build
pnpm build

# Tests E2E
pnpm test:e2e
pnpm test:e2e:headed  # Ver navegador
pnpm test:e2e:ui      # UI mode

# Agregar componentes shadcn/ui
npx shadcn-ui@latest add [nombre]
```

---

## Troubleshooting

**Error de conexión API:**
- Verificar que API corre en puerto 4000
- Verificar NEXT_PUBLIC_API_URL en .env.local

**Error 401:**
- Limpiar localStorage
- Re-login

**Styles no cargan:**
```bash
rm -rf .next && pnpm dev
```
