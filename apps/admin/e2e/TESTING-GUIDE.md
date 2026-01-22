# Guía de Testing E2E - Menu Cafeteria Dynamic

## Resumen del Bug Corregido

**Problema:** El `cafeteriaId` estaba hardcodeado como `'demo-cafeteria'` en las páginas del menú administrativo.

**Solución:** Ahora se obtiene dinámicamente desde la API `/admin/config` usando el hook `useCafeteriaId()`.

**Archivos corregidos:**
- `apps/admin/src/app/(dashboard)/menu/page.tsx`
- `apps/admin/src/app/(dashboard)/menu/new/page.tsx`
- `apps/admin/src/app/(dashboard)/menu/[id]/page.tsx`

## Tests Creados

### Archivo: `menu-cafeteria-dynamic.spec.ts`

5 tests E2E que validan:

1. **Menu list obtiene cafeteriaId desde /admin/config**
   - Verifica llamada a `/admin/config`
   - Valida uso del ID dinámico
   - Confirma que NO usa `'demo-cafeteria'`

2. **Crear producto usa cafeteriaId dinámico**
   - Intercepta POST a `/menu/{cafeteriaId}`
   - Verifica que usa el ID correcto

3. **Editar producto usa cafeteriaId dinámico**
   - Intercepta GET y PUT
   - Valida consistencia del ID

4. **Advertencia cuando no hay cafetería configurada**
   - Verifica mensaje de error
   - Valida en todas las páginas de menú

5. **Todas las operaciones usan el mismo ID**
   - Test de consistencia
   - Captura todos los IDs usados
   - Confirma unicidad

## Cómo Ejecutar los Tests

### Pre-requisitos

1. Instalar dependencias:
```bash
cd apps/admin
pnpm install
```

2. Instalar navegadores de Playwright:
```bash
pnpm exec playwright install
```

3. Iniciar servidor de desarrollo (en otra terminal):
```bash
pnpm dev
```

### Ejecutar Tests

#### Todos los tests E2E
```bash
pnpm test:e2e
```

#### Solo los tests de cafetería dinámica
```bash
pnpm test:e2e menu-cafeteria-dynamic
```

#### Con interfaz gráfica (recomendado para desarrollo)
```bash
pnpm test:e2e:ui
```

#### Ver los navegadores durante la ejecución
```bash
pnpm test:e2e:headed
```

#### Modo debug (paso a paso)
```bash
pnpm test:e2e:debug
```

#### Ejecutar un test específico
```bash
pnpm test:e2e menu-cafeteria-dynamic.spec.ts -g "Menu list page"
```

### Ver Reportes

```bash
pnpm test:e2e:report
```

## Estructura de los Tests

### Mocking de APIs

Los tests mockean las siguientes APIs:

1. **GET /admin/config** - Devuelve cafetería configurada
```json
{
  "success": true,
  "data": {
    "cafeteria": {
      "id": "caf-test-123",
      "name": "Test Cafeteria"
    }
  }
}
```

2. **GET /menu/{cafeteriaId}** - Lista de productos
3. **POST /menu/{cafeteriaId}** - Crear producto
4. **PUT /menu/{cafeteriaId}/{itemId}** - Actualizar producto

### Tracking de API Calls

Cada test rastrea todas las llamadas a `/api/v1/*` para verificar:
- Qué endpoints se llamaron
- Con qué `cafeteriaId`
- Qué método HTTP se usó

### Screenshots

Se capturan screenshots en cada paso:
```
screenshots/
├── menu-dynamic-01-login.png
├── menu-dynamic-02-menu-list.png
├── menu-dynamic-03-verification.png
├── menu-dynamic-04-new-item-form.png
├── menu-dynamic-05-form-filled.png
├── menu-dynamic-06-after-submit.png
├── menu-dynamic-07-edit-form.png
├── menu-dynamic-08-edit-modified.png
├── menu-dynamic-09-edit-submitted.png
├── menu-dynamic-10-no-cafeteria.png
├── menu-dynamic-11-no-cafeteria-new.png
└── menu-dynamic-12-consistency-check.png
```

## Verificaciones Realizadas

### ✅ Verificaciones Positivas

- Se llama a `/admin/config`
- Se usa el `cafeteriaId` devuelto por la API
- Las operaciones CRUD usan el ID correcto
- Se muestra advertencia sin cafetería configurada
- Todas las operaciones usan el mismo ID

### ❌ Verificaciones Negativas

- NO se llama a endpoints con `'demo-cafeteria'`
- NO se usan IDs hardcodeados
- NO se permite crear/editar sin cafetería

## Ejemplo de Salida

```
=== Test: Menu List - Dynamic Cafeteria ID ===
📸 Screenshot saved: menu-dynamic-01-login.png
📸 Screenshot saved: menu-dynamic-02-menu-list.png

API Calls made:
- Admin config calls: 1
- Menu calls: 1

✅ /admin/config was called
✅ Menu endpoint called with correct ID: caf-test-123
✅ Menu endpoint NOT called with hardcoded ID: demo-cafeteria

📸 Screenshot saved: menu-dynamic-03-verification.png
```

## Debugging

### Test falla con timeout

1. Aumentar timeout en `playwright.config.ts`:
```typescript
timeout: 60 * 1000
```

2. Verificar que el servidor está corriendo:
```bash
curl http://localhost:3000
```

### No se ven los screenshots

Crear directorio:
```bash
mkdir -p screenshots
```

### Quiero ver qué está pasando

Usar modo headed + debug:
```bash
pnpm test:e2e:headed menu-cafeteria-dynamic
```

O modo UI para control total:
```bash
pnpm test:e2e:ui
```

### Test pasa pero quiero verificar manualmente

Revisar screenshots en `screenshots/`:
```bash
ls -la screenshots/menu-dynamic-*.png
```

## Extensión de Tests

Para agregar más tests:

1. Importar helpers:
```typescript
import {
  loginUser,
  captureScreenshot,
  mockAdminConfig,
  APICallTracker
} from './helpers';
```

2. Crear test:
```typescript
test('Mi nuevo test', async ({ page }) => {
  const tracker = new APICallTracker(page);
  await mockAdminConfig(page, 'mi-cafeteria-id');
  await loginUser(page);

  // Tu lógica aquí

  tracker.printCalls();
  await captureScreenshot(page, 'mi-test.png');
});
```

## CI/CD

Para ejecutar en CI/CD:

```yaml
- name: Install Playwright
  run: pnpm exec playwright install --with-deps

- name: Run E2E Tests
  run: pnpm test:e2e
  env:
    BASE_URL: http://localhost:3000
```

## Recursos

- [Playwright Docs](https://playwright.dev)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [Mocking APIs](https://playwright.dev/docs/mock)

## Conclusión

Estos tests garantizan que:

1. ✅ El `cafeteriaId` se obtiene dinámicamente desde la API
2. ✅ No se usa el valor hardcodeado `'demo-cafeteria'`
3. ✅ Todas las operaciones CRUD usan el ID correcto
4. ✅ Se maneja correctamente el caso sin cafetería configurada
5. ✅ Hay consistencia en todas las páginas del menú

Los tests son:
- **Deterministas** - Usan mocks para control total
- **Rápidos** - No dependen de base de datos
- **Completos** - Cubren todos los casos de uso
- **Debuggeables** - Con screenshots y logging detallado
