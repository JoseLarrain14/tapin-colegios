# Quick Start - Playwright Testing

Guia rapida para empezar a usar Playwright en 5 minutos.

## 1. Verificar instalacion

```bash
cd C:/Users/josel/Documents/app-casinos-tapin/apps/admin
npx playwright --version
```

Deberia mostrar: `Version 1.57.0`

## 2. Ver tests disponibles

```bash
pnpm test:e2e --list
```

Resultado esperado: **15 tests en 2 archivos**

## 3. Ejecutar primer test (modo visual)

```bash
pnpm test:e2e:headed
```

Esto abrira Chrome y veras los tests ejecutandose en tiempo real.

## 4. Ver screenshots generados

Despues de ejecutar tests, verifica:

```bash
ls screenshots/
```

Deberias ver archivos como:
- `login-page.png`
- `login-filled.png`
- `login-error.png`
- etc.

## 5. Ver reporte HTML

```bash
pnpm test:e2e:report
```

Se abrira un navegador con el reporte interactivo completo.

## Comandos principales

| Comando | Descripcion |
|---------|-------------|
| `pnpm test:e2e` | Ejecutar todos los tests (headless) |
| `pnpm test:e2e:ui` | Modo UI interactivo (RECOMENDADO) |
| `pnpm test:e2e:headed` | Con navegador visible |
| `pnpm test:e2e:debug` | Modo debug paso a paso |
| `pnpm test:e2e:report` | Ver ultimo reporte |

## Ejecutar test especifico

```bash
# Solo tests de login
npx playwright test login.spec.ts

# Solo tests de auth flow
npx playwright test auth-flow.spec.ts

# Un test especifico por nombre
npx playwright test -g "login page loads correctly"
```

## Tests que funcionan SIN API

Estos tests no requieren que el backend este corriendo:

1. "login page loads correctly"
2. "displays email and password labels"
3. "shows validation for empty form"
4. "fills login form with credentials"
5. "form inputs have proper labels and accessibility attributes"

## Tests que requieren API

Estos tests necesitan el backend corriendo:

1. "login with valid credentials redirects to dashboard"
2. "displays error message for invalid credentials"
3. "complete login flow with valid credentials"
4. Tests de session management

## Ejecutar con API

Terminal 1 - Backend:
```bash
cd C:/Users/josel/Documents/app-casinos-tapin/packages/api
pnpm dev
```

Terminal 2 - Tests:
```bash
cd C:/Users/josel/Documents/app-casinos-tapin/apps/admin
pnpm test:e2e
```

## Modo recomendado: UI Mode

El modo UI es la mejor forma de desarrollar y debuggear tests:

```bash
pnpm test:e2e:ui
```

Ventajas:
- Ver tests en tiempo real
- Ejecutar tests individuales
- Ver el DOM y network
- Time travel debugging
- Screenshots automaticos

## Solucionar problemas comunes

### Error: Puerto 3000 ocupado

```bash
# Matar proceso en puerto 3000
npx kill-port 3000

# O cambiar puerto en playwright.config.ts
```

### Navegador no se abre

```bash
# Reinstalar navegadores
npx playwright install chromium --with-deps
```

### Tests muy lentos

```bash
# Ejecutar en paralelo (solo algunos tests)
npx playwright test login.spec.ts --workers=2
```

## Proximos pasos

1. Lee `TESTING.md` para detalles completos
2. Lee `PLAYWRIGHT_SETUP.md` para arquitectura
3. Explora `tests/helpers/test-utils.ts` para helpers disponibles
4. Agrega tus propios tests siguiendo los ejemplos

## Ayuda

- Documentacion completa: `TESTING.md`
- Playwright Docs: https://playwright.dev
- Test Utils: `tests/helpers/test-utils.ts`

---

**Listo!** Ahora puedes ejecutar `pnpm test:e2e:ui` y empezar a explorar.
