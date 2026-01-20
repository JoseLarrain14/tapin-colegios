# PEER REVIEW: Módulo de Transacciones - Correcciones Requeridas

## Contexto

El módulo de transacciones del panel de administración tiene varios bugs que impiden su correcto funcionamiento. Las estadísticas muestran cero, los filtros no funcionan correctamente, y hay confusión entre tipos de transacciones.

---

## PROBLEMAS IDENTIFICADOS

### Problema 1: El tipo de transacción "ticket" NO EXISTE

**Severidad:** CRÍTICA

**Ubicación:**
- Frontend: `apps/admin/src/app/(dashboard)/transactions/page.tsx` línea 124
- Backend: `packages/api/src/routes/admin.routes.ts` línea 777

**Descripción:**
El frontend tiene un tab "Tickets Hoy" que filtra por `type: 'ticket'`, pero este tipo NO existe en la base de datos. Los tickets consumidos se guardan como `type: 'purchase'` con el campo `ticketsUsed` conteniendo un JSON.

**Código problemático en frontend (transactions/page.tsx):**
```typescript
const getTypeForTab = (tab: string): string | undefined => {
  switch (tab) {
    case 'tickets': return 'ticket'  // BUG: Este tipo no existe
    case 'sales': return 'purchase'
    case 'recharges': return 'deposit'
    default: return undefined
  }
}
```

**Código problemático en backend (admin.routes.ts línea 777):**
```typescript
...(type && type !== 'all' && type !== 'deposit' && { type })
// Cuando type='ticket', busca Transaction.type='ticket' que no existe
```

**Cómo se crean los tickets realmente (casino.routes.ts línea 644-656):**
```typescript
// POST /casino/consume
const transaction = await prisma.transaction.create({
  data: {
    walletId: student.wallet.id,
    cafeteriaId,
    type: 'purchase',  // Se guarda como 'purchase', NO como 'ticket'
    amount: 0,
    description: `Consumo de ticket: ${ticket.packageName}`,
    ticketsUsed: JSON.stringify([{...}]),  // Los tickets van aquí
    // ...
  }
})
```

**Solución requerida:**
- Opción A (Recomendada): Cambiar el tipo a 'ticket' cuando se consume un ticket en `casino.routes.ts`
- Opción B: Modificar el filtro en `admin.routes.ts` para detectar tickets por `ticketsUsed IS NOT NULL`

---

### Problema 2: Los filtros "Tickets" y "Ventas" muestran lo mismo

**Severidad:** ALTA

**Ubicación:** `packages/api/src/routes/admin.routes.ts` líneas 773-807

**Descripción:**
El endpoint GET `/admin/transactions` no distingue correctamente entre:
- **Ventas:** Compras directas en cafetería (sin tickets)
- **Tickets:** Consumo de tickets pre-comprados

Ambos se guardan como `type: 'purchase'` en la tabla Transaction.

**Cómo distinguirlos:**
| Tipo | type | ticketsUsed | amount |
|------|------|-------------|--------|
| Venta directa | purchase | null | > 0 |
| Consumo ticket | purchase | JSON con tickets | 0 |

**Solución requerida en admin.routes.ts:**
```typescript
// Modificar la consulta de transactions para el filtro
const transactionsWhere = {
  cafeteria: { schoolId },
  ...(dateFilter),
  // Para filtro 'ticket': buscar donde ticketsUsed no es null
  ...(type === 'ticket' && { ticketsUsed: { not: null } }),
  // Para filtro 'purchase' (ventas): buscar donde ticketsUsed es null
  ...(type === 'purchase' && { ticketsUsed: null, type: 'purchase' }),
  // Para otros tipos
  ...(type && type !== 'all' && type !== 'deposit' && type !== 'ticket' && type !== 'purchase' && { type }),
}
```

---

### Problema 3: Estadísticas muestran CERO

**Severidad:** CRÍTICA

**Ubicación:** `packages/api/src/routes/admin.routes.ts` líneas 1056-1139

**Causas posibles:**

#### Causa 3.1: Problema de Timezone
```typescript
// Líneas 1056-1061
const today = new Date();
today.setHours(0, 0, 0, 0);  // Esto usa hora LOCAL del servidor
```
Si el servidor está en UTC pero los datos se guardaron con hora local de Chile (UTC-3/UTC-4), las fechas no coinciden.

**Solución:**
```typescript
// Usar fechas UTC explícitas
const now = new Date();
const dateFrom = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
const dateTo = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
```

#### Causa 3.2: Filtro por schoolId incorrecto
```typescript
// Línea 1072-1083 - Obtiene walletIds del colegio
const walletIds = students.map(s => s.wallet?.id).filter(Boolean);
// Si no hay estudiantes con wallet, walletIds = [] y las queries retornan 0
```

**Verificar:** Que los estudiantes tengan wallets asignados y que el schoolId del admin sea correcto.

#### Causa 3.3: Uso de createdAt vs completedAt en Payments
```typescript
// Línea 1115 - Recargas
where: {
  createdAt: { gte: dateFrom, lte: dateTo },  // Usa createdAt
  status: 'completed',
}
```
Si el pago se creó un día y se completó otro, puede no aparecer en las stats.

**Solución:**
```typescript
where: {
  completedAt: { gte: dateFrom, lte: dateTo },  // Cambiar a completedAt
  status: 'completed',
}
```

---

### Problema 4: Búsqueda ineficiente

**Severidad:** MEDIA

**Ubicación:** `packages/api/src/routes/admin.routes.ts` líneas 895-903

**Descripción:**
La búsqueda se hace EN MEMORIA después de traer todos los datos de la BD:
```typescript
// Trae TODOS los registros
const transactions = await prisma.transaction.findMany({...});
const walletLogs = await prisma.walletLog.findMany({...});
const payments = await prisma.payment.findMany({...});

// Luego filtra en JavaScript
if (search && search.trim()) {
  normalizedTransactions = normalizedTransactions.filter(t =>
    t.studentName?.toLowerCase().includes(searchLower) || ...
  );
}
```

**Problemas:**
1. Ineficiente con muchos registros
2. La paginación es incorrecta (el total no refleja la búsqueda)

**Solución:**
Mover la búsqueda a nivel de Prisma:
```typescript
const searchFilter = search ? {
  wallet: {
    student: {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { rut: { contains: search } }
      ]
    }
  }
} : {};

const transactions = await prisma.transaction.findMany({
  where: {
    ...baseWhere,
    ...searchFilter
  }
});
```

---

### Problema 5: Confusión conceptual Ventas vs Recargas

**Severidad:** BAJA (documentación)

**Descripción:**
El usuario estaba confundido porque pensaba que "ventas" y "recargas" eran lo mismo. La arquitectura real es:

| Concepto | Tabla | Descripción |
|----------|-------|-------------|
| **Recarga** | Payment | Cuando el apoderado agrega dinero a la wallet vía Webpay/Flow |
| **Venta** | Transaction | Cuando el estudiante compra algo en la cafetería |
| **Ticket** | Transaction | Cuando el estudiante usa un ticket pre-comprado |

**Flujo correcto:**
```
Apoderado paga $10,000 → Payment (recarga)
                        ↓
                    Wallet balance += $10,000
                        ↓
Estudiante compra $2,000 → Transaction (venta)
                        ↓
                    Wallet balance -= $2,000
```

---

## ARCHIVOS A MODIFICAR

### 1. packages/api/src/routes/admin.routes.ts

**Sección: GET /admin/transactions (líneas 733-1029)**
- [ ] Agregar filtro para distinguir tickets de ventas usando `ticketsUsed`
- [ ] Mover búsqueda a nivel de Prisma
- [ ] Corregir paginación para reflejar búsqueda

**Sección: GET /admin/transactions/stats (líneas 1038-1158)**
- [ ] Corregir manejo de timezone
- [ ] Usar `completedAt` para filtrar pagos
- [ ] Agregar logs de debug temporales para diagnosticar

### 2. packages/api/src/routes/casino.routes.ts

**Sección: POST /casino/consume (líneas 644-656)**
- [ ] Considerar cambiar `type: 'purchase'` a `type: 'ticket'` para consumo de tickets
- [ ] O mantener como está y documentar que tickets = purchase con ticketsUsed

### 3. apps/admin/src/app/(dashboard)/transactions/page.tsx

**Sección: Función getTypeForTab (líneas 121-132)**
- [ ] Actualizar para pasar parámetro especial para tickets
- [ ] O esperar a que el backend soporte el filtro correctamente

---

## PLAN DE IMPLEMENTACIÓN SUGERIDO

### Fase 1: Corregir filtro de tickets (PRIORIDAD ALTA)
1. Modificar `admin.routes.ts` para detectar tickets por `ticketsUsed IS NOT NULL`
2. Modificar el filtro de ventas para excluir transacciones con tickets

### Fase 2: Corregir estadísticas (PRIORIDAD ALTA)
1. Agregar logs de debug para ver qué fechas se están usando
2. Verificar timezone del servidor vs datos
3. Probar con fechas hardcodeadas para confirmar que las queries funcionan

### Fase 3: Optimizar búsqueda (PRIORIDAD MEDIA)
1. Mover búsqueda a Prisma
2. Corregir conteo de paginación

---

## CÓDIGO DE REFERENCIA

### Modelo Transaction (schema.prisma líneas 249-269)
```prisma
model Transaction {
  id               String   @id @default(uuid())
  walletId         String   @map("wallet_id")
  cafeteriaId      String   @map("cafeteria_id")
  type             String   // purchase, refund, adjustment
  amount           Int
  description      String?
  items            String?  // JSON string
  ticketsUsed      String?  @map("tickets_used") // JSON string - CLAVE PARA DETECTAR TICKETS
  validatedBy      String?  @map("validated_by")
  validationMethod String?  @map("validation_method")
  source           String   // app, casino
  createdAt        DateTime @default(now()) @map("created_at")
}
```

### Modelo Payment (schema.prisma líneas 303-325)
```prisma
model Payment {
  id                String    @id @default(uuid())
  guardianId        String    @map("guardian_id")
  studentId         String    @map("student_id")
  walletId          String    @map("wallet_id")
  amount            Int
  gateway           String    // webpay, flow, fintoc, mock
  status            String    @default("pending") // pending, processing, completed, failed
  createdAt         DateTime  @default(now()) @map("created_at")
  completedAt       DateTime? @map("completed_at")  // USAR ESTE PARA STATS
}
```

---

## TESTS SUGERIDOS

### Test 1: Verificar que tickets se filtran correctamente
```bash
# Crear un consumo de ticket
curl -X POST http://localhost:3001/api/v1/casino/consume \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"studentId": "...", "ticketTypeId": "..."}'

# Verificar que aparece en tab tickets
curl "http://localhost:3001/api/v1/admin/transactions?type=ticket" \
  -H "Authorization: Bearer TOKEN"
```

### Test 2: Verificar estadísticas del día
```bash
# Ver stats
curl "http://localhost:3001/api/v1/admin/transactions/stats" \
  -H "Authorization: Bearer TOKEN"

# Debe retornar valores > 0 si hay transacciones hoy
```

---

## RESUMEN EJECUTIVO

| Problema | Impacto | Esfuerzo | Prioridad |
|----------|---------|----------|-----------|
| Tipo "ticket" no existe | Stats y filtros rotos | Medio | CRÍTICA |
| Filtros tickets/ventas iguales | UX confusa | Medio | ALTA |
| Stats muestran cero | Dashboard inútil | Bajo-Medio | CRÍTICA |
| Búsqueda ineficiente | Performance | Alto | MEDIA |
| Documentación confusa | UX | Bajo | BAJA |

**Tiempo estimado total:** Las correcciones de Fase 1 y 2 son las más importantes y deberían resolverse primero.
