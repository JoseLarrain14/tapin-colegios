# Guía de Pruebas E2E - Dashboard de Transacciones

Esta guía te ayudará a ejecutar y mantener las pruebas automatizadas del dashboard de transacciones.

---

## Inicio Rápido

### 1. Preparar el Entorno

```bash
# 1. Asegúrate de tener los datos de prueba en la base de datos
cd packages/api
pnpm db:seed

# 2. Inicia el servidor de desarrollo (si no está corriendo)
cd ../../apps/admin
pnpm dev
# Deja este proceso corriendo y abre una nueva terminal para los tests
```

### 2. Ejecutar las Pruebas

```bash
# Ejecutar todas las pruebas de transacciones
cd apps/admin
pnpm test:e2e verify-transactions-stats

# O con navegador visible (recomendado para debugging)
pnpm test:e2e verify-transactions-stats --headed
```

### 3. Ver Resultados

Las capturas de pantalla se guardan automáticamente en:
```
C:\Users\josel\Documents\app-casinos-tapin\screenshots\
```

El reporte HTML de Playwright se puede ver con:
```bash
pnpm test:e2e:report
```

---

## Estructura de Archivos

```
app-casinos-tapin/
├── apps/admin/
│   ├── e2e/
│   │   ├── verify-transactions-stats.spec.ts  ← Script de prueba principal
│   │   └── flow-completo.spec.ts              ← Otras pruebas E2E
│   └── playwright.config.ts                   ← Configuración de Playwright
│
├── screenshots/                               ← Capturas de pantalla generadas
│   ├── transactions-01-after-login.png
│   ├── transactions-02-initial-page.png
│   └── ...
│
├── packages/api/
│   └── prisma/
│       ├── schema.prisma                      ← Esquema de base de datos
│       ├── seed.ts                            ← Script de población de datos
│       └── dev.db                             ← Base de datos SQLite
│
└── Documentación de Pruebas:
    ├── TESTING-README.md                      ← Esta guía
    ├── TEST-EXECUTION-SUMMARY.md              ← Resumen de ejecución
    ├── TRANSACTIONS-TEST-REPORT.md            ← Reporte detallado
    ├── VERIFICATION-SUMMARY.md                ← Resumen de verificación
    ├── NEXT-STEPS-TRANSACTIONS.md             ← Pasos siguientes
    └── check-data.sh                          ← Script de verificación de datos
```

---

## Comandos Disponibles

### Pruebas E2E

```bash
# Todas las pruebas
pnpm test:e2e

# Solo pruebas de transacciones
pnpm test:e2e verify-transactions-stats

# Una prueba específica
pnpm test:e2e verify-transactions-stats -g "Quick verification"

# Con navegador visible (útil para ver qué está pasando)
pnpm test:e2e verify-transactions-stats --headed

# Modo debug (pausa en cada paso)
pnpm test:e2e verify-transactions-stats --debug

# Con UI interactiva de Playwright
pnpm test:e2e:ui

# Ver reporte de última ejecución
pnpm test:e2e:report
```

### Base de Datos

```bash
cd packages/api

# Poblar con datos de prueba
pnpm db:seed

# Abrir interfaz visual de datos (Prisma Studio)
pnpm db:studio

# Aplicar migraciones
pnpm db:migrate

# Regenerar cliente de Prisma
pnpm db:generate
```

### Verificación de Datos

```bash
# Ejecutar script de verificación
bash check-data.sh
```

---

## Las 3 Pruebas Incluidas

### Prueba 1: Verificación Completa
**Duración**: ~17 segundos
**Propósito**: Verificación exhaustiva de todos los elementos

**Qué hace**:
1. Login con credenciales de admin
2. Navega a /transactions
3. Espera carga de estadísticas
4. Captura página completa
5. Identifica y captura tarjetas de estadísticas
6. Busca tabs de navegación
7. Busca tabla de transacciones
8. Analiza estructura de página
9. Verifica elementos esperados

**Capturas generadas**:
- transactions-01-after-login.png
- transactions-02-initial-page.png
- transactions-03-stats-loaded.png
- transactions-04-full-page.png
- transactions-05-stat-card-1.png
- transactions-09-final-state.png

### Prueba 2: Verificación Rápida
**Duración**: ~14 segundos
**Propósito**: Verificación básica de acceso y carga

**Qué hace**:
1. Login
2. Navega a /transactions
3. Verifica URL correcta
4. Captura única de pantalla

**Capturas generadas**:
- transactions-quick-verify.png

### Prueba 3: Análisis de Estadísticas
**Duración**: ~14 segundos
**Propósito**: Verificación de contenido numérico

**Qué hace**:
1. Login
2. Navega a /transactions
3. Analiza contenido de página
4. Verifica símbolos de moneda
5. Mide longitud de contenido

**Capturas generadas**:
- transactions-stats-analysis.png

---

## Solución de Problemas Comunes

### Error: "Base de datos vacía" o Estadísticas muestran "..."

**Solución**:
```bash
cd packages/api
pnpm db:seed
```

Luego ejecuta las pruebas nuevamente.

---

### Error: "Test timeout" o "Page not loading"

**Causa**: El servidor de desarrollo no está corriendo o está lento

**Solución**:
1. Verifica que el servidor esté corriendo:
   ```bash
   # En una terminal
   cd apps/admin
   pnpm dev
   ```

2. Espera a que diga "Ready" antes de ejecutar pruebas

3. Si el problema persiste, aumenta el timeout en playwright.config.ts

---

### Error: "Cannot find screenshots directory"

**Solución**:
```bash
mkdir screenshots
```

O el script lo creará automáticamente.

---

### Las pruebas fallan con "Login failed"

**Causa**: Credenciales incorrectas o usuario no existe

**Solución**:
```bash
cd packages/api
pnpm db:seed  # Esto recrea los usuarios de prueba
```

**Credenciales correctas**:
- Email: `admin@colegio.cl`
- Password: `admin123`

---

### No se generan capturas de pantalla

**Causa**: Ruta de screenshots incorrecta

**Solución**: Edita `verify-transactions-stats.spec.ts` y cambia:
```typescript
const SCREENSHOTS_DIR = 'C:\\Users\\josel\\Documents\\app-casinos-tapin\\screenshots';
```

Por la ruta absoluta a tu carpeta screenshots.

---

## Interpretando los Resultados

### Resultado Exitoso
```
Running 3 tests using 3 workers

  ok 1 [chromium] › ... › 1. Complete verification (16.6s)
  ok 2 [chromium] › ... › 2. Quick verification (14.2s)
  ok 3 [chromium] › ... › 3. Statistics cards (13.8s)

  3 passed (22.3s)
```

Esto significa que:
- Todas las pruebas pasaron
- La página carga correctamente
- Los elementos esperados están presentes
- Las capturas de pantalla fueron generadas

---

### Resultado con Fallos
```
  x 1 [chromium] › ... › 1. Complete verification (30.0s)

  Error: Test timeout of 30000ms exceeded.
```

Esto podría indicar:
- El servidor no está corriendo
- La página tiene un error que impide su carga
- Hay un problema de red o rendimiento

**Acción**: Revisa los logs, las capturas de pantalla generadas y el video de la prueba fallida.

---

## Elementos que se Verifican

### Tarjetas de Estadísticas
- ✅ Tickets Validados Hoy
- ✅ Ventas del Día
- ✅ Recargas del Día
- ✅ Transacciones Hoy

### Tabs de Filtrado
- ✅ Todas
- ✅ Tickets Hoy
- ✅ Ventas
- ✅ Recargas

### Funcionalidades
- ✅ Botón "Exportar CSV"
- ✅ Campo de búsqueda
- ✅ Botón de filtros
- ✅ Navegación del menú

---

## Mejores Prácticas

### Antes de Ejecutar Pruebas

1. **Asegura que el servidor esté corriendo**
   ```bash
   cd apps/admin
   pnpm dev
   ```

2. **Verifica que haya datos de prueba**
   ```bash
   bash check-data.sh
   # Si todo sale 0, ejecuta: cd packages/api && pnpm db:seed
   ```

3. **Limpia capturas antiguas si es necesario**
   ```bash
   rm screenshots/transactions-*.png
   ```

### Durante las Pruebas

1. **Usa --headed para debugging**
   - Te permite ver qué está haciendo el navegador
   - Útil para identificar problemas visuales

2. **Usa --debug para pausar**
   - Pausa la ejecución en cada paso
   - Te permite inspeccionar el estado

3. **Revisa los logs en la consola**
   - Los tests imprimen mensajes útiles
   - Indica qué elementos encuentra o no

### Después de las Pruebas

1. **Revisa las capturas de pantalla**
   - Verifica visualmente que todo se vea bien
   - Compara con capturas anteriores

2. **Lee el reporte HTML**
   ```bash
   pnpm test:e2e:report
   ```

3. **Documenta cualquier problema encontrado**

---

## Extendiendo las Pruebas

### Agregar una Nueva Prueba

```typescript
test('4. Mi nueva prueba', async ({ page }) => {
  console.log('\n=== Mi Nueva Prueba ===\n');

  await loginUser(page);
  await page.goto('/transactions');

  // Tu lógica de prueba aquí

  await captureScreenshot(page, 'mi-nueva-captura.png');
});
```

### Verificar un Elemento Específico

```typescript
// Verificar que un elemento existe
const element = page.locator('text=Mi Texto');
await expect(element).toBeVisible();

// Verificar un valor numérico
const statValue = await page.locator('[data-testid="stat-value"]').textContent();
expect(parseInt(statValue)).toBeGreaterThan(0);

// Hacer click en un elemento
await page.click('button:has-text("Exportar CSV")');
```

### Agregar Datos de Prueba Específicos

Edita `packages/api/prisma/seed.ts` para agregar:
- Más transacciones
- Diferentes tipos de datos
- Casos edge
- Datos de error

---

## Integración Continua (CI/CD)

Para ejecutar estas pruebas en CI/CD (GitHub Actions, etc.):

```yaml
- name: Run E2E Tests
  run: |
    cd packages/api
    pnpm db:seed
    cd ../../apps/admin
    pnpm test:e2e verify-transactions-stats
```

---

## Recursos Adicionales

### Documentación
- [Playwright Docs](https://playwright.dev/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Next.js Testing](https://nextjs.org/docs/testing)

### Archivos de Documentación del Proyecto
- `TEST-EXECUTION-SUMMARY.md` - Resumen completo de la ejecución
- `TRANSACTIONS-TEST-REPORT.md` - Reporte detallado de resultados
- `VERIFICATION-SUMMARY.md` - Resumen de verificación visual
- `NEXT-STEPS-TRANSACTIONS.md` - Guía de debugging y próximos pasos

### Scripts del Proyecto
- `check-data.sh` - Verificar datos en la base de datos
- `verify-transactions-stats.spec.ts` - Script principal de pruebas

---

## Credenciales de Prueba

```
Super Admin:        super@tapin.cl / superadmin123
School Admin:       admin@colegio.cl / admin123
Cafeteria Operator: casino@colegio.cl / casino123
Guardian (Mobile):  apoderado@test.cl / apoderado123
```

**Nota**: Las pruebas usan la cuenta `admin@colegio.cl` por defecto.

---

## Contacto

Para preguntas o problemas:
1. Revisa la documentación en los archivos MD generados
2. Ejecuta `bash check-data.sh` para diagnóstico
3. Revisa los logs de Playwright con `pnpm test:e2e:report`

---

**Última Actualización**: 19 de enero de 2026
**Creado por**: Claude Code (Test Engineer Agent)
**Framework**: Playwright + TypeScript + Next.js
