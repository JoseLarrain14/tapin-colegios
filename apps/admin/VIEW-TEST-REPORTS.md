# Cómo Ver los Reportes de Testing

## Reporte HTML Interactivo de Playwright

### Opción 1: Abrir con Playwright
```bash
cd apps/admin
npx playwright show-report
```

Esto abrirá automáticamente el navegador con el reporte interactivo que incluye:
- Listado de todos los tests con estados
- Screenshots de cada paso
- Videos de tests fallidos
- Trazas de ejecución
- Estadísticas detalladas

### Opción 2: Abrir Directamente
Abrir en navegador:
```
file:///C:/Users/josel/Documents/app-casinos-tapin/apps/admin/playwright-report/index.html
```

O simplemente hacer doble click en:
```
C:\Users\josel\Documents\app-casinos-tapin\apps\admin\playwright-report\index.html
```

---

## Screenshots Capturados

### Ver Screenshots de Tests Exitosos
Ubicación: `C:\Users\josel\Documents\app-casinos-tapin\apps\admin\screenshots\`

Abrir cualquiera con visor de imágenes:
```bash
# Windows
start screenshots/login-page.png
start screenshots/after-login.png

# O navegar a la carpeta
cd C:\Users\josel\Documents\app-casinos-tapin\apps\admin\screenshots
explorer .
```

**Screenshots disponibles:**
1. `login-page.png` - Página de login inicial
2. `login-filled.png` - Formulario con credenciales
3. `login-error.png` - Mensaje de error
4. `before-login.png` - Antes de submit
5. `after-login.png` - Dashboard después de login ⭐

---

## Videos de Tests Fallidos

Ubicación: `C:\Users\josel\Documents\app-casinos-tapin\apps\admin\test-results\`

Cada carpeta de test fallido contiene:
- `test-failed-1.png` - Screenshot del error
- `video.webm` - Video de la ejecución completa

**Ver videos:**
```bash
# Navegar a test-results
cd C:\Users\josel\Documents\app-casinos-tapin\apps\admin\test-results
explorer .

# Los videos se pueden reproducir con cualquier reproductor que soporte WebM
# - VLC
# - Chrome/Edge (arrastrar el archivo al navegador)
# - Windows Media Player (con códec)
```

---

## Reportes en Markdown

### 1. Reporte Completo (Más Detallado)
```
C:\Users\josel\Documents\app-casinos-tapin\apps\admin\PLAYWRIGHT-TEST-REPORT.md
```

**Contenido:**
- Resumen ejecutivo
- Análisis detallado por sección
- Screenshots con descripciones
- Problemas identificados
- Recomendaciones
- Conclusiones

**Ver en VS Code:**
```bash
code PLAYWRIGHT-TEST-REPORT.md
```

### 2. Resumen (Quick Overview)
```
C:\Users\josel\Documents\app-casinos-tapin\apps\admin\TEST-SUMMARY.md
```

**Contenido:**
- Estado general
- Componentes verificados
- Problemas principales
- Screenshots clave
- Conclusión rápida

### 3. Tabla de Resultados (Referencia)
```
C:\Users\josel\Documents\app-casinos-tapin\apps\admin\TEST-RESULTS-TABLE.md
```

**Contenido:**
- Tabla de todos los tests
- Análisis de errores
- Estadísticas
- Matriz de cobertura
- Detalles de cada screenshot

---

## Log de Ejecución

Ver el log completo de la ejecución:
```bash
cat test-output.log
# o
code test-output.log
```

Contiene:
- Output de consola de cada test
- Errores completos con stack traces
- Tiempos de ejecución
- Logs de navegación

---

## Re-ejecutar Tests

### Todos los tests
```bash
cd apps/admin
npx playwright test
```

### Solo tests que fallaron
```bash
npx playwright test --last-failed
```

### Tests específicos
```bash
# Solo login tests
npx playwright test tests/login.spec.ts

# Solo auth flow tests
npx playwright test tests/auth-flow.spec.ts

# Un test específico
npx playwright test -g "login page loads correctly"
```

### Con UI interactiva
```bash
npx playwright test --ui
```

### En modo headed (ver el navegador)
```bash
npx playwright test --headed
```

### En modo debug
```bash
npx playwright test --debug
```

---

## Estructura de Archivos de Testing

```
apps/admin/
├── tests/
│   ├── login.spec.ts              # Tests de login page
│   ├── auth-flow.spec.ts          # Tests de autenticación
│   └── helpers/
│       └── test-utils.ts          # Utilidades (tiene el bug de localStorage)
├── screenshots/                    # Screenshots de tests exitosos
│   ├── login-page.png
│   ├── login-filled.png
│   ├── login-error.png
│   ├── before-login.png
│   └── after-login.png ⭐
├── test-results/                   # Resultados de tests fallidos
│   └── [test-name]/
│       ├── test-failed-1.png
│       └── video.webm
├── playwright-report/              # Reporte HTML interactivo
│   ├── index.html ⭐
│   └── data/
├── playwright.config.ts            # Configuración de Playwright
├── test-output.log                 # Log de ejecución
├── PLAYWRIGHT-TEST-REPORT.md       # Reporte completo ⭐
├── TEST-SUMMARY.md                 # Resumen ejecutivo
├── TEST-RESULTS-TABLE.md           # Tabla de resultados
└── VIEW-TEST-REPORTS.md            # Este archivo
```

---

## Navegación Rápida

### Para ver resultados ahora mismo:

1. **Reporte Visual (Recomendado):**
   ```bash
   cd apps/admin
   npx playwright show-report
   ```

2. **Screenshot más importante:**
   ```
   Abrir: apps/admin/screenshots/after-login.png
   ```
   Este muestra el dashboard funcionando completamente.

3. **Leer resumen rápido:**
   ```
   Abrir: apps/admin/TEST-SUMMARY.md
   ```

---

## Compartir Resultados

### Opción 1: Compartir HTML Report
El reporte HTML es autocontenido y se puede compartir:
```bash
# Comprimir playwright-report/
zip -r playwright-report.zip playwright-report/

# O simplemente compartir la carpeta
# El destinatario puede abrir index.html en cualquier navegador
```

### Opción 2: Compartir Screenshots
```bash
# Comprimir solo screenshots
zip -r test-screenshots.zip screenshots/
```

### Opción 3: Compartir Markdown Reports
Los archivos .md se pueden ver en GitHub, VS Code, o cualquier visor de Markdown:
- PLAYWRIGHT-TEST-REPORT.md
- TEST-SUMMARY.md
- TEST-RESULTS-TABLE.md

---

## Comandos Útiles

### Ver árbol de archivos de testing
```bash
tree test-results screenshots playwright-report
```

### Contar tests
```bash
# Total de tests
grep "test(" tests/*.spec.ts | wc -l

# Tests en login.spec.ts
grep "test(" tests/login.spec.ts | wc -l

# Tests en auth-flow.spec.ts
grep "test(" tests/auth-flow.spec.ts | wc -l
```

### Buscar tests específicos
```bash
# Tests que contienen "login" en el nombre
grep "test.*login" tests/*.spec.ts

# Tests marcados como .only (no debería haber)
grep "test.only" tests/*.spec.ts

# Tests marcados como .skip
grep "test.skip" tests/*.spec.ts
```

### Limpiar resultados anteriores
```bash
# Eliminar screenshots viejos
rm -rf screenshots/*.png

# Eliminar test results viejos
rm -rf test-results/

# Eliminar reporte HTML viejo
rm -rf playwright-report/

# Re-ejecutar y generar nuevos
npx playwright test
```

---

## Tips para Análisis

### 1. Comparar Screenshots
Usar un visor de imágenes que permita navegar entre archivos para comparar:
- `login-page.png` vs `login-filled.png` - Ver diferencia de focus
- `login-filled.png` vs `login-error.png` - Ver cómo aparece el error
- `before-login.png` vs `after-login.png` - Ver flujo completo

### 2. Analizar Videos
Los videos de tests fallidos muestran:
- Interacciones del usuario (clicks, typing)
- Navegación entre páginas
- Momentos exactos de falla
- Estado del browser cuando falla

### 3. Leer Stack Traces
En el reporte HTML o en test-output.log, los stack traces muestran:
- Línea exacta donde falló
- Función que causó el error
- Contexto del error
- Screenshots del momento de falla

---

## Próximos Pasos

### Después de revisar los reportes:

1. **Si quieres arreglar los tests:**
   - Editar `tests/helpers/test-utils.ts` línea 70
   - Agregar try-catch al clearAuth()
   - Re-ejecutar: `npx playwright test`

2. **Si quieres agregar más tests:**
   - Crear archivos .spec.ts en tests/
   - Usar test-utils.ts para helpers
   - Seguir patrón de login.spec.ts

3. **Si quieres testear otras páginas:**
   ```typescript
   // tests/dashboard.spec.ts
   test('dashboard loads correctly', async ({ page }) => {
     // Login first
     await TestHelpers.login(page, 'admin@colegio.cl', 'admin123');

     // Verify dashboard
     await expect(page.locator('text=Bienvenido')).toBeVisible();
   });
   ```

---

## Contacto y Documentación

**Playwright Docs:** https://playwright.dev
**Test Utils:** `tests/helpers/test-utils.ts`
**Config:** `playwright.config.ts`

**Reportes generados:** 18 de Enero 2026
