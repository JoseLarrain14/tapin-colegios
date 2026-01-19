# Test de Login - Panel Admin

## Instrucciones para probar el login

### 1. Verificar que los servicios estén corriendo

```bash
# Terminal 1 - API
cd packages/api
pnpm dev

# Terminal 2 - Admin Panel
cd apps/admin
pnpm dev
```

### 2. Verificar endpoints

```bash
# Verificar API está corriendo
curl http://localhost:4000/health

# Verificar panel admin está corriendo
curl -I http://localhost:3003
```

### 3. Probar login manualmente

1. Abrir navegador en: `http://localhost:3003`
2. Debería redirigir automáticamente a `/login` (sin autenticación)
3. Ingresar credenciales:
   - Email: `admin@colegio.cl`
   - Password: `admin123`
4. Click en "Iniciar Sesión"
5. Debería redirigir a `/` (dashboard principal)
6. Verificar que se muestre:
   - Nombre de usuario (derivado del email)
   - Email del usuario
   - Role del usuario
   - Sidebar con navegación

### 4. Verificar que la cookie se estableció

En DevTools del navegador:
1. Abrir Application > Cookies
2. Buscar cookie `tapin-auth-token`
3. Verificar que tenga un valor (el JWT token)

### 5. Verificar que el store de Zustand funciona

En DevTools del navegador:
1. Abrir Application > Local Storage
2. Buscar `tapin-auth-storage`
3. Verificar que contenga:
   ```json
   {
     "state": {
       "user": {
         "id": "...",
         "email": "admin@colegio.cl",
         "role": "school_admin",
         "emailVerified": true
       },
       "token": "eyJhbGci...",
       "isAuthenticated": true
     }
   }
   ```

### 6. Verificar navegación protegida

1. Estando logueado, visitar diferentes rutas:
   - `/` → Debe mostrar dashboard
   - `/menu` → Debe mostrar menú
   - `/students` → Debe mostrar estudiantes
   - `/transactions` → Debe mostrar transacciones

2. Cerrar sesión (botón "Cerrar Sesión")
3. Debería redirigir a `/login`
4. Cookie debe eliminarse
5. Local storage debe limpiarse

### 7. Verificar protección de rutas

1. Sin estar logueado, intentar acceder a:
   - `http://localhost:3003/` → Debe redirigir a `/login`
   - `http://localhost:3003/menu` → Debe redirigir a `/login?from=/menu`
   - `http://localhost:3003/students` → Debe redirigir a `/login?from=/students`

2. Después de login, debe redirigir a la ruta original

## Verificación de errores comunes

### Error: Cannot connect to API
- **Causa**: API no está corriendo en puerto 4000
- **Solución**: Iniciar API con `pnpm dev` en `packages/api`

### Error: Cookie no se establece
- **Causa**: Respuesta de API no tiene el formato correcto
- **Solución**: Verificar que API devuelva `{success: true, data: {user, accessToken}}`

### Error: Redirect loop
- **Causa**: Middleware o rutas mal configuradas
- **Solución**: Verificar que exista `(dashboard)/page.tsx` y no `app/page.tsx`

### Error: CORS
- **Causa**: API no permite peticiones desde el admin panel
- **Solución**: Verificar configuración CORS en `packages/api/src/index.ts`

## Resultado esperado

✅ Login funciona correctamente
✅ Token se guarda en cookie y localStorage
✅ Usuario puede navegar por todas las rutas protegidas
✅ Logout limpia la sesión correctamente
✅ Rutas están protegidas (redirigen a login sin autenticación)
