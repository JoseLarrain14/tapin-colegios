# PRD: Mejoras Admin Panel - Dashboard y Estudiantes

**Branch:** `feature/admin-improvements`
**Prioridad:** HIGH

## Descripción

Corregir problemas de UX en el panel admin: error 400 al crear estudiante con RUT, estadísticas confusas en dashboard, y elementos de navegación incorrectos para school_admin.

---

## Contexto

### Problema
El panel admin tiene problemas de UX que dificultan la gestión del colegio.

### Causa Raíz
- Validación de RUT sin feedback claro
- Estadísticas que cuentan guardians en vez de estudiantes
- UI no filtrada por rol

### Estado de la Base de Datos
- Estudiantes: 2 (Juan Pérez, Sofia Perez)
- Apoderados: 1 (María González)
- Colegios: 10 (9 sin admin)

### Datos de Prueba

**Credenciales:**
| Rol | Email | Password |
|-----|-------|----------|
| school_admin | admin@colegio.cl | admin123 |
| super_admin | super@tapin.cl | super123 |

**RUTs Válidos:**
- 12345678-5
- 11111111-1
- 22222222-2
- 98765432-5

---

## User Stories

### US-030: Mejorar mensaje de error al crear estudiante con RUT inválido
**Prioridad:** 1 | **Estado:** pending

**Descripción:**
El error 400 al crear estudiante muestra "Datos inválidos" sin explicar qué está mal con el RUT. Modificar el backend para retornar el dígito verificador esperado en el mensaje de error.

**Archivos:** `packages/api/src/routes/admin.routes.ts`

**Criterios de Aceptación:**
- [ ] Al enviar RUT '12345678-9', error incluye "El dígito verificador correcto es 5"
- [ ] Mensaje de error en español y descriptivo
- [ ] Error llega al frontend y se muestra en el modal de crear estudiante
- [ ] curl POST /admin/students con RUT inválido retorna mensaje con dígito esperado

**Verificación Visual:**
Ir a /students, crear estudiante con RUT 12345678-9, verificar que error muestra dígito correcto

---

### US-031: Agregar validación de RUT en frontend con feedback visual
**Prioridad:** 1 | **Estado:** pending

**Descripción:**
El formulario de crear estudiante no valida el RUT antes de enviar. Agregar validación en tiempo real con indicador verde/rojo y mostrar dígito esperado si es inválido.

**Archivos:** `apps/admin/src/app/(dashboard)/students/page.tsx`

**Criterios de Aceptación:**
- [ ] Al escribir RUT, input muestra borde rojo si inválido, verde si válido
- [ ] Si RUT inválido, texto debajo del input muestra "Dígito esperado: X"
- [ ] Botón "Crear" deshabilitado mientras RUT sea inválido
- [ ] Al escribir RUT válido (12345678-5), borde verde y botón habilitado

**Verificación Visual:**
Ir a /students, abrir modal, escribir 12345678-9 (borde rojo), escribir 12345678-5 (borde verde)

---

### US-032: Agregar "Estudiantes Activos" al dashboard
**Prioridad:** 2 | **Estado:** pending

**Descripción:**
El dashboard no muestra cantidad de estudiantes. Agregar card "Estudiantes Activos" con conteo y cambio porcentual.

**Archivos:**
- `packages/api/src/routes/stats.routes.ts`
- `apps/admin/src/app/(dashboard)/page.tsx`

**Criterios de Aceptación:**
- [ ] Dashboard muestra card "Estudiantes Activos" con valor 2
- [ ] Card tiene icono GraduationCap de lucide-react
- [ ] Card muestra cambio porcentual vs mes anterior
- [ ] Para school_admin, solo cuenta estudiantes de su colegio
- [ ] API endpoint /stats/dashboard retorna activeStudents en la respuesta

**Verificación Visual:**
Ir al dashboard (/), verificar que existe card "Estudiantes Activos: 2"

---

### US-033: Renombrar "Usuarios Totales" a "Apoderados"
**Prioridad:** 2 | **Estado:** pending

**Descripción:**
La card "Usuarios Totales" es confusa porque cuenta guardians. Renombrar a "Apoderados" para claridad.

**Archivos:** `apps/admin/src/app/(dashboard)/page.tsx`

**Criterios de Aceptación:**
- [ ] Card dice "Apoderados" en vez de "Usuarios Totales"
- [ ] El valor sigue siendo 1 (conteo de guardians)
- [ ] El icono sigue siendo Users

**Verificación Visual:**
Ir al dashboard, verificar que card dice "Apoderados: 1"

---

### US-034: Ocultar "Colegios Activos" para school_admin
**Prioridad:** 3 | **Estado:** pending

**Descripción:**
La card "Colegios Activos" no tiene sentido para school_admin que solo gestiona un colegio. Ocultar para school_admin, mostrar solo para super_admin.

**Archivos:** `apps/admin/src/app/(dashboard)/page.tsx`

**Criterios de Aceptación:**
- [ ] school_admin NO ve card "Colegios Activos"
- [ ] super_admin SÍ ve card "Colegios Activos"
- [ ] El grid de cards se ajusta correctamente

**Verificación Visual:**
Login como admin@colegio.cl, ir a dashboard, verificar que NO existe card "Colegios Activos"

---

### US-035: Ocultar sección "Colegios" del menú para school_admin
**Prioridad:** 3 | **Estado:** pending

**Descripción:**
school_admin ve link a "/schools" en el sidebar pero no debería. Ocultar para school_admin.

**Archivos:** `apps/admin/src/app/(dashboard)/layout.tsx`

**Criterios de Aceptación:**
- [ ] school_admin NO ve "Colegios" en el sidebar
- [ ] super_admin SÍ ve "Colegios" en el sidebar
- [ ] Navegación móvil también respeta esta regla

**Verificación Visual:**
Login como admin@colegio.cl, verificar que sidebar NO tiene link "Colegios"

---

### US-036: Cambiar "Agregar Colegio" por "Agregar Estudiante" en acciones rápidas
**Prioridad:** 3 | **Estado:** pending

**Descripción:**
El botón "Agregar Colegio" no tiene sentido para school_admin. Reemplazar con "Agregar Estudiante" que navega a /students.

**Archivos:** `apps/admin/src/app/(dashboard)/page.tsx`

**Criterios de Aceptación:**
- [ ] school_admin ve "Agregar Estudiante" en vez de "Agregar Colegio"
- [ ] super_admin sigue viendo "Agregar Colegio"
- [ ] Click en "Agregar Estudiante" navega a /students

**Verificación Visual:**
Login como admin@colegio.cl, ir a dashboard, verificar que Acciones Rápidas muestra "Agregar Estudiante"

---

### US-037: Agregar Saldo Total y Tickets Totales al dashboard
**Prioridad:** 4 | **Estado:** pending

**Descripción:**
Agregar métricas de "Saldo Total" (suma de wallets) y "Tickets Totales" (suma de tickets) al dashboard.

**Archivos:**
- `packages/api/src/routes/stats.routes.ts`
- `apps/admin/src/app/(dashboard)/page.tsx`

**Criterios de Aceptación:**
- [ ] Dashboard muestra card "Saldo Total: $15,000"
- [ ] Dashboard muestra card "Tickets Totales: 16"
- [ ] Valores se calculan solo para el colegio del admin
- [ ] API endpoint /stats/dashboard retorna totalBalance y totalTickets

**Verificación Visual:**
Ir al dashboard, verificar cards "Saldo Total: $15,000" y "Tickets Totales: 16"

---

## Resumen de Archivos a Modificar

| Archivo | Stories |
|---------|---------|
| `packages/api/src/routes/admin.routes.ts` | US-030 |
| `packages/api/src/routes/stats.routes.ts` | US-032, US-037 |
| `apps/admin/src/app/(dashboard)/page.tsx` | US-032, US-033, US-034, US-036, US-037 |
| `apps/admin/src/app/(dashboard)/layout.tsx` | US-035 |
| `apps/admin/src/app/(dashboard)/students/page.tsx` | US-031 |

---

## Checklist Final

Antes de marcar cada story como `passes: true`:
- [ ] Build exitoso: `pnpm build:api && pnpm build:admin`
- [ ] Sin errores TypeScript
- [ ] Verificación visual completada
- [ ] Funcionalidad probada manualmente
