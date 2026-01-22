# PRD: Sincronización Wallet-Tickets

**Branch:** `feature/wallet-tickets-sync`
**Prioridad:** HIGH (bug crítico de negocio)

## Descripción

Sistema de sincronización entre el saldo del wallet y los tickets del estudiante. Cuando se consume un ticket en el casino, el balance debe bajar proporcionalmente según el precio unitario del ticket.

---

## Contexto

### Problema
El sistema tiene dos modelos separados que **no están sincronizados**:
- `Wallet.balance` - saldo monetario del estudiante
- `StudentTicket.quantity` - cantidad de tickets disponibles

**Comportamiento actual (BUG):**
- Apoderado compra paquete ($80,000 → 10 tickets): balance sube, tickets se agregan ✓
- Estudiante consume ticket en casino: tickets bajan, **balance queda igual** ✗

**Ubicación del bug:**
| Archivo | Línea | Problema |
|---------|-------|----------|
| `payments.routes.ts` | 572-598 | No guarda `pricePerTicket` |
| `casino.routes.ts` | 649 | `amount: 0` - no descuenta del balance |

### Solución
1. Agregar campo `pricePerTicket` a `StudentTicket`
2. Al comprar paquete, calcular y guardar precio unitario
3. Al consumir ticket, descontar valor del balance
4. Crear WalletLog para auditoría

### Decisiones de Diseño
| Decisión | Opción Elegida |
|----------|----------------|
| Mezcla de precios diferentes | Precio promedio ponderado |
| Datos existentes | Borrar tickets actuales |
| Expiración de tickets | No implementar por ahora |

---

## Datos de Prueba

**Credenciales:**
| Rol | Email | Password |
|-----|-------|----------|
| school_admin | admin@colegio.cl | admin123 |
| guardian | apoderado@test.cl | test123 |

**Paquetes de ejemplo:**
- "10 Almuerzos" - $80,000 → 10 tickets → $8,000/ticket
- "5 Almuerzos" - $45,000 → 5 tickets → $9,000/ticket

---

## FASE 1: BACKEND - Schema y Migración

### US-200: Agregar campo pricePerTicket al modelo StudentTicket
**Prioridad:** 1 | **Estado:** pending

**Descripción:**
Agregar el campo `pricePerTicket` al modelo StudentTicket para almacenar el precio unitario de cada ticket.

**Archivos:** `packages/api/prisma/schema.prisma`

**Criterios de Aceptación:**
- [ ] Modelo StudentTicket tiene nuevo campo `pricePerTicket Int @default(0) @map("price_per_ticket")`
- [ ] El campo está ubicado después de `quantity` y antes de `expiresAt`
- [ ] `npx prisma format` ejecuta sin errores
- [ ] `npx prisma validate` ejecuta sin errores

**Verificación Terminal:**
```bash
cd packages/api && npx prisma format && npx prisma validate
# Debe mostrar "The schema looks valid!"
```

---

### US-201: Crear migración y limpiar tickets existentes
**Prioridad:** 1 | **Estado:** pending

**Descripción:**
Crear la migración de Prisma y limpiar datos existentes para partir desde cero.

**Archivos:** `packages/api/prisma/migrations/` (nuevo)

**Criterios de Aceptación:**
- [ ] Migración creada con nombre `add_price_per_ticket`
- [ ] Todos los registros de `student_tickets` eliminados antes de migración
- [ ] Columna `price_per_ticket` existe en tabla `student_tickets`
- [ ] `npx prisma migrate status` muestra migraciones aplicadas

**Verificación Terminal:**
```bash
cd packages/api && npx prisma migrate dev --name add_price_per_ticket
# Debe mostrar "Migration applied"
```

**Verificación Adicional:**
```bash
cd packages/api && sqlite3 prisma/dev.db "SELECT COUNT(*) FROM student_tickets;"
# Debe retornar 0
```

---

### US-202: Regenerar cliente Prisma y verificar tipos
**Prioridad:** 1 | **Estado:** pending

**Descripción:**
Regenerar el cliente Prisma y verificar que TypeScript compila correctamente.

**Archivos:** Ninguno (solo generación)

**Criterios de Aceptación:**
- [ ] `npx prisma generate` ejecuta sin errores
- [ ] Tipo `StudentTicket` incluye `pricePerTicket: number`
- [ ] `npx tsc --noEmit` en packages/api compila sin errores
- [ ] `pnpm build:api` completa exitosamente

**Verificación Terminal:**
```bash
cd packages/api && npx prisma generate && npx tsc --noEmit
# No debe mostrar errores
```

---

## FASE 2: BACKEND - Lógica de Negocio

### US-203: Modificar creación de tickets en payments.routes.ts
**Prioridad:** 2 | **Estado:** pending

**Descripción:**
Actualizar la lógica de compra de paquetes para calcular y guardar el `pricePerTicket`.

**Archivos:** `packages/api/src/routes/payments.routes.ts` (líneas 572-598)

**Criterios de Aceptación:**
- [ ] Al crear ticket nuevo: `pricePerTicket = Math.floor(rechargePackage.price / rechargePackage.ticketCount)`
- [ ] Al actualizar tickets existentes, calcular precio promedio ponderado:
  - `totalExistingValue = existingTicket.quantity * existingTicket.pricePerTicket`
  - `totalNewValue = rechargePackage.ticketCount * pricePerTicket`
  - `newPricePerTicket = Math.floor((totalExistingValue + totalNewValue) / totalQuantity)`
- [ ] Campo `pricePerTicket` se guarda en base de datos
- [ ] Código compila sin errores TypeScript

**Verificación Terminal:**
```bash
cd packages/api && npx tsc --noEmit
# No debe mostrar errores
```

---

### US-204: Modificar consumo de tickets en casino.routes.ts
**Prioridad:** 2 | **Estado:** pending

**Descripción:**
Actualizar endpoint `/casino/consume` para descontar el valor del ticket del balance.

**Archivos:** `packages/api/src/routes/casino.routes.ts` (líneas 633-659)

**Criterios de Aceptación:**
- [ ] Se calcula `ticketValue = ticket.pricePerTicket * body.quantity`
- [ ] Se actualiza `Wallet.balance` restando `ticketValue`
- [ ] Se usa `Math.max(0, balanceBefore - ticketValue)` para evitar balance negativo
- [ ] Campo `amount` en Transaction ahora es `ticketValue` (antes era 0)
- [ ] Código compila sin errores TypeScript

**Verificación Terminal:**
```bash
cd packages/api && npx tsc --noEmit
```

---

### US-205: Crear WalletLog al consumir tickets
**Prioridad:** 2 | **Estado:** pending

**Descripción:**
Agregar creación de WalletLog cuando se consume un ticket para mantener auditoría.

**Archivos:** `packages/api/src/routes/casino.routes.ts`

**Criterios de Aceptación:**
- [ ] Se crea `WalletLog` con `type: 'purchase'`
- [ ] Campo `amount` es negativo (`-ticketValue`)
- [ ] Se registra `balanceBefore` y `balanceAfter` correctamente
- [ ] Descripción indica consumo: `"Consumo de X ticket(s) de Y"`
- [ ] WalletLog se crea dentro de la misma transacción atómica

**Verificación Terminal:**
```bash
cd packages/api && npx tsc --noEmit
```

---

### US-206: Actualizar respuesta del endpoint /casino/consume
**Prioridad:** 3 | **Estado:** pending

**Descripción:**
Modificar respuesta del endpoint para incluir información del wallet actualizado.

**Archivos:** `packages/api/src/routes/casino.routes.ts` (líneas 673-695)

**Criterios de Aceptación:**
- [ ] Respuesta incluye campo `wallet` con:
  - `previousBalance`: balance antes del consumo
  - `newBalance`: balance después del consumo
- [ ] Campo `consumption` incluye:
  - `ticketValue`: precio unitario del ticket
  - `totalDeducted`: monto total descontado
- [ ] Código compila sin errores

**Verificación Terminal:**
```bash
cd packages/api && npx tsc --noEmit && pnpm build:api
```

---

### US-207: Actualizar API de students para incluir valor de tickets
**Prioridad:** 3 | **Estado:** pending

**Descripción:**
Modificar respuestas de API de estudiantes para incluir precio y valor total de tickets.

**Archivos:** `packages/api/src/routes/students.routes.ts`

**Criterios de Aceptación:**
- [ ] En GET `/students`, array `tickets` incluye:
  - `pricePerTicket`: precio unitario
  - `totalValue`: `quantity * pricePerTicket`
- [ ] Campo incluido en listado y detalle de estudiante
- [ ] Código compila sin errores

**Verificación Terminal:**
```bash
cd packages/api && npx tsc --noEmit && pnpm build:api
```

---

## FASE 3: TESTING - Integración

### US-208: Test de integración - Compra de paquete
**Prioridad:** 4 | **Estado:** pending

**Descripción:**
Verificar que al comprar un paquete de tickets, se guarda el `pricePerTicket` correctamente.

**Archivos:** Ninguno (solo pruebas)

**Criterios de Aceptación:**
- [ ] Iniciar API con `pnpm dev:api`
- [ ] POST a `/api/v1/payments/init` con paquete de tickets
- [ ] Verificar en BD que `student_tickets.price_per_ticket` > 0
- [ ] Valor es igual a `package.price / package.ticketCount`

**Verificación Terminal:**
```bash
cd packages/api && sqlite3 prisma/dev.db "SELECT student_id, ticket_type, quantity, price_per_ticket FROM student_tickets LIMIT 5;"
# Debe mostrar price_per_ticket > 0
```

---

### US-209: Test de integración - Consumo de ticket
**Prioridad:** 4 | **Estado:** pending

**Descripción:**
Verificar que al consumir un ticket, el balance baja proporcionalmente.

**Archivos:** Ninguno (solo pruebas)

**Criterios de Aceptación:**
- [ ] Tener estudiante con tickets y balance > 0
- [ ] POST a `/api/v1/casino/consume` para consumir 1 ticket
- [ ] Verificar que `Wallet.balance` bajó en `pricePerTicket`
- [ ] Verificar que se creó `WalletLog` con el consumo
- [ ] Verificar que `Transaction` tiene `amount > 0`

**Verificación Terminal:**
```bash
cd packages/api && sqlite3 prisma/dev.db "SELECT type, amount, description FROM wallet_logs ORDER BY created_at DESC LIMIT 5;"
# Debe mostrar consumo con amount negativo
```

---

## FASE 4: FRONTEND - UI Updates

### US-210: Test E2E con Playwright - Flujo completo
**Prioridad:** 5 | **Estado:** pending

**Descripción:**
Crear test E2E que verifique el flujo completo desde compra hasta consumo con verificación visual.

**Archivos:** `apps/admin/e2e/wallet-tickets-sync.spec.ts` (nuevo)

**Criterios de Aceptación:**
- [ ] Test navega al admin panel como school_admin
- [ ] Va a sección de estudiantes
- [ ] Verifica que se muestra saldo y tickets
- [ ] Simula compra de paquete via API
- [ ] Verifica que saldo subió
- [ ] Simula consumo de ticket via API
- [ ] Verifica que saldo bajó proporcionalmente
- [ ] Toma screenshots de cada paso como evidencia

**Verificación Terminal:**
```bash
cd apps/admin && npx playwright test wallet-tickets-sync.spec.ts --headed
```

**Verificación Visual:**
- Screenshots guardados en `apps/admin/e2e/screenshots/`
- Abrir screenshots y verificar valores correctos

---

### US-211: Actualizar UI Mobile para mostrar valor de tickets
**Prioridad:** 5 | **Estado:** pending

**Descripción:**
Actualizar app mobile para mostrar valor monetario de los tickets del estudiante.

**Archivos:**
- `apps/mobile/app/(tabs)/index.tsx`
- `apps/mobile/src/services/api.ts`

**Criterios de Aceptación:**
- [ ] Tipo `StudentTicket` incluye `pricePerTicket` y `totalValue`
- [ ] UI muestra valor monetario junto a cantidad de tickets
- [ ] Formato: "5 tickets ($40,000)"
- [ ] Código compila sin errores
- [ ] App se visualiza correctamente en Expo

**Verificación Terminal:**
```bash
cd apps/mobile && npx tsc --noEmit
```

**Verificación Visual:**
- Abrir app en Expo
- Verificar que muestra valor de los tickets
- Screenshot de la pantalla principal con tickets

---

## FASE 5: DOCUMENTACIÓN

### US-212: Documentar en AGENTS.md
**Prioridad:** 6 | **Estado:** pending

**Descripción:**
Agregar los aprendizajes de esta implementación al archivo AGENTS.md.

**Archivos:** `AGENTS.md`

**Criterios de Aceptación:**
- [ ] Nueva sección "Iteración 4 - Sincronización Wallet-Tickets"
- [ ] Documentar patrón de precio promedio ponderado
- [ ] Documentar relación entre tickets y balance
- [ ] Incluir ejemplo de código del consumo con descuento
- [ ] Documentar flujo: compra → tickets → consumo → balance

**Verificación Terminal:**
```bash
grep -n "Iteración 4" AGENTS.md
# Debe mostrar número de línea donde está la sección
```

---

## Resumen de Archivos

| Archivo | User Stories |
|---------|--------------|
| `packages/api/prisma/schema.prisma` | US-200 |
| `packages/api/prisma/migrations/` | US-201 |
| `packages/api/src/routes/payments.routes.ts` | US-203 |
| `packages/api/src/routes/casino.routes.ts` | US-204, US-205, US-206 |
| `packages/api/src/routes/students.routes.ts` | US-207 |
| `apps/admin/e2e/wallet-tickets-sync.spec.ts` | US-210 |
| `apps/mobile/app/(tabs)/index.tsx` | US-211 |
| `apps/mobile/src/services/api.ts` | US-211 |
| `AGENTS.md` | US-212 |

---

## Verificación Final

Después de completar todas las user stories:

1. **Terminal:** `pnpm build` debe completar sin errores
2. **API Test:** El flujo compra → consumo funciona correctamente
3. **Admin UI:** El saldo y tickets se muestran sincronizados
4. **Mobile UI:** El valor monetario de tickets se muestra
5. **E2E:** Los tests de Playwright pasan
6. **DB Check:**
```bash
cd packages/api && sqlite3 prisma/dev.db "
SELECT
  s.first_name,
  w.balance,
  st.quantity,
  st.price_per_ticket,
  (st.quantity * st.price_per_ticket) as expected_balance
FROM students s
JOIN wallets w ON w.student_id = s.id
LEFT JOIN student_tickets st ON st.student_id = s.id
LIMIT 5;
"
# balance debe ser igual o cercano a expected_balance
```
