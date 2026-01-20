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

### Iteración 2 - Sistema de Transacciones (Enero 2026)

#### Combinar Múltiples Fuentes de Datos
```typescript
// Query en paralelo de diferentes tablas
const [transactions, walletLogs, payments] = await Promise.all([
  prisma.transaction.findMany({ ... }),
  prisma.walletLog.findMany({ ... }),
  prisma.payment.findMany({ ... }),
]);

// Normalizar a formato común y ordenar
const normalized = [...txNormalized, ...logsNormalized, ...paymentsNormalized];
normalized.sort((a, b) => b.date.getTime() - a.date.getTime());
```

#### Exportar CSV con BOM para Excel
```typescript
const csvContent = '\uFEFF' + [headers, ...rows]
  .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  .join('\n');

reply
  .header('Content-Type', 'text/csv; charset=utf-8')
  .header('Content-Disposition', `attachment; filename="archivo.csv"`)
  .send(csvContent);
```

#### API Client con responseType blob
```typescript
// Para descargas de archivos
export: (params) => api.get('/admin/transactions/export', {
  params,
  responseType: 'blob'
}),
```

### Iteración 3 - Mejoras Admin Panel (Enero 2026)

#### Filtrado UI Basado en Rol con Spread Operator
```typescript
// Ocultar elementos según rol del usuario
const isSchoolAdmin = user?.role === 'school_admin';

const statsCards = [
  // Card solo visible para super_admin
  ...(!isSchoolAdmin ? [{
    label: 'Colegios Activos',
    icon: School,
    value: stats.activeSchools
  }] : []),
  // Cards visibles para todos
  { label: 'Estudiantes Activos', icon: GraduationCap, value: stats.activeStudents },
];

// También aplica para navegación
const navItems = [
  ...(!isSchoolAdmin ? [{ href: '/schools', label: 'Colegios' }] : []),
  { href: '/students', label: 'Estudiantes' },
];
```

#### Validación RUT con Mensaje Detallado (Mejorado)
```typescript
// Backend: Función que retorna dígito esperado
function validateRutWithDetails(rut: string): {
  valid: boolean;
  expectedDigit?: string;
  message?: string
} {
  const [number, providedDigit] = rut.split('-');
  const calculatedDigit = calculateVerificationDigit(number);

  if (providedDigit.toUpperCase() !== calculatedDigit) {
    return {
      valid: false,
      expectedDigit: calculatedDigit,
      message: `RUT inválido. El dígito verificador correcto es ${calculatedDigit}`
    };
  }
  return { valid: true };
}

// Zod schema con superRefine para mensajes personalizados
rut: z.string().superRefine((val, ctx) => {
  const result = validateRutWithDetails(val);
  if (!result.valid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: result.message,
    });
  }
}),
```

```tsx
// Frontend: Input con feedback visual
const [rutValid, setRutValid] = useState<boolean | null>(null);
const [rutError, setRutError] = useState('');

const handleRutChange = (value: string) => {
  setRut(value);
  if (value.includes('-')) {
    const result = validateRut(value);
    setRutValid(result.valid);
    setRutError(result.valid ? 'RUT válido' : `Dígito esperado: ${result.expectedDigit}`);
  }
};

// Input con borde verde/rojo según validez
<input
  className={`border ${
    rutValid === null ? 'border-gray-300' :
    rutValid ? 'border-green-500' : 'border-red-500'
  }`}
  onChange={(e) => handleRutChange(e.target.value)}
/>
```

#### Métricas Agregadas con Prisma
```typescript
// Agregar métricas de balance y tickets
const [walletBalance, ticketSum] = await Promise.all([
  prisma.wallet.aggregate({
    where: schoolFilter,
    _sum: { balance: true }
  }),
  prisma.studentTicket.aggregate({
    where: schoolFilter,
    _sum: { quantity: true }
  }),
]);

// Calcular cambio porcentual vs período anterior
const calculateChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};
```

#### Playwright E2E para Verificación Visual
```typescript
// Configuración: playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'on', // Screenshot en cada paso
  },
});

// Test con screenshots para verificación
test('Dashboard shows correct cards for school_admin', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', 'admin@colegio.cl');
  await page.fill('#password', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');

  // Screenshot de evidencia
  await page.screenshot({
    path: 'screenshots/dashboard.png',
    fullPage: true
  });

  // Verificar elementos visibles/ocultos
  await expect(page.locator('text=Estudiantes Activos')).toBeVisible();
  await expect(page.locator('text=Colegios Activos')).not.toBeVisible();
});
```

#### Endpoints de Transacciones
- `GET /api/v1/admin/transactions` - Lista unificada con filtros
- `GET /api/v1/admin/transactions/stats` - Métricas agregadas del día
- `GET /api/v1/admin/transactions/export` - Exportar a CSV

#### Tips de Debugging
- Si Playwright tiene problemas con puertos, verificar que API corre en 3000 y Admin en 3001 (o viceversa)
- Usar `taskkill /F /IM node.exe` en Windows para matar procesos zombie
- Los tests de super_admin fallan si el usuario no existe en la BD del seed
