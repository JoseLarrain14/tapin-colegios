# PRD: Sistema de Calendario de Menú de Cafetería

**Branch:** `feature/menu-calendar`
**Prioridad:** HIGH

## Descripción

Sistema de planificación visual de menú para la cafetería escolar. El admin puede gestionar platos, crear templates de menú, configurar un patrón semanal, y asignar menús a fechas específicas mediante un calendario con drag-and-drop. Los usuarios ven el menú del día seleccionado en la app móvil.

---

## Contexto

### Problema
Actualmente los platos tienen `availableDays` estático. No hay forma visual de planificar el menú, ni de asignar platos específicos a fechas, ni de crear templates reutilizables.

### Solución
Una página de calendario en el admin donde:
- Se ven todos los días del mes
- Se arrastran platos/templates a días
- Se configura un patrón semanal base
- Se sobrescriben días específicos con menús diferentes

### Estructura
Todo el feature vive en UNA SOLA página: `/menu/calendar` que incluye:
- Vista de calendario mensual
- Sidebar con platos y templates
- Panel de patrón semanal
- Modal de detalle de día

---

## Datos de Prueba

**Credenciales:**
| Rol | Email | Password |
|-----|-------|----------|
| school_admin | admin@colegio.cl | admin123 |

**Platos existentes en DB:**
- Verificar con `prisma.menuItem.findMany()` qué platos existen
- Si no hay, el seed debe crear platos de ejemplo

---

## FASE 1: BACKEND - Modelos y APIs Base

### US-100: Crear modelo MenuTemplate en schema.prisma
**Prioridad:** 1 | **Estado:** pending

**Descripción:**
Agregar el modelo MenuTemplate para templates reutilizables de menú.

**Archivos:** `packages/api/prisma/schema.prisma`

**Criterios de Aceptación:**
- [ ] Modelo MenuTemplate creado con campos: id, cafeteriaId, name, description, color, active, createdAt, updatedAt
- [ ] Modelo MenuTemplateItem creado con campos: id, templateId, menuItemId, sortOrder
- [ ] Relación MenuTemplate -> Cafeteria (onDelete: Cascade)
- [ ] Relación MenuTemplateItem -> MenuTemplate y MenuItem
- [ ] Constraint unique en [templateId, menuItemId]
- [ ] `npx prisma migrate dev` ejecutado sin errores
- [ ] `npx prisma generate` ejecutado sin errores

**Verificación Terminal:**
```bash
npx prisma migrate dev --name add_menu_template
# Debe mostrar "Migration applied"
```

---

### US-101: Crear modelo WeeklyPattern en schema.prisma
**Prioridad:** 1 | **Estado:** pending

**Descripción:**
Agregar modelos para el patrón semanal que se repite automáticamente.

**Archivos:** `packages/api/prisma/schema.prisma`

**Criterios de Aceptación:**
- [ ] Modelo WeeklyPattern con campos: id, cafeteriaId (unique), active, createdAt, updatedAt
- [ ] Modelo WeeklyPatternDay con campos: id, patternId, dayOfWeek (1-5)
- [ ] Modelo WeeklyPatternItem con campos: id, patternDayId, menuItemId, sortOrder
- [ ] Constraint unique en [patternId, dayOfWeek]
- [ ] Constraint unique en [patternDayId, menuItemId]
- [ ] Relaciones correctas con onDelete: Cascade
- [ ] Migración ejecutada sin errores

**Verificación Terminal:**
```bash
npx prisma migrate dev --name add_weekly_pattern
```

---

### US-102: Crear modelo DailyMenuAssignment en schema.prisma
**Prioridad:** 1 | **Estado:** pending

**Descripción:**
Agregar modelos para asignaciones de menú a fechas específicas.

**Archivos:** `packages/api/prisma/schema.prisma`

**Criterios de Aceptación:**
- [ ] Modelo DailyMenuAssignment con campos: id, cafeteriaId, date, note, createdAt, updatedAt
- [ ] Modelo DailyMenuAssignmentItem con campos: id, assignmentId, menuItemId, sortOrder
- [ ] Constraint unique en [cafeteriaId, date]
- [ ] Index en [date] para búsquedas eficientes
- [ ] Constraint unique en [assignmentId, menuItemId]
- [ ] Migración ejecutada sin errores

**Verificación Terminal:**
```bash
npx prisma migrate dev --name add_daily_assignment
```

---

### US-103: Agregar relaciones a modelos existentes
**Prioridad:** 1 | **Estado:** pending

**Descripción:**
Agregar las relaciones inversas a MenuItem y Cafeteria.

**Archivos:** `packages/api/prisma/schema.prisma`

**Criterios de Aceptación:**
- [ ] MenuItem tiene relación: templateItems MenuTemplateItem[]
- [ ] MenuItem tiene relación: patternItems WeeklyPatternItem[]
- [ ] MenuItem tiene relación: assignmentItems DailyMenuAssignmentItem[]
- [ ] Cafeteria tiene relación: menuTemplates MenuTemplate[]
- [ ] Cafeteria tiene relación: weeklyPattern WeeklyPattern?
- [ ] Cafeteria tiene relación: dailyAssignments DailyMenuAssignment[]
- [ ] `npx prisma generate` sin errores
- [ ] `cd packages/api && npx tsc --noEmit` sin errores

**Verificación Terminal:**
```bash
npx prisma generate && cd packages/api && npx tsc --noEmit
```

---

### US-104: Crear API CRUD de templates
**Prioridad:** 2 | **Estado:** pending

**Descripción:**
Crear endpoints para gestionar templates de menú.

**Archivos:**
- `packages/api/src/routes/menu-templates.routes.ts` (nuevo)
- `packages/api/src/index.ts` (registrar rutas)

**Criterios de Aceptación:**
- [ ] Archivo menu-templates.routes.ts creado
- [ ] GET /api/v1/menu-templates/:cafeteriaId retorna lista de templates con items
- [ ] POST /api/v1/menu-templates/:cafeteriaId crea template
- [ ] PUT /api/v1/menu-templates/:cafeteriaId/:templateId actualiza template
- [ ] DELETE /api/v1/menu-templates/:cafeteriaId/:templateId elimina template
- [ ] POST /api/v1/menu-templates/:cafeteriaId/:templateId/items agrega item
- [ ] DELETE /api/v1/menu-templates/:cafeteriaId/:templateId/items/:itemId quita item
- [ ] Validación con Zod schemas
- [ ] Auth requerido (Bearer token)
- [ ] Rutas registradas en index.ts
- [ ] Build API sin errores: `pnpm build:api`

**Verificación Terminal:**
```bash
curl -X GET http://localhost:3000/api/v1/menu-templates/demo-cafeteria -H "Authorization: Bearer $TOKEN"
# Debe retornar array (vacío o con templates)
```

---

### US-105: Crear API patrón semanal
**Prioridad:** 2 | **Estado:** pending

**Descripción:**
Crear endpoints para gestionar el patrón semanal.

**Archivos:**
- `packages/api/src/routes/menu-planning.routes.ts` (nuevo)
- `packages/api/src/index.ts` (registrar rutas)

**Criterios de Aceptación:**
- [ ] Archivo menu-planning.routes.ts creado
- [ ] GET /api/v1/menu-planning/:cafeteriaId/weekly-pattern retorna patrón con días e items
- [ ] PUT /api/v1/menu-planning/:cafeteriaId/weekly-pattern/day/:dayOfWeek actualiza día
- [ ] Crea WeeklyPattern automáticamente si no existe
- [ ] dayOfWeek validado: 1-5 (lunes a viernes)
- [ ] Retorna items con datos del MenuItem incluidos
- [ ] Build API sin errores

**Verificación Terminal:**
```bash
curl -X GET http://localhost:3000/api/v1/menu-planning/demo-cafeteria/weekly-pattern -H "Authorization: Bearer $TOKEN"
```

---

### US-106: Crear API asignaciones diarias
**Prioridad:** 2 | **Estado:** pending

**Descripción:**
Crear endpoints para asignar menús a fechas específicas.

**Archivos:** `packages/api/src/routes/menu-planning.routes.ts`

**Criterios de Aceptación:**
- [ ] GET /api/v1/menu-planning/:cafeteriaId/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD retorna asignaciones en rango
- [ ] GET /api/v1/menu-planning/:cafeteriaId/date/:date retorna menú para fecha específica
- [ ] PUT /api/v1/menu-planning/:cafeteriaId/date/:date crea/actualiza asignación
- [ ] DELETE /api/v1/menu-planning/:cafeteriaId/date/:date elimina asignación (vuelve a patrón)
- [ ] Formato de fecha: YYYY-MM-DD
- [ ] Build API sin errores

**Verificación Terminal:**
```bash
curl -X GET "http://localhost:3000/api/v1/menu-planning/demo-cafeteria/calendar?from=2026-01-01&to=2026-01-31" -H "Authorization: Bearer $TOKEN"
```

---

### US-107: Crear endpoint de resolución de menú para mobile
**Prioridad:** 2 | **Estado:** pending

**Descripción:**
Endpoint que resuelve qué menú mostrar para una fecha: primero busca asignación específica, luego patrón semanal, luego fallback al sistema actual.

**Archivos:** `packages/api/src/routes/menu-planning.routes.ts`

**Criterios de Aceptación:**
- [ ] GET /api/v1/menu-planning/:cafeteriaId/resolve/:date retorna menú resuelto
- [ ] Respuesta incluye: source ('assignment' | 'pattern' | 'default'), items, date, dayOfWeek
- [ ] Lógica de resolución:
  1. Buscar DailyMenuAssignment para la fecha
  2. Si no existe, buscar WeeklyPattern para el día de la semana
  3. Si no hay patrón, usar MenuItem.availableDays (sistema actual)
- [ ] Items incluyen: id, name, description, price, imageUrl, category
- [ ] Build API sin errores

**Verificación Terminal:**
```bash
curl -X GET http://localhost:3000/api/v1/menu-planning/demo-cafeteria/resolve/2026-01-20 -H "Authorization: Bearer $TOKEN"
# Debe retornar {source: "...", items: [...]}
```

---

## FASE 2: ADMIN - Instalar Dependencias y Componentes Base

### US-110: Instalar dependencias dnd-kit y date-fns
**Prioridad:** 3 | **Estado:** pending

**Descripción:**
Instalar las librerías necesarias para drag-and-drop y manejo de fechas.

**Archivos:** `apps/admin/package.json`

**Criterios de Aceptación:**
- [ ] Ejecutar: `cd apps/admin && pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities date-fns`
- [ ] package.json actualizado con las 4 dependencias
- [ ] `pnpm install` sin errores
- [ ] `pnpm build:admin` sin errores

**Verificación Terminal:**
```bash
cd apps/admin && pnpm build
```

---

### US-111: Agregar métodos de templates al API client
**Prioridad:** 3 | **Estado:** pending

**Descripción:**
Agregar métodos al cliente API para gestionar templates.

**Archivos:** `apps/admin/src/lib/api.ts`

**Criterios de Aceptación:**
- [ ] apiClient.menuTemplates.list(cafeteriaId) agregado
- [ ] apiClient.menuTemplates.create(cafeteriaId, data) agregado
- [ ] apiClient.menuTemplates.update(cafeteriaId, templateId, data) agregado
- [ ] apiClient.menuTemplates.delete(cafeteriaId, templateId) agregado
- [ ] apiClient.menuTemplates.addItem(cafeteriaId, templateId, menuItemId) agregado
- [ ] apiClient.menuTemplates.removeItem(cafeteriaId, templateId, itemId) agregado
- [ ] TypeScript compila sin errores

**Verificación Terminal:**
```bash
cd apps/admin && npx tsc --noEmit
```

---

### US-112: Agregar métodos de planning al API client
**Prioridad:** 3 | **Estado:** pending

**Descripción:**
Agregar métodos al cliente API para gestionar planificación.

**Archivos:** `apps/admin/src/lib/api.ts`

**Criterios de Aceptación:**
- [ ] apiClient.menuPlanning.getWeeklyPattern(cafeteriaId) agregado
- [ ] apiClient.menuPlanning.updatePatternDay(cafeteriaId, dayOfWeek, items) agregado
- [ ] apiClient.menuPlanning.getCalendar(cafeteriaId, from, to) agregado
- [ ] apiClient.menuPlanning.getDateMenu(cafeteriaId, date) agregado
- [ ] apiClient.menuPlanning.setDateMenu(cafeteriaId, date, items) agregado
- [ ] apiClient.menuPlanning.clearDateMenu(cafeteriaId, date) agregado
- [ ] TypeScript compila sin errores

**Verificación Terminal:**
```bash
cd apps/admin && npx tsc --noEmit
```

---

## FASE 3: ADMIN - Página de Calendario

### US-120: Crear estructura de página /menu/calendar
**Prioridad:** 4 | **Estado:** pending

**Descripción:**
Crear la página base del calendario con layout de 2 columnas.

**Archivos:** `apps/admin/src/app/(dashboard)/menu/calendar/page.tsx` (nuevo)

**Criterios de Aceptación:**
- [ ] Archivo page.tsx creado en apps/admin/src/app/(dashboard)/menu/calendar/
- [ ] Layout: columna izquierda (70%) para calendario, derecha (30%) para sidebar
- [ ] Header con título "Calendario de Menú" y navegación de mes (< Enero 2026 >)
- [ ] useState para mes actual (año y mes)
- [ ] useQuery para obtener cafeteriaId del admin
- [ ] Loading state mientras carga config
- [ ] Página accesible en /menu/calendar
- [ ] Build admin sin errores

**Verificación Visual (Playwright):**
```typescript
await page.goto('/menu/calendar');
await expect(page.locator('h1')).toContainText('Calendario');
await page.screenshot({ path: 'screenshots/us-120-calendar-page.png' });
```

---

### US-121: Implementar grid de calendario mensual
**Prioridad:** 4 | **Estado:** pending

**Descripción:**
Mostrar grid de 7 columnas (Lun-Dom) con los días del mes.

**Archivos:** `apps/admin/src/app/(dashboard)/menu/calendar/page.tsx`

**Criterios de Aceptación:**
- [ ] Header con días de la semana: Lun, Mar, Mié, Jue, Vie, Sáb, Dom
- [ ] Grid muestra todos los días del mes actual
- [ ] Días del mes anterior/siguiente en gris claro
- [ ] Día actual destacado (borde azul)
- [ ] Sábados y domingos en fondo gris (no laborables)
- [ ] Cada celda muestra número del día
- [ ] Función getMonthDays(year, month) calcula días correctamente
- [ ] Navegación < > cambia mes y recalcula grid

**Verificación Visual (Playwright):**
```typescript
await page.goto('/menu/calendar');
// Verificar que hay 7 columnas
await expect(page.locator('.calendar-header-cell')).toHaveCount(7);
// Verificar que hay días del mes
await expect(page.locator('.calendar-day')).toHaveCount.greaterThan(28);
await page.screenshot({ path: 'screenshots/us-121-calendar-grid.png' });
```

---

### US-122: Mostrar indicadores de menú en días del calendario
**Prioridad:** 4 | **Estado:** pending

**Descripción:**
Cada día debe mostrar un indicador visual si tiene menú asignado.

**Archivos:** `apps/admin/src/app/(dashboard)/menu/calendar/page.tsx`

**Criterios de Aceptación:**
- [ ] useQuery para obtener asignaciones del mes: menuPlanning.getCalendar(cafeteriaId, from, to)
- [ ] useQuery para obtener patrón semanal: menuPlanning.getWeeklyPattern(cafeteriaId)
- [ ] Día con asignación específica: círculo azul
- [ ] Día sin asignación pero con patrón: círculo verde punteado
- [ ] Día sin menú: sin indicador
- [ ] Tooltip al hover muestra cantidad de platos
- [ ] Refetch al cambiar mes

**Verificación Visual (Playwright):**
```typescript
await page.goto('/menu/calendar');
// Verificar indicadores (si hay datos en DB)
await page.screenshot({ path: 'screenshots/us-122-calendar-indicators.png' });
```

---

### US-123: Implementar sidebar con lista de platos
**Prioridad:** 4 | **Estado:** pending

**Descripción:**
Sidebar derecho muestra lista de platos disponibles para arrastrar.

**Archivos:** `apps/admin/src/app/(dashboard)/menu/calendar/page.tsx`

**Criterios de Aceptación:**
- [ ] Sidebar ocupa 30% derecho de la pantalla
- [ ] Título "Platos Disponibles"
- [ ] useQuery para obtener platos: menu.list(cafeteriaId)
- [ ] Lista de platos con: nombre, precio, categoría (si tiene)
- [ ] Cada plato es un componente draggable (preparado para dnd-kit)
- [ ] Buscador de platos en la parte superior
- [ ] Filtro por categoría (dropdown)
- [ ] Scroll si hay muchos platos

**Verificación Visual (Playwright):**
```typescript
await page.goto('/menu/calendar');
await expect(page.locator('text=Platos Disponibles')).toBeVisible();
await page.screenshot({ path: 'screenshots/us-123-sidebar-items.png' });
```

---

### US-124: Implementar drag-and-drop de platos a días
**Prioridad:** 5 | **Estado:** pending

**Descripción:**
Permitir arrastrar platos desde el sidebar a días del calendario.

**Archivos:** `apps/admin/src/app/(dashboard)/menu/calendar/page.tsx`

**Criterios de Aceptación:**
- [ ] DndContext de @dnd-kit/core envuelve la página
- [ ] Platos en sidebar son Draggable
- [ ] Días del calendario son Droppable
- [ ] Al soltar plato en día: mutación setDateMenu
- [ ] Feedback visual durante drag (plato sigue cursor)
- [ ] Highlight en día cuando plato está sobre él
- [ ] Toast de confirmación al agregar plato
- [ ] Refetch de calendario después de agregar

**Verificación Manual:**
- Arrastrar un plato del sidebar a un día
- Verificar que el indicador aparece en el día
- Verificar toast de confirmación

---

### US-125: Implementar modal de detalle de día
**Prioridad:** 5 | **Estado:** pending

**Descripción:**
Al hacer click en un día, mostrar modal con el menú de ese día.

**Archivos:** `apps/admin/src/app/(dashboard)/menu/calendar/page.tsx`

**Criterios de Aceptación:**
- [ ] Click en día abre modal
- [ ] Modal muestra fecha formateada (ej: "Lunes 20 de Enero 2026")
- [ ] Lista de platos asignados con nombre y precio
- [ ] Botón X para quitar cada plato
- [ ] Al quitar plato: mutación para actualizar asignación
- [ ] Botón "Usar Patrón Semanal" que elimina la asignación específica
- [ ] Indicador de fuente: "Asignación específica" o "Patrón semanal"
- [ ] Botón cerrar modal

**Verificación Visual (Playwright):**
```typescript
await page.goto('/menu/calendar');
await page.click('.calendar-day:has-text("20")');
await expect(page.locator('.modal')).toBeVisible();
await expect(page.locator('.modal')).toContainText('Enero');
await page.screenshot({ path: 'screenshots/us-125-day-modal.png' });
```

---

### US-126: Implementar sección de patrón semanal
**Prioridad:** 5 | **Estado:** pending

**Descripción:**
Sección colapsable para ver/editar el patrón semanal base.

**Archivos:** `apps/admin/src/app/(dashboard)/menu/calendar/page.tsx`

**Criterios de Aceptación:**
- [ ] Sección "Patrón Semanal" debajo del calendario
- [ ] Toggle para expandir/colapsar
- [ ] 5 columnas: Lunes, Martes, Miércoles, Jueves, Viernes
- [ ] Cada columna muestra platos del patrón para ese día
- [ ] Cada columna es droppable (puede recibir platos)
- [ ] Botón X para quitar plato del patrón
- [ ] Al modificar: mutación updatePatternDay
- [ ] Indicador: "Este patrón se aplica a todos los días sin asignación específica"

**Verificación Visual (Playwright):**
```typescript
await page.goto('/menu/calendar');
await page.click('text=Patrón Semanal');
await expect(page.locator('.pattern-column')).toHaveCount(5);
await page.screenshot({ path: 'screenshots/us-126-weekly-pattern.png' });
```

---

## FASE 4: ADMIN - Templates de Menú

### US-130: Agregar sección de templates en sidebar
**Prioridad:** 6 | **Estado:** pending

**Descripción:**
En el sidebar, debajo de platos, mostrar templates disponibles.

**Archivos:** `apps/admin/src/app/(dashboard)/menu/calendar/page.tsx`

**Criterios de Aceptación:**
- [ ] Sección "Templates" en sidebar debajo de platos
- [ ] useQuery para obtener templates: menuTemplates.list(cafeteriaId)
- [ ] Cada template muestra: nombre, cantidad de platos, color (si tiene)
- [ ] Templates son draggables
- [ ] Botón "+ Nuevo Template" abre modal de creación

**Verificación Visual (Playwright):**
```typescript
await page.goto('/menu/calendar');
await expect(page.locator('text=Templates')).toBeVisible();
await page.screenshot({ path: 'screenshots/us-130-templates-sidebar.png' });
```

---

### US-131: Implementar modal crear/editar template
**Prioridad:** 6 | **Estado:** pending

**Descripción:**
Modal para crear y editar templates de menú.

**Archivos:** `apps/admin/src/app/(dashboard)/menu/calendar/page.tsx`

**Criterios de Aceptación:**
- [ ] Modal con campos: nombre (requerido), descripción, color (selector)
- [ ] Selector de color con opciones predefinidas (azul, verde, rojo, amarillo, morado)
- [ ] Lista de platos disponibles para agregar al template
- [ ] Checkbox o botón para agregar/quitar platos
- [ ] Platos seleccionados se muestran en lista aparte
- [ ] Botón Guardar: crea template con items
- [ ] Botón Cancelar: cierra modal
- [ ] Validación: nombre requerido

**Verificación Visual (Playwright):**
```typescript
await page.goto('/menu/calendar');
await page.click('text=Nuevo Template');
await expect(page.locator('input[name="name"]')).toBeVisible();
await page.screenshot({ path: 'screenshots/us-131-template-modal.png' });
```

---

### US-132: Implementar drag-and-drop de template a día
**Prioridad:** 6 | **Estado:** pending

**Descripción:**
Al arrastrar template a un día, asignar todos sus platos.

**Archivos:** `apps/admin/src/app/(dashboard)/menu/calendar/page.tsx`

**Criterios de Aceptación:**
- [ ] Templates son draggables con type='template'
- [ ] Al soltar template en día: obtener items del template
- [ ] Llamar setDateMenu con todos los items del template
- [ ] Toast muestra "Template '[nombre]' aplicado a [fecha]"
- [ ] Indicador del día se actualiza
- [ ] Refetch de calendario

**Verificación Manual:**
- Crear template con 3 platos
- Arrastrar template a un día
- Verificar que el día tiene los 3 platos

---

## FASE 5: MOBILE - Conectar con nuevo endpoint

### US-140: Actualizar servicio API mobile para usar nuevo endpoint
**Prioridad:** 7 | **Estado:** pending

**Descripción:**
Modificar la app móvil para usar el nuevo endpoint de resolución de menú.

**Archivos:** `apps/mobile/src/services/api.ts`

**Criterios de Aceptación:**
- [ ] Nuevo método: getMenuByDate(cafeteriaId: string, date: string)
- [ ] Llama a: GET /api/v1/menu-planning/:cafeteriaId/resolve/:date
- [ ] Retorna: { source, items, date, dayOfWeek }
- [ ] Tipado correcto con TypeScript
- [ ] Manejo de errores

**Verificación Terminal:**
```bash
cd apps/mobile && npx tsc --noEmit
```

---

### US-141: Modificar cafeteria.tsx para usar fecha completa
**Prioridad:** 7 | **Estado:** pending

**Descripción:**
La pantalla de cafetería debe calcular la fecha completa (YYYY-MM-DD) y usar el nuevo endpoint.

**Archivos:** `apps/mobile/app/(tabs)/cafeteria.tsx`

**Criterios de Aceptación:**
- [ ] Función getPickupDate ahora retorna formato YYYY-MM-DD
- [ ] loadMenuForDay usa getMenuByDate en vez de getMenuByDay
- [ ] Menu se carga correctamente para cualquier día seleccionado
- [ ] Indicador de fuente opcional: "(Menú especial)" si source='assignment'
- [ ] Fallback si endpoint falla: usar endpoint anterior
- [ ] Build mobile sin errores

**Verificación Terminal:**
```bash
cd apps/mobile && npx tsc --noEmit
```

---

### US-142: Verificar visualización de menú en app mobile
**Prioridad:** 7 | **Estado:** pending

**Descripción:**
Verificar que el menú asignado desde el admin se muestra correctamente en la app móvil.

**Archivos:** (verificación, no modificación)

**Criterios de Aceptación:**
- [ ] Asignar platos a fecha X desde admin
- [ ] Abrir app mobile, navegar a fecha X
- [ ] Verificar que los platos asignados aparecen
- [ ] Cambiar a fecha Y sin asignación
- [ ] Verificar que muestra patrón semanal (o default)
- [ ] Los precios se muestran correctamente
- [ ] Las imágenes cargan (si tienen URL)

**Verificación Manual:**
- Crear asignación en admin para mañana
- Abrir app mobile
- Seleccionar fecha de mañana
- Verificar platos correctos

---

## FASE 6: ADMIN - Link de navegación

### US-150: Agregar link "Calendario" en navegación de /menu
**Prioridad:** 8 | **Estado:** pending

**Descripción:**
En la página de listado de menú (/menu), agregar botón para ir al calendario.

**Archivos:** `apps/admin/src/app/(dashboard)/menu/page.tsx`

**Criterios de Aceptación:**
- [ ] Botón "Calendario" junto a botón "Nuevo Plato"
- [ ] Icono de calendario (Calendar de lucide-react)
- [ ] Click navega a /menu/calendar
- [ ] Botón con estilo outline (secundario)
- [ ] Build admin sin errores

**Verificación Visual (Playwright):**
```typescript
await page.goto('/menu');
await expect(page.locator('text=Calendario')).toBeVisible();
await page.click('text=Calendario');
await page.waitForURL('/menu/calendar');
await page.screenshot({ path: 'screenshots/us-150-menu-nav.png' });
```

---

## Resumen de Archivos a Modificar

| Archivo | Stories |
|---------|---------|
| `packages/api/prisma/schema.prisma` | US-100, US-101, US-102, US-103 |
| `packages/api/src/routes/menu-templates.routes.ts` | US-104 (nuevo) |
| `packages/api/src/routes/menu-planning.routes.ts` | US-105, US-106, US-107 (nuevo) |
| `packages/api/src/index.ts` | US-104, US-105 |
| `apps/admin/package.json` | US-110 |
| `apps/admin/src/lib/api.ts` | US-111, US-112 |
| `apps/admin/src/app/(dashboard)/menu/calendar/page.tsx` | US-120 a US-132 (nuevo) |
| `apps/admin/src/app/(dashboard)/menu/page.tsx` | US-150 |
| `apps/mobile/src/services/api.ts` | US-140 |
| `apps/mobile/app/(tabs)/cafeteria.tsx` | US-141 |

---

## Verificación Final

### Tests E2E con Playwright
Ejecutar después de implementar todas las stories:

```bash
cd apps/admin && npx playwright test
```

### Checklist Manual
- [ ] Admin puede ver calendario mensual
- [ ] Admin puede arrastrar platos a días
- [ ] Admin puede crear templates
- [ ] Admin puede configurar patrón semanal
- [ ] Usuario mobile ve menú correcto según fecha
- [ ] Cambios en admin se reflejan en mobile

### Screenshots Requeridos
- us-120-calendar-page.png
- us-121-calendar-grid.png
- us-122-calendar-indicators.png
- us-123-sidebar-items.png
- us-125-day-modal.png
- us-126-weekly-pattern.png
- us-130-templates-sidebar.png
- us-131-template-modal.png
- us-150-menu-nav.png
