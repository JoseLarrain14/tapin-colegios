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

### Iteración 4 - Sincronización Wallet-Tickets (Enero 2026)

#### Problema
El sistema tenía dos modelos separados que **no estaban sincronizados**:
- `Wallet.balance` - saldo monetario del estudiante
- `StudentTicket.quantity` - cantidad de tickets disponibles

**Bug:** Al consumir un ticket en casino, solo bajaban los tickets pero el balance permanecía igual.

#### Solución: Campo pricePerTicket
Agregar `pricePerTicket` al modelo `StudentTicket` para trackear el precio unitario de cada ticket.

```prisma
model StudentTicket {
  id             String    @id @default(uuid())
  studentId      String    @map("student_id")
  ticketType     String    @map("ticket_type")
  quantity       Int       @default(0)
  pricePerTicket Int       @default(0) @map("price_per_ticket")
  expiresAt      DateTime? @map("expires_at")
  // ...
}
```

#### Patrón: Precio Promedio Ponderado
Cuando un estudiante ya tiene tickets y compra más de diferente precio:

```typescript
// Al comprar paquete nuevo
const pricePerTicket = Math.floor(rechargePackage.price / rechargePackage.ticketCount);

// Si ya tiene tickets existentes, calcular promedio ponderado
if (existingTicket) {
  const totalExistingValue = existingTicket.quantity * existingTicket.pricePerTicket;
  const totalNewValue = rechargePackage.ticketCount * pricePerTicket;
  const totalQuantity = existingTicket.quantity + rechargePackage.ticketCount;
  const newPricePerTicket = Math.floor((totalExistingValue + totalNewValue) / totalQuantity);

  await tx.studentTicket.update({
    where: { id: existingTicket.id },
    data: {
      quantity: totalQuantity,
      pricePerTicket: newPricePerTicket,
    },
  });
}
```

#### Consumo de Tickets con Descuento de Balance
Al consumir un ticket, descontar su valor del wallet:

```typescript
// En casino.routes.ts - endpoint /casino/consume
const ticketValue = ticket.pricePerTicket * body.quantity;
const balanceBefore = wallet.balance;
const balanceAfter = Math.max(0, balanceBefore - ticketValue);

// Actualizar wallet
await tx.wallet.update({
  where: { id: wallet.id },
  data: { balance: balanceAfter },
});

// Crear WalletLog para auditoría
await tx.walletLog.create({
  data: {
    walletId: wallet.id,
    type: 'purchase',
    amount: -ticketValue,
    balanceBefore,
    balanceAfter,
    description: `Consumo de ${body.quantity} ticket(s) de ${body.ticketType}`,
  },
});

// Transaction con amount real (antes era 0)
await tx.transaction.create({
  data: {
    // ...
    amount: ticketValue,  // Valor monetario real del consumo
  },
});
```

#### Flujo Completo
```
Compra de Paquete:
1. Guardian paga $80,000 por paquete de 10 almuerzos
2. Se crea/actualiza StudentTicket con:
   - quantity: 10
   - pricePerTicket: 8,000 ($80,000 / 10)
3. Wallet.balance sube $80,000
4. Se crea WalletLog tipo 'deposit'

Consumo en Casino:
1. Estudiante presenta QR, operador marca 1 almuerzo
2. StudentTicket.quantity baja de 10 a 9
3. Wallet.balance baja $8,000 (pricePerTicket * 1)
4. Se crea WalletLog tipo 'purchase' con amount: -8,000
5. Se crea Transaction con amount: 8,000

Resultado: balance = quantity * pricePerTicket (siempre sincronizados)
```

#### API Response Actualizada
```typescript
// GET /students - ahora incluye valor de tickets
{
  tickets: [{
    type: "almuerzo",
    quantity: 9,
    pricePerTicket: 8000,
    totalValue: 72000,  // quantity * pricePerTicket
    expiresAt: null
  }]
}

// POST /casino/consume - incluye info de wallet
{
  success: true,
  consumption: {
    ticketValue: 8000,
    totalDeducted: 8000,
  },
  wallet: {
    previousBalance: 80000,
    newBalance: 72000,
  }
}
```

#### Mobile UI: Mostrar Valor de Tickets
```tsx
// En la tarjeta de balance del estudiante
{selectedStudent.tickets.map((ticket) => (
  <View style={styles.ticketBadge}>
    <Text style={styles.ticketText}>
      {ticket.quantity}x {ticket.type}
      {ticket.totalValue > 0 && ` (${formatCLP(ticket.totalValue)})`}
    </Text>
  </View>
))}
// Resultado: "9x almuerzo ($72,000)"
```

#### Decisiones de Diseño
| Decisión | Opción Elegida | Razón |
|----------|----------------|-------|
| Mezcla de precios | Precio promedio ponderado | Simplicidad y un solo registro por tipo |
| Datos existentes | Borrar tickets antiguos | Partir limpio sin datos inconsistentes |
| Expiración | No implementar | Complejidad fuera de scope |
| Balance negativo | Math.max(0, balance) | Evitar deudas, pero no bloquear consumo |

### Iteración 5 - Sistema de Calendario de Menú (Enero 2026)

#### Modelos Prisma para Menu Planning
```prisma
// Template reutilizable de menú
model MenuTemplate {
  id          String @id @default(uuid())
  cafeteriaId String @map("cafeteria_id")
  name        String
  description String?
  color       String? // hex color para UI
  active      Boolean @default(true)
  items       MenuTemplateItem[]
  cafeteria   Cafeteria @relation(fields: [cafeteriaId], references: [id], onDelete: Cascade)
}

// Patrón semanal (único por cafetería)
model WeeklyPattern {
  id          String @id @default(uuid())
  cafeteriaId String @unique @map("cafeteria_id")
  active      Boolean @default(true)
  days        WeeklyPatternDay[]
  cafeteria   Cafeteria @relation(fields: [cafeteriaId], references: [id], onDelete: Cascade)
}

// Asignación de menú a fecha específica
model DailyMenuAssignment {
  id          String @id @default(uuid())
  cafeteriaId String @map("cafeteria_id")
  date        DateTime
  note        String?
  items       DailyMenuAssignmentItem[]
  cafeteria   Cafeteria @relation(fields: [cafeteriaId], references: [id], onDelete: Cascade)

  @@unique([cafeteriaId, date])
  @@index([date])
}
```

#### Patrón de Resolución de Menú
```typescript
// Lógica de prioridad para determinar qué menú mostrar
// 1. Asignación específica para la fecha
// 2. Patrón semanal para el día de la semana
// 3. Sistema legacy (MenuItem.availableDays)

async function resolveMenu(cafeteriaId: string, date: string) {
  // 1. Buscar asignación específica
  const assignment = await prisma.dailyMenuAssignment.findUnique({
    where: { cafeteriaId_date: { cafeteriaId, date: new Date(date) } },
    include: { items: { include: { menuItem: true } } }
  });
  if (assignment) {
    return { source: 'assignment', items: assignment.items.map(i => i.menuItem) };
  }

  // 2. Buscar patrón semanal
  const dayOfWeek = new Date(date).getDay(); // 0=Dom, 1=Lun, etc.
  const pattern = await prisma.weeklyPattern.findUnique({
    where: { cafeteriaId },
    include: { days: { where: { dayOfWeek }, include: { items: { include: { menuItem: true } } } } }
  });
  if (pattern?.days[0]?.items.length) {
    return { source: 'pattern', items: pattern.days[0].items.map(i => i.menuItem) };
  }

  // 3. Fallback a sistema legacy
  const dayName = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][dayOfWeek];
  const items = await prisma.menuItem.findMany({
    where: { cafeteriaId, availableDays: { has: dayName } }
  });
  return { source: 'default', items };
}
```

#### Drag-and-Drop con @dnd-kit
```typescript
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// Componente Draggable (platos/templates)
function DraggableItem({ item }: { item: MenuItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { type: 'menu-item', item }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {item.name} - ${item.price}
    </div>
  );
}

// Componente Droppable (días del calendario)
function DroppableDay({ date, children }: { date: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: date });

  return (
    <div
      ref={setNodeRef}
      className={`calendar-day ${isOver ? 'bg-blue-100' : ''}`}
    >
      {children}
    </div>
  );
}

// Handler de drop
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over) return;

  const itemId = active.id as string;
  const date = over.id as string;
  const itemType = active.data.current?.type;

  if (itemType === 'menu-item') {
    // Agregar item a la fecha
    setDateMenuMutation.mutate({ date, menuItemIds: [itemId] });
  } else if (itemType === 'template') {
    // Aplicar todos los items del template
    const template = active.data.current?.template;
    const itemIds = template.items.map((i: any) => i.menuItemId);
    setDateMenuMutation.mutate({ date, menuItemIds: itemIds });
  }
}

// Contexto completo
<DndContext onDragEnd={handleDragEnd}>
  <aside>{/* Draggables */}</aside>
  <main>{/* Droppables */}</main>
</DndContext>
```

#### Manejo de Fechas con date-fns
```typescript
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  isWeekend
} from 'date-fns';
import { es } from 'date-fns/locale';

// Generar días del mes para el calendario
function getMonthDays(year: number, month: number) {
  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(start);

  // Incluir días del mes anterior para completar la semana
  const startDay = getDay(start);
  const adjustedStart = new Date(start);
  adjustedStart.setDate(start.getDate() - (startDay === 0 ? 6 : startDay - 1));

  // Incluir días del mes siguiente para completar la semana
  const endDay = getDay(end);
  const adjustedEnd = new Date(end);
  if (endDay !== 0) {
    adjustedEnd.setDate(end.getDate() + (7 - endDay));
  }

  return eachDayOfInterval({ start: adjustedStart, end: adjustedEnd }).map(date => ({
    date: format(date, 'yyyy-MM-dd'),
    day: date.getDate(),
    isCurrentMonth: isSameMonth(date, start),
    isToday: isToday(date),
    isWeekend: isWeekend(date),
    dayOfWeek: getDay(date)
  }));
}

// Formatear fecha para mostrar
function formatDateSpanish(date: string): string {
  return format(new Date(date), "EEEE d 'de' MMMM yyyy", { locale: es });
  // Resultado: "lunes 20 de enero 2026"
}

// Navegación de meses
const [currentMonth, setCurrentMonth] = useState(new Date());
const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
```

#### Endpoints de Menu Planning
```typescript
// GET /api/v1/menu-planning/:cafeteriaId/weekly-pattern
// Retorna el patrón semanal con todos los días e items

// PUT /api/v1/menu-planning/:cafeteriaId/weekly-pattern/day/:dayOfWeek
// Body: { menuItemIds: string[] }
// Actualiza los items de un día del patrón (1=Lun, 5=Vie)

// GET /api/v1/menu-planning/:cafeteriaId/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
// Retorna todas las asignaciones en el rango de fechas

// PUT /api/v1/menu-planning/:cafeteriaId/date/:date
// Body: { menuItemIds: string[], note?: string }
// Crea o actualiza asignación para una fecha específica

// DELETE /api/v1/menu-planning/:cafeteriaId/date/:date
// Elimina asignación (vuelve a usar patrón semanal)

// GET /api/v1/menu-planning/:cafeteriaId/resolve/:date
// Resuelve qué menú mostrar según la lógica de prioridad
// Retorna: { source: 'assignment'|'pattern'|'default', items, date, dayOfWeek }
```

#### Integración Mobile con Calendario
```typescript
// En api.ts - Nuevo método
getMenuByDate: async (cafeteriaId: string, date: string) => {
  const response = await api.get(`/menu-planning/${cafeteriaId}/resolve/${date}`);
  return response.data;
}

// En cafeteria.tsx - Calcular fecha real
function getPickupDate(selectedDay: string): string {
  const today = new Date();
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const todayIndex = today.getDay();
  const targetIndex = days.indexOf(selectedDay.toLowerCase());

  let diff = targetIndex - todayIndex;
  if (diff < 0) diff += 7; // Ir a la próxima semana

  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + diff);

  return format(targetDate, 'yyyy-MM-dd');
}

// Cargar menú para el día seleccionado
const loadMenu = async (selectedDay: string) => {
  const date = getPickupDate(selectedDay);
  const result = await api.getMenuByDate(cafeteriaId, date);

  setMenuItems(result.items);
  setMenuSource(result.source); // Para mostrar "(Menú especial)" si es 'assignment'
};
```

#### Tips de Implementación
- **dnd-kit sensors**: Usar `useSensors` con `PointerSensor` para mejor UX en desktop y mobile
- **Optimistic updates**: Actualizar UI antes de esperar respuesta del servidor
- **Indicadores visuales**: Usar colores distintos para asignaciones (azul) vs patrón (verde punteado)
- **Manejo de timezone**: Usar fechas en formato YYYY-MM-DD string para evitar problemas de zona horaria
- **Validación de días laborables**: Solo permitir asignaciones de Lun-Vie, mostrar Sáb-Dom en gris

### Iteración 6 - Simplificación Calendario de Menú (Enero 2026)

#### Problema
El sistema de calendario de menú tenía funcionalidad innecesaria:
- Mobile tenía carrito, pedidos y filtros de horario (Desayuno/Almuerzo/Once)
- El usuario solo quiere ver el menú del día, no hacer compras desde cafetería
- El admin tenía problemas para eliminar platos de fechas asignadas

#### Cambios Realizados

**Mobile - Solo Visualización:**
```typescript
// ANTES: cafeteria.tsx tenía ~1200 líneas con:
const [cart, setCart] = useState<CartItem[]>([]);
const [showCart, setShowCart] = useState(false);
const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
// + funciones addToCart, removeFromCart, handleConfirmOrder, etc.

// DESPUÉS: ~380 líneas, solo visualización
// Sin estados de carrito
// Sin filtros de horario
// Solo: selector de estudiante, navegación de semanas, selector de día, lista de platos
```

**UI Simplificada:**
```
┌─────────────────────────────────────┐
│  Menu del Dia                       │
│  Casino escolar                     │
├─────────────────────────────────────┤
│  Viendo menu para: [Juan] [María]   │
├─────────────────────────────────────┤
│  ◀  Esta semana  ▶                  │
│  20 ene - 24 ene                    │
│  [Lun] [Mar] [Mié] [Jue] [Vie]     │
├─────────────────────────────────────┤
│  Menu para Lunes                    │
│  ┌─────────────────────────────┐   │
│  │ Sandwich de Pavo            │   │
│  │ Con lechuga y tomate        │   │
│  │ $3.500                      │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ Pasta con Salsa             │   │
│  │ Tallarines bolognesa        │   │
│  │ $4.200                      │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Mensaje cuando no hay menú:**
```tsx
{menuItems.length === 0 && !loading && (
  <Surface style={styles.emptyMenuCard} elevation={1}>
    <Text style={styles.emptyIcon}>📭</Text>
    <Text style={styles.emptyTitle}>No hay menu disponible</Text>
    <Text style={styles.emptyText}>para este día</Text>
  </Surface>
)}
```

#### Admin - Manejo de Errores
Agregado `onError` a las mutations para feedback al usuario:

```typescript
const setDateMenuMutation = useMutation({
  mutationFn: ...,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['menuCalendar', cafeteriaId] })
  },
  onError: (error) => {
    console.error('Error al actualizar menu:', error)
    alert('Error al actualizar el menu. Por favor intenta de nuevo.')
  },
})
```

#### Archivos Modificados
| Archivo | Cambio |
|---------|--------|
| `apps/mobile/app/(tabs)/cafeteria.tsx` | Simplificado de 1200 a 380 líneas |
| `apps/admin/src/app/(dashboard)/menu/calendar/page.tsx` | Agregado manejo de errores |

#### Código Eliminado del Mobile
- `CartItem` interface y estado `cart`
- Estados: `showCart`, `comments`, `selectedTimeSlot`, `orderSuccess`, `orderId`, `submitting`
- Funciones: `addToCart`, `removeFromCart`, `getCartQuantity`, `calculateTotal`, `handleConfirmOrder`, `handleTimeSlotSelect`, `getPickupDate`
- UI: filtros de horario, botones (+), carrito flotante, modal de confirmación, pantalla de éxito

#### Gotcha: CafeteriaId Hardcoded
El admin usa `cafeteriaId = 'demo-cafeteria'` hardcoded, mientras que mobile lo obtiene del estudiante.
Para entorno de demo funciona, pero requiere refactor para multi-tenancy.

```typescript
// Admin - línea 267
const cafeteriaId = 'demo-cafeteria' // TODO: obtener de auth context

// Mobile - obtiene dinámicamente
const cafeteriaId = studentData.cafeteria.id;
```

### Iteracion 6 - Simplificacion Sistema Solo Tickets (Enero 2026)

#### Problema
El sistema tenia DOS mecanismos paralelos que creaban confusion:
- `Wallet.balance` - saldo monetario virtual
- `StudentTicket.quantity` - cantidad de tickets

Cuando se compraban tickets, se sumaba al balance Y se creaban tickets.
Cuando se validaba, se restaban tickets Y se deducia del balance.
Esto era redundante y confuso para el usuario.

#### Solucion: Eliminar Saldo, Solo Tickets
Simplificar a: **Comprar tickets -> Tener tickets -> Validar ticket (resta 1)**

**Cambios en Schema:**
```diff
model StudentTicket {
  id         String    @id @default(uuid())
  studentId  String    @map("student_id")
  ticketType String    @map("ticket_type")
  quantity   Int       @default(0)
- pricePerTicket Int   @default(0) @map("price_per_ticket")
  expiresAt  DateTime? @map("expires_at")
}
```

**Cambios en Backend - payments.routes.ts:**
```typescript
// ANTES: Actualizaba balance Y creaba tickets con pricePerTicket
// AHORA: Solo crea/actualiza tickets, NO toca balance
if (isTicketPackage) {
  if (existingTicket) {
    await tx.studentTicket.update({
      where: { id: existingTicket.id },
      data: { quantity: existingTicket.quantity + rechargePackage.ticketCount },
    });
  } else {
    await tx.studentTicket.create({
      data: {
        studentId: body.studentId,
        ticketType: rechargePackage.ticketType || 'general',
        quantity: rechargePackage.ticketCount,
      },
    });
  }
}
```

**Cambios en Backend - casino.routes.ts:**
```typescript
// ANTES: Restaba tickets Y deducia ticketValue del balance
// AHORA: Solo decrementa tickets, Transaction.amount = 0
const result = await prisma.$transaction(async (tx) => {
  const updatedTicket = await tx.studentTicket.update({
    where: { id: ticket.id },
    data: { quantity: ticket.quantity - body.quantity },
  });

  const transaction = await tx.transaction.create({
    data: {
      walletId: wallet.id,
      cafeteriaId: cafeteria.id,
      type: 'purchase',
      amount: 0, // Sin valor monetario
      description: `Se resto ${body.quantity} ticket(s) de ${body.ticketType} - ${student.firstName} comio`,
      ticketsUsed: JSON.stringify([{ type: body.ticketType, quantity: body.quantity }]),
      // ...
    },
  });

  return { updatedTicket, transaction };
});
```

#### Cambios en UI Mobile
| Pantalla | Cambio |
|----------|--------|
| `index.tsx` | Eliminar "Saldo disponible", "Limite diario", `totalValue` de tickets |
| `students.tsx` | Eliminar seccion de "Saldo" |
| `recharge.tsx` | Renombrar a "Comprar Tickets", eliminar montos rapidos y custom |
| `wallet-history.tsx` | Renombrar a "Historial de Tickets", mostrar tickets actuales |

#### Cambios en Admin
| Archivo | Cambio |
|---------|--------|
| `packages/new/page.tsx` | Ocultar opcion tipo "balance", solo permitir "ticket" |

#### Flujo Simplificado
```
Compra de Paquete:
1. Guardian paga $40,000 por paquete de 10 tickets
2. Se crea/actualiza StudentTicket con quantity: 10
3. Wallet.balance NO cambia (se mantiene en BD pero no se usa)
4. WalletLog registra: "Compra de 10 tickets de almuerzo por $40,000"

Consumo en Casino:
1. Estudiante se valida, operador marca 1 ticket
2. StudentTicket.quantity baja de 10 a 9
3. Wallet.balance NO cambia
4. Transaction se crea con amount: 0
5. Descripcion: "Se resto 1 ticket - Juan comio"

Historial para Apoderado:
- Muestra compras: "Compraste 10 tickets por $40,000"
- Muestra consumos: "Se resto 1 ticket - tu hijo comio"
- NO muestra saldo ni valores monetarios por ticket
```

#### Decisiones de Diseno
| Decision | Opcion Elegida | Razon |
|----------|----------------|-------|
| Wallet.balance | Mantener en BD pero no usar | Evitar migracion destructiva |
| pricePerTicket | Eliminar completamente | Simplificar modelo |
| Historial | Mantener visible | Apoderado necesita ver cuando su hijo comio |
| Admin paquetes | Solo tipo ticket | Simplificar UX |

#### Archivos Modificados
- `packages/api/prisma/schema.prisma` - Eliminar pricePerTicket
- `packages/api/src/routes/payments.routes.ts` - No actualizar balance para tickets
- `packages/api/src/routes/casino.routes.ts` - Solo restar tickets
- `packages/api/src/routes/students.routes.ts` - Eliminar pricePerTicket de responses
- `apps/mobile/src/services/api.ts` - Actualizar tipos
- `apps/mobile/app/(tabs)/index.tsx` - Eliminar saldo de UI
- `apps/mobile/app/students.tsx` - Eliminar saldo
- `apps/mobile/app/recharge.tsx` - Renombrar a "Comprar Tickets"
- `apps/mobile/app/wallet-history.tsx` - Renombrar a "Historial de Tickets"
- `apps/admin/src/app/(dashboard)/packages/new/page.tsx` - Solo tipo ticket
