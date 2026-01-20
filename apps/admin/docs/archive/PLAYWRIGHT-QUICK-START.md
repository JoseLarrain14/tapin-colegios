# Playwright E2E Tests - Quick Start Guide

## Inicio Rápido

### 1. Verificar que el backend esté corriendo

```bash
# El backend debe estar en http://localhost:3001
curl http://localhost:3001/health
# Debe retornar: {"status":"ok","timestamp":"..."}
```

Si no está corriendo:
```bash
cd ../../packages/api
pnpm dev
```

### 2. Ejecutar los tests

```bash
cd apps/admin

# Opción A: Script automático (recomendado)
./run-e2e-tests.sh

# Opción B: Comando directo
npx playwright test

# Opción C: Con interfaz visual
npx playwright test --ui
```

### 3. Ver resultados

Las capturas de pantalla se guardan en:
```bash
apps/admin/screenshots/
```

Ver reporte HTML:
```bash
npx playwright show-report
```

---

## Resultados de Ejecución Actual

**Fecha de última ejecución**: 2026-01-18
**Estado**: ✅ 6/6 tests PASADOS (100%)

### Tests Ejecutados

1. ✅ **Login como School Admin** (4.8s)
   - Validación de formulario de login
   - Autenticación exitosa
   - Redirección al dashboard

2. ✅ **Dashboard con datos reales** (6.2s)
   - Estadísticas cargadas correctamente
   - 1 Colegio Activo
   - 1 Usuario Total
   - 3 Transacciones Hoy
   - Actividad reciente visible

3. ✅ **Lista de estudiantes** (5.9s)
   - Navegación correcta
   - Página cargada
   - ⚠️ Nota: Muestra error de carga (verificar endpoint)

4. ✅ **Transacciones** (6.0s)
   - Página cargada correctamente
   - Interfaz de filtros disponible
   - Estructura de tabla correcta

5. ✅ **Menú de cafetería** (6.0s)
   - 5 productos mostrados:
     - Bebida 500ml ($800)
     - Jugo Natural ($1.000)
     - Completo ($1.500)
     - Sándwich Ave Palta ($2.500)
     - Galletas ($500)
   - Botones de Editar/Eliminar funcionales

6. ✅ **Flujo completo secuencial** (10.4s)
   - Login → Dashboard → Estudiantes → Transacciones → Menú
   - Todas las transiciones exitosas
   - Estado de autenticación mantenido

**Duración Total**: 41.0 segundos

---

## Capturas de Pantalla Generadas

```
screenshots/
├── 01-login-page.png              # Página de login inicial
├── 02-login-filled.png            # Formulario completado
├── 03-dashboard.png               # Dashboard después del login
├── 04-dashboard-stats.png         # Dashboard con estadísticas
├── 05-students-list.png           # Lista de estudiantes
├── 06-transactions.png            # Página de transacciones
├── 07-menu.png                    # Menú de cafetería
├── 08-complete-flow-login.png     # Flujo completo - Login
├── 09-complete-flow-dashboard.png # Flujo completo - Dashboard
├── 10-complete-flow-students.png  # Flujo completo - Estudiantes
├── 11-complete-flow-transactions.png # Flujo completo - Transacciones
└── 12-complete-flow-menu.png      # Flujo completo - Menú
```

**Total**: 12 capturas de pantalla

---

## Comandos Útiles

### Ejecución

```bash
# Ejecutar todos los tests
npx playwright test

# Ejecutar un test específico
npx playwright test --grep "Login"

# Ejecutar con navegador visible
npx playwright test --headed

# Modo debug (paso a paso)
npx playwright test --debug

# Ejecutar en modo interactivo
npx playwright test --ui
```

### Reportes

```bash
# Ver reporte HTML
npx playwright show-report

# Ver lista de screenshots
ls -la screenshots/

# Ver resultados de tests fallidos
ls -la test-results/
```

### Mantenimiento

```bash
# Actualizar Playwright
pnpm update @playwright/test

# Reinstalar navegadores
npx playwright install

# Limpiar resultados anteriores
rm -rf test-results playwright-report
```

---

## Estructura de Archivos

```
apps/admin/
├── e2e/                          # Directorio de tests E2E
│   └── flow-completo.spec.ts     # Suite completa (280 líneas)
├── screenshots/                  # Capturas de pantalla (12 archivos)
├── test-results/                 # Resultados detallados
├── playwright-report/            # Reporte HTML
├── playwright.config.ts          # Configuración
├── E2E-TEST-REPORT.md           # Reporte completo
├── TEST-INDEX.md                # Índice de documentación
├── PLAYWRIGHT-QUICK-START.md    # Esta guía
└── run-e2e-tests.sh             # Script de ejecución
```

---

## Configuración

### playwright.config.ts

```typescript
{
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'on',  // Capturas en cada paso
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  }
}
```

### Variables de Entorno (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NODE_ENV=development
```

---

## Credenciales de Test

**Usuario de prueba**:
- Email: `admin@colegio.cl`
- Password: `admin123`
- Rol: `school_admin`

---

## Problemas Conocidos

### 1. Endpoint de Estudiantes (PENDIENTE)
**Síntoma**: Error al cargar estudiantes
**Captura**: `05-students-list.png`
**Acción**: Verificar endpoint `/api/v1/students` y permisos

### 2. API URL Incorrecta (RESUELTO) ✅
**Problema**: Estaba en puerto 4000, debe ser 3001
**Solución**: Actualizado en `.env.local`

---

## Troubleshooting

### Backend no responde
```bash
# Verificar que esté corriendo
curl http://localhost:3001/health

# Si no responde, iniciarlo
cd packages/api && pnpm dev
```

### Tests fallan en CI/CD
```bash
# Instalar dependencias del sistema
npx playwright install-deps

# Reinstalar navegadores
npx playwright install
```

### Capturas no se generan
Verificar configuración en `playwright.config.ts`:
```typescript
screenshot: 'on'  // Debe estar en 'on', no 'only-on-failure'
```

### Puerto 3000 ocupado
```bash
# Cambiar puerto en playwright.config.ts
baseURL: 'http://localhost:OTRO_PUERTO'
```

---

## Next Steps

1. **Revisar reporte completo**: `cat E2E-TEST-REPORT.md`
2. **Ver índice de tests**: `cat TEST-INDEX.md`
3. **Investigar endpoint de estudiantes**: Ver captura `05-students-list.png`
4. **Expandir tests**: Añadir CRUD de productos y usuarios

---

## Recursos

- **Documentación Playwright**: https://playwright.dev/
- **Reporte Completo**: `E2E-TEST-REPORT.md`
- **Índice de Tests**: `TEST-INDEX.md`
- **Test Suite**: `e2e/flow-completo.spec.ts`

---

**Última Actualización**: 2026-01-18
**Playwright Version**: 1.57.0
**Tests**: 6/6 PASADOS ✅
