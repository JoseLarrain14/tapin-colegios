# Security Fix: Menu Routes - Cafeteria Access Validation

## Fecha
2026-01-22

## Vulnerabilidad Identificada

**Severidad:** ALTA

**Archivo afectado:** `packages/api/src/routes/menu.routes.ts`

**Problema:** Los endpoints del menu aceptaban cualquier `cafeteriaId` sin validar que la cafetería pertenezca al colegio del usuario autenticado. Esto permitía que un administrador de un colegio pudiera acceder, modificar o eliminar items del menu de cafeterías de otros colegios.

## Endpoints Corregidos

Se aplicó validación de acceso a cafetería en 5 endpoints:

1. **GET `/:cafeteriaId`** - Obtener todos los items del menu
2. **GET `/:cafeteriaId/day/:dayOfWeek`** - Obtener items disponibles por día
3. **POST `/:cafeteriaId`** - Crear nuevo item del menu
4. **PUT `/:cafeteriaId/:itemId`** - Actualizar item del menu
5. **DELETE `/:cafeteriaId/:itemId`** - Eliminar item del menu

## Solución Implementada

### 1. Importación de función helper
```typescript
import { validateCafeteriaAccess } from './admin.routes.js';
```

### 2. Patrón de validación aplicado

**ANTES:**
```typescript
const cafeteria = await prisma.cafeteria.findUnique({
  where: { id: cafeteriaId },
  include: { school: true },
});

if (!cafeteria) {
  return reply.status(404).send({
    success: false,
    message: 'Cafeteria no encontrada',
  });
}
```

**DESPUÉS:**
```typescript
// Validate cafeteria access
const result = await validateCafeteriaAccess(cafeteriaId, decoded, reply);
if (!result) return;
const { cafeteria } = result;
```

## Validación de Seguridad

La función `validateCafeteriaAccess` implementa las siguientes validaciones:

1. **Verifica que la cafetería existe**
   - Retorna 404 si no se encuentra

2. **Valida permisos por rol:**
   - **Super Admin:** Acceso total a todas las cafeterías
   - **School Admin:** Solo puede acceder a cafeterías de su colegio asignado
   - **Otros roles:** Denegado (403)

3. **Validación de ownership:**
   - Verifica que `cafeteria.schoolId === userSchoolId`
   - Retorna 403 si el usuario intenta acceder a cafeterías de otros colegios

## Comportamiento de Seguridad

### Caso 1: School Admin accediendo a su propia cafetería
```
Request: GET /api/v1/menu/cafe-123
User: school_admin de Colegio A
Cafeteria cafe-123: Pertenece a Colegio A
Resultado: ✅ Acceso permitido
```

### Caso 2: School Admin accediendo a cafetería de otro colegio
```
Request: GET /api/v1/menu/cafe-456
User: school_admin de Colegio A
Cafeteria cafe-456: Pertenece a Colegio B
Resultado: ❌ 403 Forbidden - "No tienes acceso a esta cafeteria"
```

### Caso 3: Super Admin accediendo a cualquier cafetería
```
Request: GET /api/v1/menu/cafe-456
User: super_admin
Cafeteria cafe-456: Pertenece a Colegio B
Resultado: ✅ Acceso permitido (super admin tiene acceso total)
```

## Testing Recomendado

### Test Cases a Implementar

1. **Test de aislamiento entre colegios:**
   - Crear 2 school admins de colegios diferentes
   - Verificar que Admin A no puede acceder a menu de Colegio B
   - Verificar que cada admin solo ve/edita su propio menu

2. **Test de super admin:**
   - Verificar que super admin puede acceder a menus de todos los colegios

3. **Test de operaciones CRUD:**
   - Verificar que POST/PUT/DELETE fallan con 403 para cafeterías de otros colegios
   - Verificar que GET retorna 403 (no 404) para mejorar seguridad

4. **Test de edge cases:**
   - cafeteriaId inválido (UUID no existente)
   - cafeteriaId de cafetería inactiva
   - Usuario sin colegio asignado

## Archivos Modificados

- `packages/api/src/routes/menu.routes.ts` (5 endpoints actualizados)

## Archivos Relacionados

- `packages/api/src/routes/admin.routes.ts` (contiene `validateCafeteriaAccess`)
- `packages/api/src/routes/menu-planning.routes.ts` (pendiente de corrección similar)
- `packages/api/src/routes/menu-templates.routes.ts` (pendiente de corrección similar)

## Impacto

**Seguridad:** ✅ Vulnerabilidad crítica corregida
**Funcionalidad:** ✅ Sin cambios en flujo normal
**Performance:** ✅ Sin impacto (misma cantidad de queries)
**Compatibilidad:** ✅ 100% backward compatible

## Próximos Pasos

1. Aplicar mismo patrón a `menu-planning.routes.ts`
2. Aplicar mismo patrón a `menu-templates.routes.ts`
3. Auditar otros routes para identificar vulnerabilidades similares
4. Implementar tests de integración para validación de acceso
5. Documentar patrones de seguridad en guía de desarrollo

## Referencias

- PRD: Security Best Practices
- Related Issue: Menu Access Control
- Commit: [PENDING]
