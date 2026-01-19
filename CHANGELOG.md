# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto sigue [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Agregado
- Archivo `cleanup-plan.md` documentando el plan de limpieza del proyecto
- Directorio `.claude/` con configuración de agentes de desarrollo
- Directorio `.playwright-mcp/` con screenshots de pruebas de UI
- Archivo `CHANGELOG.md` para documentar cambios del proyecto

### Cambiado
- Actualizado `.gitignore` con patrones para archivos temporales de Claude
- Actualizado `README.md` con estructura de proyecto actualizada
- Actualizado `packages/api/package.json` agregando `"type": "module"` para soporte ESM

### Corregido
- Error de sintaxis en `packages/api/src/routes/wallets_new.routes.ts` (faltaba `}`)
- Variable no utilizada en `packages/api/src/routes/auth.routes.ts`
- Parámetro no utilizado en `packages/api/src/routes/schools.routes.ts`
- Referencia a propiedad inexistente en `packages/api/src/services/auth.service.ts`
- **Bug 1:** Botón FAB "Agregar" con texto azul en pantalla Mis Estudiantes (ahora blanco)
- **Bug 2:** Filtro "Todos" no funcionaba en Historial (removida auto-selección)
- **Bug 3:** Pantalla "Sin conexión" aparecía con WiFi en Estadísticas (mejorado manejo de errores)
- **Bug 4:** Overflow de botones en Home (reorganizado layout en dos filas)
- **Bug 5:** Validación RUT mostraba dígito correcto (mensaje genérico por seguridad)
- **Bug 6:** Cerrar sesión no funcionaba correctamente (corregido race condition)

### Eliminado
- 150+ directorios temporales `tmpclaude-*`
- Archivos de debug: `.agent.lock`, `assistant.db`, `features.db`
- Carpetas duplicadas del proyecto: `app-casinos-tapin/`, `tapin-colegios/`
- Archivos de prueba manual: `test-login.json`, `create-order.json`, etc.

## [0.1.0] - 2026-01-17

### Agregado
- Estructura inicial del monorepo
- Backend API con Fastify + Prisma (`packages/api`)
- App móvil con React Native Expo (`apps/mobile`)
- Paquete compartido (`packages/shared`)
- Sistema de autenticación JWT con refresh tokens
- CRUD de estudiantes y gestión de billeteras
- Sistema de pagos (mock) preparado para pasarelas reales
- Soporte para múltiples modelos de negocio por colegio
