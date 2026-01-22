# PRD: Simplificar Sistema de Pagos - Solo Tickets (Eliminar Saldo)

## Resumen Ejecutivo

Simplificar el sistema de pagos eliminando el concepto de "saldo/balance" de la interfaz de usuario y dejando **solo tickets**. El flujo deseado es: **Comprar tickets -> Tener tickets -> Validar ticket (resta 1)**.

---

## Problema Actual

El sistema tiene DOS mecanismos paralelos que crean confusion:
1. **Saldo/Balance**: Dinero virtual en `Wallet.balance`
2. **Tickets**: Unidades pre-pagadas en `StudentTicket.quantity`

Cuando se compran tickets, se suma al balance Y se crean tickets. Cuando se valida, se restan tickets Y se deduce del balance. Esto es confuso y redundante.

---

## Solucion

### Decisiones Confirmadas:
1. **Wallet.balance**: Mantener en BD pero NO mostrarlo ni usarlo en UI
2. **StudentTicket.pricePerTicket**: ELIMINAR - simplificar a 1 ticket = 1 unidad
3. **Business Model**: Mantener opciones (tickets_only, balance_only, mixed) por flexibilidad
4. **Historial**: MANTENER y mostrar al apoderado:
   - Compras de tickets: "Compraste 10 tickets por $40.000"
   - Consumos: "Se resto 1 ticket - tu hijo comio" (con fecha/hora)
   - NO mostrar concepto de "saldo", solo tickets

---

## Alcance de Cambios

### FASE 1: API Backend

#### 1.1 Schema Prisma
**Archivo:** `packages/api/prisma/schema.prisma`

- **Linea 337**: ELIMINAR `pricePerTicket Int @default(0) @map("price_per_ticket")`

```sql
ALTER TABLE student_tickets DROP COLUMN price_per_ticket;
```

#### 1.2 payments.routes.ts
**Archivo:** `packages/api/src/routes/payments.routes.ts`

Cambios en POST /init:
- NO actualizar `wallet.balance` para paquetes tipo "ticket"
- Eliminar calculo de `pricePerTicket` ponderado
- Solo sumar `quantity` de tickets

#### 1.3 casino.routes.ts
**Archivo:** `packages/api/src/routes/casino.routes.ts`

Cambios en POST /consume:
- Solo decrementar `StudentTicket.quantity`
- NO tocar `Wallet.balance`
- Crear `Transaction` con `amount: 0`

#### 1.4 students.routes.ts
**Archivo:** `packages/api/src/routes/students.routes.ts`

- Eliminar `pricePerTicket` y `totalValue` de respuestas de tickets

---

### FASE 2: App Mobile

#### 2.1 index.tsx (Home)
**Archivo:** `apps/mobile/app/(tabs)/index.tsx`

| Lineas | Cambio |
|--------|--------|
| 218-229 | ELIMINAR bloque "Saldo disponible" |
| 231-236 | ELIMINAR bloque "Limite diario" |
| 250 | ELIMINAR `{ticket.totalValue > 0 && ...}` |
| 280-299 | MANTENER botones pero renombrar a "Historial de tickets" y "Estadisticas de consumo" |

#### 2.2 students.tsx
**Archivo:** `apps/mobile/app/students.tsx`

| Lineas | Cambio |
|--------|--------|
| 181-190 | ELIMINAR View con "Saldo" |

#### 2.3 recharge.tsx
**Archivo:** `apps/mobile/app/recharge.tsx`

| Lineas | Cambio |
|--------|--------|
| 152, 164, 221 | Cambiar titulo a "Comprar Tickets" |
| 246-252 | ELIMINAR bloque "Saldo actual" |
| 265-289 | ELIMINAR seleccion de montos rapidos |
| 291-308 | ELIMINAR input de monto personalizado |
| 404-420 | ELIMINAR "Nuevo saldo estimado" |

#### 2.4 cafeteria.tsx
**Archivo:** `apps/mobile/app/(tabs)/cafeteria.tsx`

| Lineas | Cambio |
|--------|--------|
| 289-297 | Cambiar validacion de `balance >= cartTotal` a validar por tickets |
| 441-456 | Mostrar "Tickets disponibles" en vez de "Saldo disponible" |

#### 2.5 wallet-history.tsx -> RENOMBRAR a ticket-history.tsx
**Mantener esta pantalla pero adaptarla para tickets:**
- Renombrar titulo a "Historial de Tickets"
- Mostrar compras: "Compraste X tickets por $Y"
- Mostrar consumos: "Se resto 1 ticket - [nombre] comio" con fecha/hora
- Eliminar referencias a "saldo" o "balance"
- Ocultar `balanceBefore` / `balanceAfter` (no relevantes)

#### 2.6 spending-stats.tsx
- Adaptar para mostrar estadisticas de tickets consumidos (no de saldo)

#### 2.6 api.ts
**Archivo:** `apps/mobile/src/services/api.ts`

- Eliminar `pricePerTicket` y `totalValue` de interface Student.tickets

---

### FASE 3: Admin Dashboard

#### 3.1 packages/new/page.tsx
**Archivo:** `apps/admin/src/app/(dashboard)/packages/new/page.tsx`

- OCULTAR opcion de tipo "balance" (solo permitir "ticket")

---

## Archivos a Modificar (Resumen)

| Prioridad | Archivo | Tipo |
|-----------|---------|------|
| Alta | `packages/api/prisma/schema.prisma` | Eliminar pricePerTicket |
| Alta | `packages/api/src/routes/payments.routes.ts` | No actualizar balance para tickets |
| Alta | `packages/api/src/routes/casino.routes.ts` | Solo restar tickets, no balance |
| Alta | `packages/api/src/routes/students.routes.ts` | Eliminar pricePerTicket de responses |
| Alta | `apps/mobile/src/services/api.ts` | Actualizar tipos |
| Alta | `apps/mobile/app/(tabs)/index.tsx` | Ocultar saldo |
| Alta | `apps/mobile/app/students.tsx` | Ocultar saldo |
| Alta | `apps/mobile/app/recharge.tsx` | Renombrar a "Comprar Tickets" |
| Alta | `apps/mobile/app/(tabs)/cafeteria.tsx` | Validar por tickets |
| Media | `apps/admin/src/app/(dashboard)/packages/new/page.tsx` | Ocultar tipo balance |

---

## Plan de Verificacion

### Tests Manuales:
1. Comprar paquete de tickets -> verificar que tickets aumentan, balance NO cambia
2. Validar ticket en POS -> verificar que tickets disminuyen, balance NO cambia
3. UI Mobile Home -> verificar que NO muestra saldo
4. UI Recharge -> verificar que solo muestra paquetes de tickets
5. UI Admin -> verificar que no permite crear paquetes tipo "balance"

### Tests Automatizados:
- Agregar E2E test para flujo completo de tickets
- Unit tests para routes modificadas

---

## Notas de Migracion

- Los datos existentes de `pricePerTicket` se pierden (ya no son relevantes)
- Los saldos existentes se mantienen en BD pero no se muestran
- El historial se MANTIENE pero se adapta:
  - Mostrar "Compraste X tickets" en vez de "Recargaste $Y"
  - Mostrar "Se resto 1 ticket" en vez de "Compra por $X"

---

## Historial para el Apoderado (Detalle)

### Que mostrar en el historial:

| Evento | Mensaje al Apoderado |
|--------|---------------------|
| Compra de tickets | "Compraste 10 tickets de almuerzo por $40.000" |
| Consumo de ticket | "Se resto 1 ticket - [nombre] comio el [fecha] a las [hora]" |
| Expiracion | "Expiraron 3 tickets de almuerzo (no usados)" |

### En el Admin:
- Panel de transacciones muestra consumos con:
  - Nombre del estudiante
  - Tipo de ticket consumido
  - Fecha y hora exacta
  - Metodo de validacion (huella, QR, busqueda RUT)

---

## Criterios de Aceptacion

- [ ] No aparece "Saldo" en ninguna pantalla de la app mobile
- [ ] Los paquetes solo permiten tipo "ticket" en admin
- [ ] Comprar tickets NO modifica wallet.balance
- [ ] Validar ticket solo resta de StudentTicket.quantity
- [ ] No hay errores de runtime por campos eliminados
