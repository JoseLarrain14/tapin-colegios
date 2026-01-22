# Guia de Desarrollo - Tap In Colegios

Esta guia explica como levantar el sistema completo para desarrollo local.

## Inicio Rapido (TL;DR)

```bash
# Terminal 1 - API (INICIAR PRIMERO)
pnpm run dev:api
# Esperar mensaje: "Server is running on http://0.0.0.0:3001"

# Terminal 2 - Admin Panel
pnpm run dev:admin
# Esperar mensaje: "Ready in Xs" -> http://localhost:3000

# Terminal 3 - Mobile App
cd apps/mobile && npx expo start --clear
# Esperar mensaje: "Waiting on http://localhost:8081" (o puerto disponible)
# Bundling inicial toma ~20-30 segundos
```

**Credenciales rapidas:**
- Admin: `admin@colegio.cl` / `admin123`
- Mobile: `apoderado@test.cl` / `apoderado123`

---

## Arquitectura del Sistema

El proyecto es un **monorepo** con tres aplicaciones principales:

| Servicio | Ubicacion | Puerto | Descripcion |
|----------|-----------|--------|-------------|
| **API (Backend)** | `packages/api` | 3001 | Fastify + Prisma + SQLite |
| **Admin Panel** | `apps/admin` | 3000 | Next.js - Panel de administracion |
| **Mobile App** | `apps/mobile` | 8081* | Expo/React Native - App para apoderados |

*Si el puerto 8081 está ocupado, Expo usará 8082, 8083, etc. Ver terminal para el puerto actual.

## Prerequisitos

- Node.js 20 LTS o superior
- pnpm (recomendado) o npm
- Git

## Instalacion Inicial

```bash
# Clonar el repositorio
git clone <repository-url>
cd tap-in-colegios

# Instalar dependencias
pnpm install

# Generar cliente Prisma
pnpm run db:generate

# Ejecutar seed (datos de prueba)
cd packages/api && npx prisma db seed && cd ../..
```

## Levantar el Sistema

### Opcion 1: Levantar Todo (Recomendado)

```bash
# Desde la raiz del proyecto, en terminales separadas:

# Terminal 1 - API (INICIAR PRIMERO)
pnpm run dev:api

# Terminal 2 - Admin Panel
pnpm run dev:admin

# Terminal 3 - Mobile App
pnpm run dev:mobile
```

**IMPORTANTE:** Siempre iniciar la API primero para evitar conflictos de puertos.

### Opcion 2: Comandos Individuales

```bash
# Solo API
pnpm run dev:api

# Solo Admin
pnpm run dev:admin

# Solo Mobile
pnpm run dev:mobile
```

## URLs de Acceso

Una vez levantados los servicios:

| Servicio | URL |
|----------|-----|
| API Health Check | http://localhost:3001/health |
| API Documentation (Swagger) | http://localhost:3001/documentation |
| Admin Panel | http://localhost:3000 |
| Mobile App (Web) | http://localhost:8081 (o puerto asignado por Expo) |

**Nota:** Si Expo muestra "Waiting on http://localhost:8090", usar ese puerto en lugar de 8081.

## Credenciales de Prueba

Todos los usuarios estan vinculados al **Colegio San Francisco de Asis**:

| Rol | Email | Password | Uso |
|-----|-------|----------|-----|
| Super Admin | `super@tapin.cl` | `superadmin123` | Acceso total |
| School Admin | `admin@colegio.cl` | `admin123` | Admin Panel |
| Cafeteria Operator | `casino@colegio.cl` | `casino123` | Punto de venta |
| Guardian (Apoderado) | `apoderado@test.cl` | `apoderado123` | Mobile App |

### Estudiantes de Prueba

| Nombre | Curso | RUT | Saldo |
|--------|-------|-----|-------|
| Juan Perez | 8vo Basico A | 12345678-9 | $5.000 |
| Sofia Perez | 5to Basico B | 22222222-2 | $10.000 |

## Verificar que Todo Funciona

Despues de levantar los servicios, ejecutar estos comandos para verificar:

```bash
# 1. Verificar API
curl http://localhost:3001/health
# Debe retornar: {"status":"ok","timestamp":"..."}

# 2. Probar login via curl
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@colegio.cl\",\"password\":\"admin123\"}"
# Debe retornar: {"success":true,"message":"Inicio de sesion exitoso",...}
```

Si el curl funciona pero el browser no, ver seccion "Error 401 en Login desde Browser".

## Solucion de Problemas

### Error 401 en Login desde Browser

Si el login falla con error 401 pero curl funciona:

1. **Limpiar localStorage** - Abrir DevTools (F12) > Application > Local Storage > Clear
2. **Verificar credenciales exactas:**
   - Email: `admin@colegio.cl` (sin espacios, todo minusculas)
   - Password: `admin123` (8 caracteres exactos)
3. **Verificar en Network tab** que el payload enviado sea correcto
4. **Ejecutar en consola del browser:**
   ```javascript
   localStorage.clear();
   location.reload();
   ```

### Error: Puerto en uso (EADDRINUSE)

Si ves el error `listen EADDRINUSE: address already in use`:

```bash
# Ver que procesos usan los puertos
netstat -ano | findstr ":3000 :3001 :8081"

# En PowerShell, matar procesos especificos
Stop-Process -Id <PID> -Force

# O matar todos los procesos Node
taskkill /F /IM node.exe
```

### Orden de Inicio Correcto

Si hay conflictos de puertos, seguir este orden:

1. **Detener todos los servicios**
2. **Iniciar API primero** (puerto 3001)
3. **Verificar API funciona:** `curl http://localhost:3001/health`
4. **Iniciar Admin** (puerto 3000)
5. **Iniciar Mobile** (puerto 8081)

### Error CORS en Mobile

Si ves errores de CORS al hacer login desde la app mobile:

1. Verificar que la API este corriendo en puerto 3001
2. Verificar que no haya otro servicio en ese puerto
3. Recargar la pagina del navegador (Ctrl+Shift+R)

### Expo no inicia (puerto 8081 ocupado)

```bash
# Encontrar proceso en puerto 8081
netstat -ano | findstr ":8081"

# Matar el proceso
Stop-Process -Id <PID> -Force

# Reiniciar Expo con cache limpio
cd apps/mobile && npx expo start --clear
```

### Mobile muestra pantalla en blanco

Esperar a que Metro Bundler termine de compilar (puede tomar 20-30 segundos la primera vez). Observar la terminal para ver el progreso del bundling.

### Mobile App - Optimizaciones de Rendimiento (Enero 2025)

Se realizaron las siguientes optimizaciones para mejorar el tiempo de inicio:

1. **metro.config.js** - Configuración para monorepo pnpm
2. **theme.ts shadows** - Compatibilidad con web usando `boxShadow`
3. **Imágenes PNG** - Regeneradas con tamaños correctos (1024x1024, etc.)

Si el bundling toma más de 60 segundos, verificar que estos archivos existan:
- `apps/mobile/metro.config.js`
- `apps/mobile/assets/icon.png` (debe ser ~5KB, no 111 bytes)

### Mobile App - Puerto Ocupado

Si el puerto 8081 está ocupado, Expo usará automáticamente otro puerto (8082, 8083, etc.).

```bash
# Iniciar en puerto específico
cd apps/mobile && npx expo start --clear --port 8090

# O dejar que Expo elija automáticamente
cd apps/mobile && npx expo start --clear
```

### Mobile App - Limpiar Caché Completo

Si hay problemas de bundling persistentes:

```bash
cd apps/mobile
rm -rf .expo
rm -rf node_modules/.cache
npx expo start --clear
```

### Mobile muestra productos que no estan en el calendario

Si la app movil muestra productos (ej: "Galletas") que no fueron configurados en el calendario del admin:

1. Verificar que la cafeteria tenga un `WeeklyPattern` configurado
2. La app usa SOLO el endpoint `/menu-planning/resolve` que respeta el calendario
3. No hay fallback a productos con `availableDays` - solo se muestran items del calendario

### Error 400 al crear producto en Admin

Si al crear un producto desde Admin > Menu > Nuevo Producto recibes error 400:

1. Verificar que el formulario envie `availableDays` como **array** y no como string
2. El precio debe ser un numero entero positivo (en centavos)
3. Revisar la consola del navegador para ver el error exacto de validacion

## Base de Datos

### Comandos Prisma

```bash
# Abrir Prisma Studio (UI visual)
pnpm run db:studio

# Aplicar migraciones
pnpm run db:migrate

# Regenerar cliente despues de cambios al schema
pnpm run db:generate

# Ejecutar seed (datos de prueba)
cd packages/api && npx prisma db seed
```

### Resetear Base de Datos

```bash
cd packages/api
npx prisma migrate reset
```

Esto elimina todos los datos y ejecuta el seed nuevamente.

## Variables de Entorno

### API (`packages/api/.env`)

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"
PORT=3001
HOST=0.0.0.0
NODE_ENV="development"
```

### Admin (`apps/admin/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### Mobile (`apps/mobile/.env`)

```env
EXPO_PUBLIC_API_URL=http://localhost:3001/api/v1
EXPO_PUBLIC_ENV=development
```

## Testing

### Probar Flujo Completo

1. **Login Admin:** http://localhost:3000 con `admin@colegio.cl` / `admin123`
2. **Login Mobile:** http://localhost:8081 con `apoderado@test.cl` / `apoderado123`
3. **Verificar API:** http://localhost:3001/documentation

### Ejecutar Tests E2E (Admin)

```bash
cd apps/admin
npx playwright test
```

## Estructura de Puertos

```
Puerto 3000 -> Admin Panel (Next.js)
Puerto 3001 -> API Backend (Fastify)
Puerto 8081 -> Mobile App (Expo Metro Bundler)
```

## Tips de Desarrollo

1. **Usar terminales separadas** para cada servicio facilita ver los logs
2. **La API debe iniciar primero** para evitar que Admin tome el puerto 3001
3. **Recargar con cache limpio** (Ctrl+Shift+R) si hay problemas de CORS
4. **Expo con --clear** si hay problemas de compilacion
5. **Prisma Studio** es util para ver y editar datos durante desarrollo

## Features Principales

### Sistema de Calendario de Menu (Admin)

Pagina `/menu/calendar` permite planificar menus con drag-and-drop:

- **Templates:** Menus reutilizables que se pueden arrastrar a cualquier dia
- **Patron Semanal:** Menu por defecto para cada dia de la semana
- **Asignaciones:** Menus especificos para fechas puntuales

Prioridad de resolucion: Asignacion especifica > Patron semanal > (vacio si no hay configuracion)

#### Sincronizacion Admin-Mobile

La app movil obtiene el menu desde el endpoint `/menu-planning/:cafeteriaId/resolve/:date` que:

1. Busca `DailyMenuAssignment` para la fecha especifica
2. Si no existe, busca `WeeklyPattern` para el dia de la semana
3. Si no hay configuracion, devuelve items vacios (no hay fallback a datos legacy)

**IMPORTANTE:** Los productos creados en "Menu > Productos" NO aparecen automaticamente en la app movil.
Para que aparezcan, deben agregarse al **Calendario** o al **Patron Semanal**.

### Sistema de Tickets y Wallet

El sistema sincroniza tickets con el balance del wallet:

- Al comprar un paquete: se agregan tickets con `pricePerTicket` calculado
- Al consumir un ticket: el balance baja proporcionalmente
- Formula: `balance = sum(tickets.quantity * tickets.pricePerTicket)`

### Endpoints Principales

| Categoria | Endpoint | Descripcion |
|-----------|----------|-------------|
| Auth | POST `/auth/login` | Login de usuarios |
| Students | GET `/admin/students` | Lista estudiantes del colegio |
| Casino | POST `/casino/consume` | Marcar consumo de ticket |
| Menu | GET `/menu-planning/:id/resolve/:date` | Obtener menu para fecha |
| Transactions | GET `/admin/transactions` | Historial de transacciones |

Ver documentacion completa en: http://localhost:3001/documentation

## Archivos de Referencia

- `AGENTS.md` - Patrones y convenciones del proyecto
- `packages/api/prisma/schema.prisma` - Modelos de base de datos

## Archivos de Configuracion Mobile App

Estos archivos son importantes para el correcto funcionamiento de la Mobile App:

| Archivo | Proposito |
|---------|-----------|
| `apps/mobile/metro.config.js` | Configuracion de Metro para monorepo pnpm |
| `apps/mobile/app.json` | Configuracion de Expo (nombre, iconos, plugins) |
| `apps/mobile/src/constants/theme.ts` | Colores, spacing, shadows del tema |
| `apps/mobile/assets/create-assets.js` | Script para regenerar iconos PNG |
| `apps/mobile/app/(tabs)/_layout.tsx` | Layout de tabs con iconos |

### Cambios Criticos para Web (Enero 2025)

**1. package.json** - Debe incluir `@expo/vector-icons`:
```json
"dependencies": {
  "@expo/vector-icons": "^14.0.0",
  ...
}
```

**2. metro.config.js** - Debe existir con esta configuracion:
```javascript
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
```

**3. theme.ts shadows** - Usa `createShadow()` para compatibilidad web:
```typescript
import { Platform } from 'react-native';

const createShadow = (offsetY: number, blur: number, opacity: number, elevation: number) => {
  if (Platform.OS === 'web') {
    return { boxShadow: `0px ${offsetY}px ${blur}px rgba(0, 0, 0, ${opacity})` };
  }
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: blur,
    elevation,
  };
};
```

### Regenerar Iconos (si hay errores de imagen)

Si ves errores "Crc error" durante el bundling:

```bash
cd apps/mobile/assets
node create-assets.js
```

Esto regenera icon.png, splash.png, adaptive-icon.png y favicon.png con tamaños correctos.

## Contacto

Si encuentras problemas no documentados aqui, actualiza esta guia con la solucion.
