# Plan: Arreglar Autenticación del Panel Admin

> **Estado: COMPLETADO** - Todos los cambios fueron implementados y probados.

## Problema Principal
El login del panel admin no funciona debido a **2 problemas críticos**:

### Problema 1: URL de API incorrecta
**Archivo:** `apps/admin/src/lib/api.ts:5`
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
```
- El fallback es `/api` pero las rutas del servidor están en `/api/v1/`
- El cliente llama a `/auth/login` que resulta en `/api/auth/login`
- La ruta correcta es `/api/v1/auth/login`

### Problema 2: Estructura de respuesta incorrecta
**Archivo:** `apps/admin/src/app/(auth)/login/page.tsx:28`
```typescript
const { user, token } = response.data  // INCORRECTO
```

**El servidor retorna (auth.routes.ts:78-82):**
```typescript
{
  success: true,
  message: 'Inicio de sesión exitoso',
  data: {
    user: {...},
    accessToken: string,  // No "token"
    refreshToken: string
  }
}
```

La extracción correcta debería ser: `response.data.data.accessToken`

---

## Credenciales de Prueba
- **Email:** `admin@colegio.cl`
- **Password:** `admin123`
- **Rol:** `school_admin`

---

## Plan de Acción

### Paso 1: Corregir URL base de API
**Archivo:** `apps/admin/src/lib/api.ts`

Cambiar línea 5:
```typescript
// ANTES
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

// DESPUÉS
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
```

### Paso 2: Corregir extracción de datos del login
**Archivo:** `apps/admin/src/app/(auth)/login/page.tsx`

Cambiar líneas 27-34:
```typescript
// ANTES
const response = await apiClient.auth.login(email, password)
const { user, token } = response.data

if (!user || !token) {
  throw new Error('Respuesta inválida del servidor')
}

login(user, token)
document.cookie = `tapin-auth-token=${token}; path=/; max-age=2592000; SameSite=Strict`

// DESPUÉS
const response = await apiClient.auth.login(email, password)
const responseData = response.data

if (!responseData.success || !responseData.data) {
  throw new Error(responseData.message || 'Respuesta inválida del servidor')
}

const { user, accessToken } = responseData.data

if (!user || !accessToken) {
  throw new Error('Respuesta inválida del servidor')
}

login(user, accessToken)
document.cookie = `tapin-auth-token=${accessToken}; path=/; max-age=2592000; SameSite=Strict`
```

### Paso 3: Actualizar .env.example (documentación)
**Archivo:** `apps/admin/.env.example`

Asegurar que tenga la URL correcta:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `apps/admin/src/lib/api.ts` | Corregir URL base fallback a `/api/v1` |
| `apps/admin/src/app/(auth)/login/page.tsx` | Corregir extracción de `accessToken` desde `response.data.data` |
| `apps/admin/.env.example` | Actualizar documentación de URL |

---

## Verificación

### Test 1: Probar API directamente
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@colegio.cl","password":"admin123"}'
```

### Test 2: Probar login en Admin Panel
1. Iniciar API: `cd packages/api && pnpm dev`
2. Iniciar Admin: `cd apps/admin && pnpm dev`
3. Abrir `http://localhost:3000/login`
4. Ingresar credenciales: `admin@colegio.cl` / `admin123`
5. Verificar redirección al dashboard

### Test 3: Verificar en DevTools
- Request va a `http://localhost:3001/api/v1/auth/login`
- Response tiene `status: 200`
- Body contiene `success: true` y `data.accessToken`

---

## Actualización de Documentación
Después de los cambios, actualizar:
- `QUICK-START-ADMIN.md` - Verificar credenciales y pasos
- `README.md` - Si es necesario
