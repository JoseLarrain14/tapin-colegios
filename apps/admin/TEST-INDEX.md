# Test Documentation Index
## Panel de Administración - Tap In Colegios

Esta es la documentación completa de todos los tests del panel de administración.

---

## Índice de Documentos

### 1. Reporte Principal de Tests E2E
**Archivo**: `E2E-TEST-REPORT.md`
**Descripción**: Reporte completo de los tests E2E con Playwright
**Contenido**:
- Resumen ejecutivo
- Resultados detallados de 6 tests
- Análisis de capturas de pantalla
- Problemas identificados y soluciones
- Métricas de rendimiento
- Próximos pasos recomendados

### 2. Configuración de Playwright
**Archivo**: `playwright.config.ts`
**Descripción**: Configuración de Playwright para tests E2E
**Características**:
- Test directory: `./e2e`
- Timeout: 30 segundos
- Screenshots: Habilitados en cada paso
- WebServer: Auto-start en localhost:3000

### 3. Test Suite Principal
**Archivo**: `e2e/flow-completo.spec.ts`
**Descripción**: Suite completa de tests E2E
**Tests Incluidos**:
1. Login como School Admin
2. Ver Dashboard con datos reales
3. Ver lista de estudiantes
4. Ver transacciones
5. Ver menú de cafetería
6. Flujo completo - Navegación secuencial

### 4. Tests Existentes (Legacy)
**Directorio**: `tests/`
**Archivos**:
- `login.spec.ts` - Tests de autenticación
- `auth-flow.spec.ts` - Flujo de autenticación completo

---

## Estructura de Directorios

```
apps/admin/
├── e2e/                          # Tests E2E (nuevo)
│   └── flow-completo.spec.ts     # Suite completa de tests
├── tests/                        # Tests legacy
│   ├── login.spec.ts
│   └── auth-flow.spec.ts
├── screenshots/                  # Capturas de pantalla
│   ├── 01-login-page.png
│   ├── 02-login-filled.png
│   ├── 03-dashboard.png
│   ├── 04-dashboard-stats.png
│   ├── 05-students-list.png
│   ├── 06-transactions.png
│   ├── 07-menu.png
│   ├── 08-complete-flow-login.png
│   ├── 09-complete-flow-dashboard.png
│   ├── 10-complete-flow-students.png
│   ├── 11-complete-flow-transactions.png
│   └── 12-complete-flow-menu.png
├── test-results/                 # Resultados de tests
├── playwright-report/            # Reporte HTML
├── playwright.config.ts          # Configuración Playwright
├── E2E-TEST-REPORT.md           # Este reporte
├── TEST-INDEX.md                # Este índice
└── run-e2e-tests.sh             # Script de ejecución
```

---

## Comandos Rápidos

### Ejecutar Tests

```bash
# Script automático (recomendado)
./run-e2e-tests.sh

# O manualmente
npx playwright test

# Con interfaz visual
npx playwright test --ui

# En modo debug
npx playwright test --debug

# Ver navegador durante ejecución
npx playwright test --headed

# Ejecutar test específico
npx playwright test e2e/flow-completo.spec.ts --grep "Login"
```

### Ver Reportes

```bash
# Abrir reporte HTML
npx playwright show-report

# Ver capturas de pantalla
cd screenshots && ls -la

# Ver resultados de test fallido
cd test-results && ls -la
```

### Generar Documentación

```bash
# Ver este índice
cat TEST-INDEX.md

# Ver reporte completo
cat E2E-TEST-REPORT.md
```

---

## Tests por Categoría

### Autenticación
- **Login básico**: `e2e/flow-completo.spec.ts` - Test 1
- **Login legacy**: `tests/login.spec.ts`
- **Auth flow**: `tests/auth-flow.spec.ts`

### Dashboard
- **Dashboard con datos**: `e2e/flow-completo.spec.ts` - Test 2

### Gestión de Estudiantes
- **Lista de estudiantes**: `e2e/flow-completo.spec.ts` - Test 3

### Transacciones
- **Vista de transacciones**: `e2e/flow-completo.spec.ts` - Test 4

### Menú de Cafetería
- **Vista de menú**: `e2e/flow-completo.spec.ts` - Test 5

### Flujos Completos
- **Navegación completa**: `e2e/flow-completo.spec.ts` - Test 6

---

## Estado de los Tests

| Test | Estado | Duración | Capturas | Prioridad |
|------|--------|----------|----------|-----------|
| Login | ✅ PASS | 4.8s | 3 | CRÍTICO |
| Dashboard | ✅ PASS | 6.2s | 1 | ALTO |
| Estudiantes | ✅ PASS | 5.9s | 1 | ALTO |
| Transacciones | ✅ PASS | 6.0s | 1 | MEDIO |
| Menú | ✅ PASS | 6.0s | 1 | ALTO |
| Flujo Completo | ✅ PASS | 10.4s | 5 | CRÍTICO |

**Resumen**: 6/6 tests pasando (100%)

---

## Problemas Conocidos

### 1. Endpoint de Estudiantes
**Prioridad**: ALTA
**Estado**: IDENTIFICADO
**Descripción**: El endpoint no retorna estudiantes para el usuario school_admin
**Archivo Afectado**: `e2e/flow-completo.spec.ts` - Test 3
**Captura**: `05-students-list.png`
**Acción**: Investigar permisos y parámetros del endpoint

### 2. Lista de Transacciones Vacía
**Prioridad**: BAJA
**Estado**: INFORMATIVO
**Descripción**: La lista aparece vacía pero la estructura es correcta
**Archivo Afectado**: `e2e/flow-completo.spec.ts` - Test 4
**Captura**: `06-transactions.png`
**Acción**: Verificar filtros por defecto

---

## Próximos Tests a Implementar

### Sprint 1: CRUD Básico
- [ ] Crear producto en menú
- [ ] Editar producto en menú
- [ ] Eliminar producto en menú
- [ ] Crear usuario
- [ ] Editar usuario

### Sprint 2: Flujos Avanzados
- [ ] Proceso completo de compra
- [ ] Recarga de saldo
- [ ] Generación de reportes
- [ ] Filtrado avanzado de transacciones

### Sprint 3: Casos Edge
- [ ] Login con credenciales incorrectas
- [ ] Manejo de sesión expirada
- [ ] Validación de formularios
- [ ] Límites de paginación

### Sprint 4: Performance y UX
- [ ] Tiempo de carga de páginas
- [ ] Responsive design (mobile, tablet)
- [ ] Accesibilidad (a11y)
- [ ] Navegación con teclado

---

## Herramientas y Recursos

### Playwright
- **Documentación**: https://playwright.dev/
- **API Reference**: https://playwright.dev/docs/api/class-playwright
- **Best Practices**: https://playwright.dev/docs/best-practices

### Debugging
- **Playwright Inspector**: `npx playwright test --debug`
- **Trace Viewer**: `npx playwright show-trace trace.zip`
- **VS Code Extension**: Playwright Test for VSCode

### CI/CD
- **GitHub Actions**: Configurar workflow para ejecutar tests automáticamente
- **Test Reports**: Publicar reportes en GitHub Pages
- **Notifications**: Alertas en Slack/Discord para tests fallidos

---

## Métricas de Calidad

### Cobertura Actual
- **Páginas Cubiertas**: 5/7 (71%)
  - ✅ Login
  - ✅ Dashboard
  - ✅ Estudiantes
  - ✅ Transacciones
  - ✅ Menú
  - ❌ Paquetes
  - ❌ Colegios

- **Funcionalidades Cubiertas**: 8/15 (53%)
  - ✅ Login
  - ✅ Logout
  - ✅ Navegación
  - ✅ Ver dashboard
  - ✅ Ver estudiantes
  - ✅ Ver transacciones
  - ✅ Ver menú
  - ✅ Filtros básicos
  - ❌ CRUD usuarios
  - ❌ CRUD productos
  - ❌ CRUD paquetes
  - ❌ Búsqueda
  - ❌ Exportar datos
  - ❌ Configuración
  - ❌ Notificaciones

### Objetivos de Cobertura
- **Meta Corto Plazo**: 80% páginas, 60% funcionalidades
- **Meta Mediano Plazo**: 100% páginas, 80% funcionalidades
- **Meta Largo Plazo**: 100% páginas, 95% funcionalidades

---

## Configuración de Entorno

### Variables de Entorno Requeridas

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NODE_ENV=development
```

### Prerrequisitos

1. **Backend corriendo**: `cd packages/api && pnpm dev`
2. **Node.js**: >= 18.x
3. **pnpm**: >= 8.x
4. **Playwright**: 1.57.0

### Instalación

```bash
# Instalar dependencias
cd apps/admin
pnpm install

# Instalar Playwright
pnpm add -D @playwright/test
npx playwright install chromium

# Verificar instalación
npx playwright --version
```

---

## Contacto y Soporte

Para problemas con los tests o preguntas sobre la configuración, revisar:

1. Este índice (`TEST-INDEX.md`)
2. Reporte completo (`E2E-TEST-REPORT.md`)
3. Configuración de Playwright (`playwright.config.ts`)
4. Tests específicos en `e2e/` y `tests/`

---

**Última Actualización**: 2026-01-18
**Versión del Documento**: 1.0.0
**Playwright Version**: 1.57.0
