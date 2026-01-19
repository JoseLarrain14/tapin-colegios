# Plan de Limpieza y Organización del Proyecto

## Resumen Ejecutivo

El proyecto `app-casinos-tapin` es un monorepo con:
- **apps/mobile/** - React Native Expo (frontend móvil)
- **packages/api/** - Backend Fastify + Prisma
- **packages/shared/** - Utilidades compartidas

Se identificaron ~15MB de archivos innecesarios y varias oportunidades de mejora estructural.

---

## Fase 1: Limpieza de Archivos Innecesarios

### 1.1 Archivos temporales en raíz (PRIORIDAD CRÍTICA)
Eliminar todos los archivos/directorios temporales:

```
# Archivos tmpclaude-* (más de 200 directorios)
tmpclaude-*-cwd

# Otros temporales
.agent.lock
nul
```

### 1.2 Archivos de prueba/debug (PRIORIDAD ALTA)
Eliminar archivos JSON de prueba manual:

```
test-login.json
create-order.json
create-student.json
register-test.json
recharge.json
payment-init.json
query.sql
transacciones-2026-01-13.csv
```

### 1.3 Bases de datos locales (PRIORIDAD ALTA)
Eliminar o agregar a .gitignore:

```
assistant.db
features.db
```

### 1.4 Carpetas duplicadas (PRIORIDAD ALTA)
Eliminar copias antiguas del proyecto en la raíz:

```
app-casinos-tapin/    # Copia antigua (~664 KB)
tapin-colegios/       # Copia antigua (~664 KB)
```

### 1.5 Screenshots de tests manuales
**DECISIÓN: CONSERVAR** - Mantener `.playwright-mcp/` versionado como evidencia de pruebas.

---

## Fase 2: Actualizar .gitignore

Agregar patrones para evitar futuros archivos innecesarios:

```gitignore
# Temporales de Claude
tmpclaude-*
.agent.lock

# Bases de datos locales
*.db
!packages/api/prisma/*.db

# Archivos de prueba manual
test-*.json
*-test.json
*.sql

# Exports temporales
*.csv

# Configuración local de Claude
.claude_assistant_settings.json
.claude_settings.json
```

**NOTA:** `.playwright-mcp/` NO se agrega a .gitignore (se conserva versionado).

---

## Fase 3: Organización del Código

**DECISIÓN: OMITIR** - Solo se realizará limpieza de archivos. La reorganización de código (consolidar rutas, mover tipos) se hará en una fase posterior si es necesario.

---

## Fase 4: Verificación

### 4.1 Build del proyecto
```bash
npm run build --workspaces
```

### 4.2 Lint
```bash
npm run lint --workspaces
```

### 4.3 Iniciar aplicaciones
```bash
# API
npm run dev --workspace=packages/api

# Mobile
npm run dev --workspace=apps/mobile
```

### 4.4 Tests (cuando existan)
```bash
npm run test --workspaces --if-present
```

---

## Fase 5: Documentación

### 5.1 Actualizar README.md
- Documentar estructura actual del proyecto
- Agregar instrucciones de setup

### 5.2 Crear CHANGELOG.md
- Registrar cambios de limpieza realizados

---

## Archivos Críticos a NO Modificar

| Archivo | Razón |
|---------|-------|
| `packages/api/prisma/dev.db` | BD de desarrollo activa |
| `packages/api/prisma/schema.prisma` | Schema de BD |
| `.env` archivos | Variables de entorno |
| `pnpm-lock.yaml` | Lock de dependencias |

---

## Estimación de Limpieza

| Categoría | Archivos | Tamaño Est. |
|-----------|----------|-------------|
| tmpclaude-* | 200+ | ~5-10 MB |
| Carpetas duplicadas | 2 | ~1.3 MB |
| JSON de prueba | 6 | ~700 bytes |
| Screenshots | 108 | ~3 MB |
| **TOTAL** | **316+** | **~15 MB** |

---

## Comandos Ejecutados

```powershell
# 1. Crear backup
git branch backup/pre-cleanup

# 2. Limpiar temporales
Remove-Item -Recurse -Force tmpclaude-*
Remove-Item -Force .agent.lock -ErrorAction SilentlyContinue
Remove-Item -Force nul -ErrorAction SilentlyContinue

# 3. Limpiar archivos de prueba
Remove-Item -Force test-login.json, create-order.json, create-student.json
Remove-Item -Force register-test.json, recharge.json, payment-init.json
Remove-Item -Force query.sql

# 4. Limpiar bases de datos debug
Remove-Item -Force assistant.db, features.db -ErrorAction SilentlyContinue

# 5. Eliminar carpetas duplicadas
Remove-Item -Recurse -Force app-casinos-tapin/
Remove-Item -Recurse -Force tapin-colegios/

# 6. Verificar
npm run build --workspaces
npm run lint --workspaces

# 7. Commit
git add -A
git commit -m "chore: cleanup temporary files and update .gitignore"
```
