# Plan: Panel de Administración Web para Colegios

## Resumen Ejecutivo

Panel web de administración para que los colegios gestionen su cafetería.

**Estado Actual (Enero 2026):**
- ✅ Backend API con middleware de autorización
- ✅ App Móvil para apoderados
- ✅ Base de datos completa
- ✅ Panel Admin Web (IMPLEMENTADO)
- ✅ Middleware de autorización por roles (IMPLEMENTADO)

## Progreso de Implementación

| Componente | Estado |
|------------|--------|
| Middleware de autorización | ✅ Completado |
| Login admin | ✅ Completado |
| Layout dashboard | ✅ Completado |
| CRUD Menú | ✅ Completado |
| CRUD Paquetes | ✅ Completado |
| Vista transacciones | ✅ Completado |
| Vista estudiantes | ✅ Completado |

---

## Estructura del Proyecto

```
apps/admin/                     # Nueva app Next.js
├── src/
│   ├── app/
│   │   ├── (auth)/login/       # Login admin
│   │   ├── (dashboard)/        # Páginas protegidas
│   │   │   ├── page.tsx        # Dashboard
│   │   │   ├── menu/           # CRUD menú
│   │   │   ├── packages/       # CRUD paquetes recarga
│   │   │   ├── transactions/   # Ver transacciones
│   │   │   ├── students/       # Ver estudiantes
│   │   │   ├── settings/       # Configuración
│   │   │   └── reports/        # Reportes
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── forms/              # Formularios
│   │   ├── tables/             # Tablas de datos
│   │   └── layout/             # Sidebar, Header
│   ├── hooks/queries/          # React Query hooks
│   ├── lib/api.ts              # Cliente API
│   ├── store/authStore.ts      # Zustand
│   └── middleware.ts           # Protección rutas
├── package.json
└── tailwind.config.js
```

**Stack:** Next.js 14 + TailwindCSS + shadcn/ui + Zustand + React Query

---

## Features por Prioridad

### FASE 1: Core (Obligatorias)
| Feature | Descripción |
|---------|-------------|
| **Middleware Roles** | Autorización por rol en backend |
| **Login Admin** | Autenticación para school_admin |
| **CRUD Menú** | Crear/editar/eliminar productos |
| **CRUD Paquetes** | Gestionar paquetes de recarga |
| **Ver Transacciones** | Lista con paginación y filtros |
| **Ver Estudiantes** | Lista de estudiantes y saldos |

### FASE 2: Importantes
| Feature | Descripción |
|---------|-------------|
| **Dashboard Stats** | Gráficos de ventas y métricas |
| **Configuración** | Ajustes de cafetería |
| **Exportar CSV** | Exportar transacciones |

### FASE 3: Nice-to-have
| Feature | Descripción |
|---------|-------------|
| Gráficos avanzados | Tendencias, comparativas |
| Alertas | Notificaciones de bajo saldo |
| Dark mode | Tema oscuro |

---

## Plan de Implementación

### FASE 1: Setup y Autenticación

#### Backend
1. Crear `packages/api/src/middleware/authorization.ts`
   - `requireRole(...roles)` - verificar rol del usuario
   - `requireSchoolAccess()` - verificar acceso al colegio
2. Modificar `auth.service.ts`:
   - Incluir `schoolId` en token JWT para admins
3. Proteger endpoints existentes con roles

#### Frontend
1. Setup Next.js en `apps/admin/`
2. Configurar TailwindCSS + shadcn/ui
3. Crear página de login
4. Implementar authStore (Zustand)
5. Crear cliente API con interceptores
6. Middleware Next.js para protección de rutas
7. Layout base (Sidebar + Header)

---

### FASE 2: Features Core

#### Backend
1. Crear rutas en `packages/api/src/routes/admin/`:
   - `GET /admin/dashboard` - stats agregados
   - `GET /admin/schools/:id/students` - estudiantes del colegio
   - `GET /admin/schools/:id/transactions` - transacciones paginadas

#### Frontend
1. **CRUD Menú** (`/menu`)
   - Tabla con items del menú
   - Formulario crear/editar
   - Disponibilidad por día/horario

2. **CRUD Paquetes** (`/packages`)
   - Tabla con paquetes
   - Formulario crear/editar (balance vs tickets)

3. **Transacciones** (`/transactions`)
   - Tabla con paginación
   - Filtros por fecha, estudiante, tipo

4. **Estudiantes** (`/students`)
   - Tabla con saldo actual
   - Detalle de transacciones por estudiante

---

### FASE 3: Dashboard y Reportes

#### Backend
1. Endpoint `GET /admin/reports/sales` con agregaciones
2. Endpoint `GET /admin/transactions/export` para CSV

#### Frontend
1. **Dashboard** (`/`)
   - Cards con métricas (ventas hoy, semana, mes)
   - Gráfico de ventas (Recharts)
   - Últimas transacciones

2. **Configuración** (`/settings`)
   - Modelo de negocio (tickets/balance/mixto)
   - Permitir saldo negativo
   - Límite de alerta bajo saldo

3. **Reportes** (`/reports`)
   - Exportar a CSV
   - Filtros de fecha

---

## Archivos Críticos a Modificar

| Archivo | Cambio |
|---------|--------|
| `packages/api/src/services/auth.service.ts` | Agregar schoolId al token para admins |
| `packages/api/src/routes/menu.routes.ts` | Agregar verificación de roles |
| `packages/api/src/routes/payments.routes.ts` | Proteger CRUD de paquetes |

## Archivos Nuevos a Crear

| Archivo | Propósito |
|---------|-----------|
| `packages/api/src/middleware/authorization.ts` | Middleware de roles |
| `packages/api/src/routes/admin/*.ts` | Rutas específicas admin |
| `apps/admin/*` | Toda la app web |

---

## Verificación y Testing

### Flujos a Probar End-to-End

1. **Login Admin**
   - Login con credenciales de school_admin
   - Redirección a dashboard
   - Token JWT con schoolId

2. **Gestión de Menú**
   - Crear item nuevo
   - Editar precio/disponibilidad
   - Eliminar item
   - Verificar en app móvil que aparece

3. **Gestión de Paquetes**
   - Crear paquete de recarga (balance)
   - Crear paquete de tickets
   - Verificar en app móvil

4. **Transacciones**
   - Ver lista de transacciones
   - Filtrar por fecha
   - Exportar a CSV

5. **Flujo Completo**
   - Admin crea producto en menú
   - Apoderado ve producto en app móvil
   - Apoderado compra producto
   - Admin ve transacción en panel
   - Saldo del colegio se actualiza

### Comandos de Verificación

```bash
# Iniciar backend
npm run dev:api

# Iniciar panel admin
cd apps/admin && npm run dev

# Correr tests
npm run test

# Verificar build
npm run build
```

---

## Dependencias Entre Tareas

```
[Middleware Roles Backend] ──────┐
                                 │
                                 ▼
                    [Login Admin Web] ────────┐
                                              │
         ┌────────────────┬───────────────────┼────────────────┐
         ▼                ▼                   ▼                ▼
    [CRUD Menú]    [CRUD Paquetes]    [Transacciones]    [Estudiantes]
         │                │                   │                │
         └────────────────┴───────────────────┴────────────────┘
                                   │
                                   ▼
                          [Dashboard Stats]
                                   │
                                   ▼
                         [Reportes/Export]
```

**Tareas Paralelas:**
- CRUD Menú, CRUD Paquetes, Transacciones, Estudiantes (después de auth)
- Tests backend mientras se desarrolla frontend
- Documentación mientras se hace testing
