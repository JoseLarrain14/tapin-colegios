# Testing Guide - Admin Panel

Guia completa para ejecutar y crear tests E2E usando Playwright.

## Quick Start

```bash
cd apps/admin

# Ejecutar todos los tests (headless)
pnpm test:e2e

# Modo UI interactivo (RECOMENDADO)
pnpm test:e2e:ui

# Con navegador visible
pnpm test:e2e:headed

# Modo debug
pnpm test:e2e:debug

# Ver reporte
pnpm test:e2e:report
```

## Requisitos

1. Node.js 18+
2. Dependencias instaladas (`pnpm install`)
3. Navegador Chromium (`npx playwright install chromium`)
4. API backend corriendo (para algunos tests)

## Estructura de Tests

```
apps/admin/
├── playwright.config.ts     # Configuracion de Playwright
├── tests/                   # Tests E2E
│   ├── login.spec.ts       # Tests de login (9 tests)
│   ├── auth-flow.spec.ts   # Tests de autenticacion (6 tests)
│   └── helpers/
│       └── test-utils.ts   # Utilidades y helpers
├── e2e/                     # Tests adicionales E2E
│   ├── flow-completo.spec.ts
│   └── verify-prd-admin-improvements.spec.ts
├── test-results/            # Resultados (gitignored)
└── playwright-report/       # Reportes HTML (gitignored)
```

## Tests Disponibles

### Sin API (funcionan solos)
- Carga de pagina de login
- Validacion de formulario vacio
- Labels y accesibilidad
- Llenado de campos

### Con API (requieren backend)
- Login con credenciales validas
- Mensajes de error
- Flujo completo de autenticacion
- Manejo de sesiones

## Credenciales de Prueba

```
Email: admin@colegio.cl
Password: admin123
```

Estas credenciales estan en `packages/api/prisma/seed.ts`.

## Ejecutar con Backend

Terminal 1 - API:
```bash
cd packages/api
pnpm dev
```

Terminal 2 - Tests:
```bash
cd apps/admin
pnpm test:e2e
```

## Comandos Especificos

```bash
# Solo tests de login
npx playwright test login.spec.ts

# Un test especifico por nombre
npx playwright test -g "login page loads correctly"

# Ver lista de tests
pnpm test:e2e --list
```

## Configuracion

La configuracion esta en `playwright.config.ts`:
- Base URL: `http://localhost:3000`
- Timeout: 30 segundos
- Screenshots: En fallos
- Videos: En fallos
- Web Server: Inicia automaticamente

## Solucionar Problemas

### Puerto 3000 ocupado
```bash
npx kill-port 3000
```

### Navegador no se instala
```bash
npx playwright install chromium --with-deps
```

### Tests muy lentos
Aumentar timeout en `playwright.config.ts`:
```typescript
timeout: 60 * 1000
```

## Mejores Practicas

1. Usar `data-testid` para selectores
2. Usar `waitFor` en lugar de timeouts fijos
3. Tests independientes (no depender del orden)
4. Nombres descriptivos para los tests

## Recursos

- [Playwright Docs](https://playwright.dev)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)
