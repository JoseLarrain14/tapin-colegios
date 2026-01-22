# E2E Tests - Admin Application

Tests End-to-End con Playwright para validar el correcto funcionamiento de la aplicación de administración.

## Estructura de Tests

```
e2e/
├── menu-cafeteria-dynamic.spec.ts  # Tests de ID dinámico de cafetería en menú
├── wallet-tickets-sync.spec.ts     # Tests de sincronización wallet-tickets
└── README.md                       # Este archivo
```

## Configuración

Los tests están configurados en `playwright.config.ts` en la raíz del proyecto admin.

### Requisitos Previos

1. Tener el servidor de desarrollo corriendo:
   ```bash
   pnpm dev
   ```

2. O especificar la URL base:
   ```bash
   export BASE_URL=http://localhost:3000
   ```

## Ejecutar Tests

### Todos los tests
```bash
pnpm test:e2e
```

### Con interfaz gráfica
```bash
pnpm test:e2e:ui
```

### Ver los navegadores (headed mode)
```bash
pnpm test:e2e:headed
```

### Modo debug
```bash
pnpm test:e2e:debug
```

### Un archivo específico
```bash
pnpm test:e2e menu-cafeteria-dynamic.spec.ts
```

### Ver reporte de resultados
```bash
pnpm test:e2e:report
```

## Test Suite: Menu Cafeteria Dynamic

**Archivo:** `menu-cafeteria-dynamic.spec.ts`

### Propósito

Valida que las páginas del menú administrativo obtienen el `cafeteriaId` dinámicamente desde la API `/admin/config` en lugar de usar el valor hardcodeado `'demo-cafeteria'`.

### Bug Corregido

Anteriormente, el `cafeteriaId` estaba hardcodeado como `'demo-cafeteria'` en:
- `apps/admin/src/app/(dashboard)/menu/page.tsx`
- `apps/admin/src/app/(dashboard)/menu/new/page.tsx`
- `apps/admin/src/app/(dashboard)/menu/[id]/page.tsx`

Ahora se obtiene dinámicamente usando el hook `useCafeteriaId()` que consulta `/admin/config`.

### Tests Incluidos

1. **Menu list page loads and fetches cafeteriaId from /admin/config**
   - Verifica que la página de listado de menú llama a `/admin/config`
   - Valida que usa el `cafeteriaId` devuelto por la API
   - Confirma que NO usa el ID hardcodeado `'demo-cafeteria'`

2. **Create new menu item uses dynamic cafeteriaId**
   - Verifica que al crear un producto se usa el `cafeteriaId` correcto
   - Intercepta la petición POST y valida el endpoint usado
   - Asegura que no se llama al endpoint con ID hardcodeado

3. **Edit menu item uses dynamic cafeteriaId**
   - Verifica que al editar un producto se usa el `cafeteriaId` correcto
   - Intercepta las peticiones GET y PUT
   - Valida que todas usan el ID dinámico

4. **Show warning when no cafeteria is configured**
   - Verifica que se muestra advertencia cuando no hay cafetería configurada
   - Valida el mensaje en páginas de menú, creación y edición

5. **All menu operations use the same dynamic cafeteriaId**
   - Test de consistencia que verifica que todas las operaciones usan el mismo ID
   - Captura todos los IDs usados en múltiples operaciones
   - Confirma que solo se usa un ID y nunca el hardcodeado

### Estrategia de Testing

Los tests usan **mocking de API** para:

1. **Control total:** Mockear `/admin/config` con un `cafeteriaId` específico
2. **Interceptación:** Capturar todas las llamadas a endpoints de menú
3. **Validación negativa:** Detectar si se llama al endpoint con ID hardcodeado
4. **Screenshots:** Capturar evidencia visual de cada paso

### Ejemplo de Ejecución

```bash
# Ejecutar solo los tests de cafetería dinámica
pnpm test:e2e menu-cafeteria-dynamic

# En modo debug para ver paso a paso
pnpm test:e2e:debug menu-cafeteria-dynamic
```

### Screenshots Generados

Los tests generan screenshots en `screenshots/`:
- `menu-dynamic-01-login.png` - Página de login
- `menu-dynamic-02-menu-list.png` - Lista de menú cargada
- `menu-dynamic-03-verification.png` - Verificación de API calls
- `menu-dynamic-04-new-item-form.png` - Formulario de nuevo producto
- `menu-dynamic-05-form-filled.png` - Formulario completado
- `menu-dynamic-06-after-submit.png` - Después de enviar
- `menu-dynamic-07-edit-form.png` - Formulario de edición
- `menu-dynamic-08-edit-modified.png` - Formulario modificado
- `menu-dynamic-09-edit-submitted.png` - Después de editar
- `menu-dynamic-10-no-cafeteria.png` - Sin cafetería configurada
- `menu-dynamic-11-no-cafeteria-new.png` - Sin cafetería en nueva página
- `menu-dynamic-12-consistency-check.png` - Verificación de consistencia

### Verificaciones Clave

Cada test verifica:

- ✅ Se llama a `/admin/config` para obtener la configuración
- ✅ Se usa el `cafeteriaId` devuelto por la API
- ✅ NO se usa el ID hardcodeado `'demo-cafeteria'`
- ✅ Las operaciones CRUD usan el ID correcto
- ✅ Se muestra advertencia cuando no hay cafetería configurada

## Test Suite: Wallet-Tickets Sync

**Archivo:** `wallet-tickets-sync.spec.ts`

### Propósito

Valida la sincronización entre saldo (wallet) y tickets en el flujo completo desde compra hasta consumo.

### Tests Incluidos

1. Login y verificar dashboard
2. Ver lista de estudiantes con balance y tickets
3. Ver detalle de estudiante con tickets
4. Verificar transacciones recientes
5. Verificar sincronización wallet-tickets en UI

## Mejores Prácticas

### 1. Usar Mocks para APIs Externas

Los tests mockean las respuestas de API para:
- Control total sobre los datos de prueba
- Tests más rápidos y deterministas
- No depender de datos en base de datos

### 2. Screenshots para Verificación Visual

Cada paso importante captura un screenshot para:
- Debugging cuando los tests fallan
- Documentación visual del flujo
- Validación manual de UI

### 3. Logging Detallado

Los tests incluyen `console.log` para:
- Seguimiento del flujo de ejecución
- Verificación de API calls
- Debugging de fallos

### 4. Assertions Claras

Cada test verifica:
- Lo que DEBE suceder (assertions positivas)
- Lo que NO DEBE suceder (assertions negativas)

## Troubleshooting

### Los tests fallan con timeout

1. Aumentar el timeout en `playwright.config.ts`:
   ```typescript
   timeout: 60 * 1000, // 60 segundos
   ```

2. Verificar que el servidor está corriendo:
   ```bash
   pnpm dev
   ```

### No se capturan screenshots

Crear el directorio de screenshots:
```bash
mkdir -p screenshots
```

### Tests pasan pero no se ven las interacciones

Ejecutar en modo headed para ver el navegador:
```bash
pnpm test:e2e:headed
```

### Necesito debuggear un test específico

Usar el modo debug de Playwright:
```bash
pnpm test:e2e:debug menu-cafeteria-dynamic.spec.ts
```

## CI/CD

Los tests se pueden ejecutar en CI/CD configurando:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: pnpm test:e2e
  env:
    BASE_URL: http://localhost:3000
```

## Recursos

- [Playwright Documentation](https://playwright.dev)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
