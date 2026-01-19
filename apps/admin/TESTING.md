# Testing con Playwright

Esta guia describe como ejecutar las pruebas E2E del panel de administracion usando Playwright.

## Requisitos previos

1. Node.js 18+ instalado
2. Dependencias del proyecto instaladas (`pnpm install`)
3. API backend corriendo (opcional para algunos tests)

## Instalacion

Las dependencias de Playwright ya estan instaladas. Si necesitas reinstalar los navegadores:

```bash
cd apps/admin
npx playwright install chromium
```

## Ejecutar tests

### Modo headless (sin interfaz grafica)

```bash
# Desde la raiz del proyecto
cd apps/admin
pnpm test:e2e
```

### Modo headed (con navegador visible)

```bash
pnpm test:e2e:headed
```

### Modo UI interactivo

```bash
pnpm test:e2e:ui
```

### Modo debug

```bash
pnpm test:e2e:debug
```

### Ver reporte de resultados

```bash
pnpm test:e2e:report
```

## Estructura de archivos

```
apps/admin/
├── playwright.config.ts    # Configuracion de Playwright
├── tests/                  # Directorio de tests E2E
│   └── login.spec.ts      # Tests del login
├── screenshots/           # Screenshots generados por los tests
└── test-results/          # Resultados de ejecucion
```

## Tests disponibles

### Login Tests (`tests/login.spec.ts`)

1. **login page loads correctly** - Verifica que la pagina de login cargue correctamente
2. **displays email and password labels** - Verifica que las etiquetas sean visibles
3. **shows validation for empty form** - Valida campos requeridos
4. **fills login form with credentials** - Prueba llenar el formulario
5. **submit button changes text when loading** - Verifica estado de carga
6. **displays error message for invalid credentials** - Prueba credenciales invalidas
7. **form inputs are disabled during submission** - Verifica estado disabled
8. **login with valid credentials redirects to dashboard** - Prueba login exitoso
9. **form inputs have proper labels and accessibility attributes** - Tests de accesibilidad

## Credenciales de prueba

Para los tests que requieren credenciales validas, usa:

- **Email**: `admin@colegio.cl`
- **Password**: `admin123`

Nota: Estas credenciales deben existir en la base de datos del backend (ver `packages/api/prisma/seed.ts`)

## Screenshots

Los tests generan screenshots automaticamente en el directorio `screenshots/`:

- `login-page.png` - Pagina de login inicial
- `login-filled.png` - Formulario llenado
- `login-error.png` - Estado de error
- `before-login.png` - Antes de enviar el formulario
- `after-login.png` - Despues del login

## Configuracion

La configuracion de Playwright se encuentra en `playwright.config.ts`. Aspectos destacados:

- **Base URL**: `http://localhost:3000` (configurable via `BASE_URL` env var)
- **Timeout**: 30 segundos por test
- **Screenshots**: Captura automatica en fallos
- **Video**: Grabacion solo en fallos
- **Trace**: Captura en primer reintento
- **Web Server**: Inicia automaticamente el servidor de desarrollo

## CI/CD

Los tests estan preparados para ejecutarse en CI/CD:

- Modo paralelo deshabilitado en CI
- 2 reintentos automaticos en CI
- Reportes en formato HTML y lista

## Solucionar problemas

### El servidor no inicia

Verifica que el puerto 3000 este disponible:

```bash
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000
```

### Tests fallan por timeout

Aumenta el timeout en `playwright.config.ts`:

```typescript
timeout: 60 * 1000, // 60 segundos
```

### Navegador no se instala

Instala manualmente:

```bash
npx playwright install chromium --with-deps
```

### API no esta disponible

Algunos tests requieren que el backend este corriendo. Inicia la API:

```bash
cd packages/api
pnpm dev
```

## Mejores practicas

1. **Nombres descriptivos**: Usa nombres claros para los tests
2. **Selectores estables**: Prefiere IDs y atributos data-testid
3. **Esperas explicitas**: Usa `waitFor` en lugar de timeouts fijos
4. **Screenshots**: Captura evidencia visual de estados importantes
5. **Cleanup**: Los tests deben ser independientes y limpiar sus datos

## Recursos adicionales

- [Documentacion oficial de Playwright](https://playwright.dev)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)
