# PRD: Sistema de Casino Escolar Funcional

## Overview
Completar el sistema de casino escolar para que sea funcional end-to-end. El flujo principal es: admin crea paquetes de tickets → apoderado compra tickets → estudiante usa tickets en el casino (validación manual por RUT/nombre).

## Problem Statement
Las piezas del sistema existen pero no están conectadas completamente. Necesitamos que el flujo completo funcione desde la compra de tickets hasta su uso en el casino.

## Target Users
1. **Admin de Colegio (school_admin)**: Gestiona estudiantes y paquetes
2. **Apoderado (guardian)**: Compra tickets para sus hijos
3. **Operador de Casino (cafeteria_operator)**: Valida estudiantes y marca consumos

## Modelo de Negocio
- **Ticket** = 1 unidad de consumo (ej: 1 almuerzo)
- **Paquete básico**: $5.000 = 1 ticket
- **Paquete grande**: $80.000 = múltiples tickets
- Sin fecha de vencimiento en tickets
- Validación manual: operador busca por RUT/nombre, ve foto, confirma

---

## User Stories

### FASE 1: Gestión de Estudiantes por Admin

#### US-001: Admin ve estudiantes de su colegio
**Priority:** 1
**Description:** Como admin de colegio, quiero ver la lista de estudiantes de mi colegio.
**Acceptance Criteria:**
- [ ] Endpoint GET /api/v1/admin/students retorna estudiantes del colegio del admin
- [ ] Solo accesible por school_admin o super_admin
- [ ] Incluye: nombre, RUT, curso, sección, saldo/tickets actuales
- [ ] Búsqueda por nombre o RUT
- [ ] Paginación

#### US-002: Admin crea estudiante manualmente
**Priority:** 1
**Description:** Como admin, quiero crear estudiantes uno por uno.
**Acceptance Criteria:**
- [ ] Endpoint POST /api/v1/admin/students crea estudiante en el colegio del admin
- [ ] Campos: RUT, nombre, apellido, curso, sección
- [ ] Valida RUT único en el colegio
- [ ] Crea wallet automáticamente con saldo 0

#### US-003: Admin importa estudiantes desde Excel
**Priority:** 2
**Description:** Como admin, quiero importar múltiples estudiantes desde un archivo Excel/CSV.
**Acceptance Criteria:**
- [ ] Endpoint POST /api/v1/admin/students/import acepta archivo
- [ ] Formato: RUT, Nombre, Apellido, Curso, Sección
- [ ] Valida RUTs duplicados, reporta errores por fila
- [ ] Crea wallets automáticamente
- [ ] Retorna resumen: creados, errores, duplicados

#### US-004: Panel Admin - Página de estudiantes
**Priority:** 1
**Description:** Página en admin panel para gestionar estudiantes.
**Acceptance Criteria:**
- [ ] Página /dashboard/students con tabla de estudiantes
- [ ] Columnas: Nombre, RUT, Curso, Sección, Tickets/Saldo
- [ ] Búsqueda por nombre o RUT
- [ ] Botón "Agregar estudiante" abre formulario
- [ ] Botón "Importar Excel" permite subir archivo

---

### FASE 2: Paquetes de Tickets

#### US-005: Admin crea paquetes de tickets
**Priority:** 1
**Description:** Como admin, quiero crear paquetes que los apoderados puedan comprar.
**Acceptance Criteria:**
- [ ] Página /dashboard/packages funcional (ya existe, verificar)
- [ ] Crear paquete: nombre, precio, cantidad de tickets
- [ ] Ejemplo: "Almuerzo diario" $5.000, 1 ticket
- [ ] Ejemplo: "Pack mensual" $80.000, 16 tickets
- [ ] Listar, editar, eliminar paquetes

#### US-006: Apoderado ve y compra paquetes
**Priority:** 1
**Description:** Como apoderado, quiero comprar tickets para mi hijo.
**Acceptance Criteria:**
- [ ] Pantalla de recarga muestra paquetes del colegio
- [ ] Al seleccionar, muestra: nombre, precio, tickets incluidos
- [ ] Botón confirmar procesa pago (mock)
- [ ] Actualiza tickets del estudiante
- [ ] Muestra confirmación con nuevos tickets

---

### FASE 3: Interfaz del Casino (POS)

#### US-007: Vista POS para operador del casino
**Priority:** 1
**Description:** Como operador, necesito una interfaz simple para buscar y validar estudiantes.
**Acceptance Criteria:**
- [ ] Página /dashboard/pos (nueva) optimizada para tablet
- [ ] Campo de búsqueda grande (RUT o nombre)
- [ ] Resultados muestran: foto, nombre, curso, tickets disponibles
- [ ] Diseño simple, botones grandes, fácil de usar

#### US-008: Operador marca consumo de ticket
**Priority:** 1
**Description:** Como operador, quiero marcar que un estudiante consumió un ticket.
**Acceptance Criteria:**
- [ ] Botón "Marcar consumo" en resultado de búsqueda
- [ ] Descuenta 1 ticket del estudiante
- [ ] Muestra tickets restantes
- [ ] Registra transacción con fecha/hora
- [ ] Confirmación visual clara (verde = éxito)

#### US-009: Historial de consumos del día
**Priority:** 2
**Description:** Como operador, quiero ver los consumos que he registrado hoy.
**Acceptance Criteria:**
- [ ] Lista de consumos del día en la misma página POS
- [ ] Muestra: hora, estudiante, tickets restantes
- [ ] Opción de anular último consumo (por error)

---

### FASE 4: Visualización para Apoderado

#### US-010: Home muestra tickets disponibles
**Priority:** 2
**Description:** Como apoderado, quiero ver cuántos tickets tiene mi hijo.
**Acceptance Criteria:**
- [ ] Card en home muestra "Tickets: X disponibles"
- [ ] Se actualiza al comprar o usar tickets
- [ ] Diseño claro y visible

#### US-011: Historial muestra consumos
**Priority:** 2
**Description:** Como apoderado, quiero ver cuándo mi hijo usó sus tickets.
**Acceptance Criteria:**
- [ ] Historial muestra consumos del casino
- [ ] Cada entrada: fecha, hora, "Consumo en casino"
- [ ] Muestra tickets restantes después de cada uso

---

### FASE 5: Vinculación Apoderado-Estudiante

#### US-012: Apoderado vincula estudiante existente
**Priority:** 2
**Description:** Como apoderado, quiero vincular a mi hijo que ya existe en el sistema.
**Acceptance Criteria:**
- [ ] En "Agregar estudiante", buscar por RUT
- [ ] Si existe en el colegio, mostrar nombre y permitir vincular
- [ ] Crear relación GuardianStudent
- [ ] No duplicar estudiante si ya existe

---

## Technical Considerations

### Existente que se reutiliza
- Modelos: School, Student, Wallet, StudentTicket, RechargePackage
- Endpoints de autenticación, estudiantes, wallets
- Panel admin Next.js con páginas base
- App móvil con pantallas de recarga e historial

### Por crear/modificar
- Endpoints admin con filtro por colegio del usuario
- Página POS optimizada para tablet
- Endpoint de importación Excel (multer + xlsx)
- Ajustar pantalla de recarga en app móvil

### Seguridad
- school_admin solo ve/modifica datos de su colegio
- cafeteria_operator solo puede marcar consumos
- Validar permisos en cada endpoint

## Out of Scope (Fase posterior)
- Pasarelas de pago reales (Webpay, Flow)
- Validación biométrica
- Push notifications
- Fotos de estudiantes
- Reportes avanzados

## Success Metrics
- Admin puede crear estudiantes (manual y Excel)
- Admin puede crear paquetes de tickets
- Apoderado puede comprar tickets
- Operador puede buscar estudiante y marcar consumo
- Flujo completo funciona end-to-end
