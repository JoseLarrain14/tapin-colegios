# PRD: Sistema de Transacciones Mejorado

## Overview
Crear un sistema de transacciones robusto en el panel admin que permita ver, filtrar, exportar y analizar todas las operaciones del casino: tickets validados, ventas, recargas y más. El objetivo es dar visibilidad completa al operador y administrador sobre la actividad del día.

## Problem Statement
La página de transacciones actual es básica y no permite ver de forma clara qué tickets se han validado hoy, cuántos consumos hubo, ni filtrar o exportar datos. Los administradores necesitan una herramienta completa para auditoría y seguimiento.

## Target Users
1. **Admin de Colegio (school_admin)**: Ve transacciones de su colegio
2. **Super Admin (super_admin)**: Ve todas las transacciones
3. **Operador de Casino (cafeteria_operator)**: Ve consumos del día de su cafetería

## Modelo de Datos Existente
- **Transaction**: Transacciones del casino (compras, consumos de tickets)
- **WalletLog**: Historial de movimientos de billetera (depósitos, compras, reembolsos)
- **Payment**: Pagos/recargas realizados por apoderados
- **StudentTicket**: Tickets disponibles por estudiante

---

## User Stories

### FASE 1: Dashboard de Métricas del Día

#### US-013: Cards de resumen del día
**Priority:** 1
**Description:** Como admin, quiero ver métricas resumidas del día en la parte superior de la página de transacciones.
**Acceptance Criteria:**
- [ ] 4 cards en la parte superior de /dashboard/transactions
- [ ] Card 1: "Tickets validados hoy" - cantidad total
- [ ] Card 2: "Ventas del día" - total en CLP
- [ ] Card 3: "Recargas del día" - total en CLP
- [ ] Card 4: "Transacciones totales" - cantidad de operaciones
- [ ] Cards se actualizan al cambiar filtros de fecha
- [ ] Diseño con iconos y colores distintivos

#### US-014: Endpoint de estadísticas del día
**Priority:** 1
**Description:** Crear endpoint que retorne estadísticas agregadas para el dashboard.
**Acceptance Criteria:**
- [ ] Endpoint GET /api/v1/admin/transactions/stats
- [ ] Parámetros: dateFrom, dateTo (opcional, default hoy)
- [ ] Retorna: ticketsConsumed, totalSales, totalRecharges, transactionCount
- [ ] Filtra por colegio del admin (school_admin) o todos (super_admin)
- [ ] Solo accesible por school_admin o super_admin

---

### FASE 2: Tabla de Transacciones Mejorada

#### US-015: Tabla con datos completos
**Priority:** 1
**Description:** Como admin, quiero ver una tabla detallada con todas las transacciones.
**Acceptance Criteria:**
- [ ] Tabla muestra columnas: Fecha/Hora, Estudiante, RUT, Tipo, Método, Items/Descripción, Monto, Operador
- [ ] Tipo incluye: Consumo ticket, Compra, Recarga, Reembolso, Ajuste
- [ ] Método incluye: RUT, QR, App, Huella (validationMethod)
- [ ] Columna Operador muestra quién validó la transacción
- [ ] Paginación funcional (10, 25, 50 por página)
- [ ] Ordenamiento por fecha descendente por defecto

#### US-016: Endpoint de transacciones unificado
**Priority:** 1
**Description:** Endpoint que retorne transacciones combinadas (Transaction + WalletLog + Payment).
**Acceptance Criteria:**
- [ ] Endpoint GET /api/v1/admin/transactions
- [ ] Combina datos de Transaction, WalletLog y Payment
- [ ] Parámetros: page, limit, dateFrom, dateTo, type, studentId, search
- [ ] Retorna datos normalizados con campos consistentes
- [ ] Incluye información del estudiante (nombre, RUT, curso)
- [ ] Incluye información del operador que validó (si aplica)
- [ ] Filtra por colegio del admin automáticamente

---

### FASE 3: Filtros Avanzados

#### US-017: Panel de filtros colapsable
**Priority:** 1
**Description:** Como admin, quiero filtrar transacciones por múltiples criterios.
**Acceptance Criteria:**
- [ ] Panel de filtros colapsable/expandible
- [ ] Filtro por rango de fechas (desde - hasta) con date picker
- [ ] Filtro por tipo de transacción (multiselect)
- [ ] Filtro por método de validación (multiselect)
- [ ] Filtro de búsqueda por nombre o RUT del estudiante
- [ ] Botón "Limpiar filtros" restaura valores por defecto
- [ ] Filtros se reflejan en URL como query params

#### US-018: Filtro por monto
**Priority:** 2
**Description:** Como admin, quiero filtrar por rango de montos.
**Acceptance Criteria:**
- [ ] Input "Monto mínimo" y "Monto máximo" en el panel de filtros
- [ ] Filtra transacciones dentro del rango especificado
- [ ] Funciona con endpoint de transacciones

---

### FASE 4: Pestañas de Vista Rápida

#### US-019: Pestañas de filtrado rápido
**Priority:** 1
**Description:** Como admin, quiero pestañas para ver rápidamente diferentes tipos de transacciones.
**Acceptance Criteria:**
- [ ] 4 pestañas debajo del dashboard: "Todas", "Tickets Hoy", "Ventas", "Recargas"
- [ ] "Todas" muestra todas las transacciones
- [ ] "Tickets Hoy" filtra solo consumos de tickets del día actual
- [ ] "Ventas" filtra compras con saldo (type: purchase, amount > 0)
- [ ] "Recargas" filtra depósitos/recargas (type: deposit)
- [ ] Cada pestaña muestra contador de registros
- [ ] Al cambiar pestaña, actualiza tabla y respeta otros filtros

---

### FASE 5: Exportación de Datos

#### US-020: Botón de exportar a CSV
**Priority:** 1
**Description:** Como admin, quiero exportar las transacciones filtradas a CSV.
**Acceptance Criteria:**
- [ ] Botón "Exportar CSV" visible en la página
- [ ] Exporta las transacciones según filtros actuales
- [ ] Archivo incluye todas las columnas de la tabla
- [ ] Nombre del archivo: transacciones_YYYY-MM-DD.csv
- [ ] Codificación UTF-8 para caracteres especiales

#### US-021: Endpoint de exportación
**Priority:** 1
**Description:** Endpoint que genere archivo CSV de transacciones.
**Acceptance Criteria:**
- [ ] Endpoint GET /api/v1/admin/transactions/export
- [ ] Acepta mismos parámetros de filtro que el listado
- [ ] Retorna archivo CSV con Content-Type apropiado
- [ ] Limita a máximo 10,000 registros por exportación
- [ ] Incluye headers descriptivos en español

---

### FASE 6: Vista de Detalle

#### US-022: Modal de detalle de transacción
**Priority:** 2
**Description:** Como admin, quiero ver el detalle completo de una transacción al hacer clic.
**Acceptance Criteria:**
- [ ] Al hacer clic en una fila, abre modal con detalle
- [ ] Muestra toda la información de la transacción
- [ ] Si tiene items, muestra lista detallada
- [ ] Si tiene tickets, muestra tipo y cantidad
- [ ] Muestra saldo antes y después (si aplica)
- [ ] Botón cerrar modal

---

## Technical Considerations

### Endpoints a Crear
1. `GET /api/v1/admin/transactions` - Listado unificado con filtros
2. `GET /api/v1/admin/transactions/stats` - Estadísticas agregadas
3. `GET /api/v1/admin/transactions/export` - Exportación CSV

### Modelos a Consultar
- Transaction (consumos en casino)
- WalletLog (movimientos de billetera)
- Payment (pagos/recargas)
- Student (datos del estudiante)
- User (datos del operador)

### UI Components
- Dashboard cards con métricas
- Tabs para filtrado rápido
- Filtros colapsables
- Tabla con paginación y ordenamiento
- Modal de detalle
- Botón de exportación

### Seguridad
- school_admin solo ve transacciones de su colegio
- super_admin ve todas
- Validar permisos en cada endpoint

## Out of Scope (Fase posterior)
- Gráficos de tendencias
- Exportación a Excel/PDF
- Alertas automáticas
- Reportes programados
- Dashboard en tiempo real con WebSockets

## Success Metrics
- Admin puede ver resumen del día en segundos
- Admin puede filtrar por cualquier criterio
- Admin puede exportar datos para análisis externo
- Operador puede ver qué tickets validó hoy
- Datos son precisos y coinciden con registros
