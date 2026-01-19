# Checklist de Instalación y Configuración

## Pre-requisitos

- [ ] Node.js >= 20.0.0 instalado
- [ ] npm instalado
- [ ] API backend corriendo en `http://localhost:3001`
- [ ] Base de datos del API configurada y migrada

## Instalación

### 1. Dependencias

```bash
# Desde la raíz del monorepo
cd C:\Users\josel\Documents\app-casinos-tapin
npm install
```

**Verificar que se instaló correctamente:**
- [ ] `node_modules` creado en `apps/admin/`
- [ ] No hay errores de dependencias peer
- [ ] TypeScript se instaló correctamente

### 2. Variables de Entorno

```bash
cd apps/admin
cp .env.example .env.local
```

**Editar `.env.local`:**
- [ ] `NEXT_PUBLIC_API_URL` apunta al backend correcto
- [ ] Guardar el archivo

### 3. Verificar Configuración

- [ ] `tsconfig.json` tiene path aliases configurados
- [ ] `tailwind.config.js` tiene contenido correcto
- [ ] `next.config.js` existe y está configurado
- [ ] `package.json` tiene todos los scripts necesarios

## Primera Ejecución

### 1. Iniciar en Desarrollo

```bash
# Desde la raíz
npm run dev:admin
```

**Verificar:**
- [ ] El servidor inicia sin errores
- [ ] Abre en `http://localhost:3000`
- [ ] No hay errores de compilación de TypeScript
- [ ] No hay errores de Tailwind

### 2. Probar Login

**Ir a:** `http://localhost:3000/login`

**Verificar:**
- [ ] La página de login se ve correctamente
- [ ] El formulario es funcional
- [ ] Los estilos de Tailwind se aplican
- [ ] El modo oscuro funciona (variables CSS)

**Intentar login con credenciales del seed:**
- Email: `admin@colegio.cl`
- Password: `admin123`

**Verificar:**
- [ ] El login llama al API correctamente
- [ ] El token se guarda en localStorage
- [ ] El token se guarda en cookie
- [ ] Redirige al dashboard
- [ ] No hay errores de CORS

### 3. Verificar Dashboard

**Después del login exitoso:**

**Verificar:**
- [ ] Redirige a `/dashboard`
- [ ] El layout con sidebar se muestra
- [ ] El nombre del usuario aparece en el sidebar
- [ ] Los cards de estadísticas se muestran
- [ ] Los iconos de Lucide se ven correctamente
- [ ] La navegación del sidebar funciona

### 4. Verificar Middleware

**Intentar acceder a `/dashboard` sin login:**
- [ ] Cerrar sesión
- [ ] Ir manualmente a `http://localhost:3000/dashboard`
- [ ] Debe redirigir a `/login`
- [ ] El parámetro `?from=/dashboard` debe estar en la URL

**Después de login:**
- [ ] Debe redirigir de vuelta a `/dashboard`

### 5. Verificar Página de Colegios

**Ir a:** `http://localhost:3000/schools`

**Verificar:**
- [ ] La página se carga
- [ ] Llama al API de colegios
- [ ] Muestra los colegios (si hay data)
- [ ] Muestra estado vacío (si no hay data)
- [ ] El buscador funciona
- [ ] La paginación funciona
- [ ] El loading state se muestra

### 6. Verificar API Client

**Abrir DevTools > Network:**
- [ ] Las requests tienen header `Authorization: Bearer <token>`
- [ ] La base URL es correcta
- [ ] Los errores 401 hacen logout automático

## Funcionalidades Core

### Autenticación
- [ ] Login funciona
- [ ] Logout funciona
- [ ] Token persiste en localStorage
- [ ] Token persiste en cookie
- [ ] Middleware protege rutas
- [ ] Redirección post-login funciona

### React Query
- [ ] Queries funcionan (useSchools, etc.)
- [ ] Mutations funcionan (create, update, delete)
- [ ] Loading states se muestran
- [ ] Error states se muestran
- [ ] Cache invalidation funciona
- [ ] Refetch manual funciona

### UI/UX
- [ ] Tailwind CSS funciona
- [ ] Componentes shadcn/ui se ven bien
- [ ] Iconos de Lucide funcionan
- [ ] Responsive design funciona (mobile/desktop)
- [ ] Variables CSS para tema funcionan
- [ ] Scrollbar personalizado funciona

### Navegación
- [ ] Sidebar desktop funciona
- [ ] Sidebar mobile funciona
- [ ] Links de navegación funcionan
- [ ] Active route highlighting (opcional)
- [ ] Breadcrumbs (si se implementan)

## Build de Producción

### 1. Build

```bash
cd apps/admin
npm run build
```

**Verificar:**
- [ ] Build completa sin errores
- [ ] No hay errores de TypeScript
- [ ] No hay warnings críticos
- [ ] Directorio `.next` se crea

### 2. Ejecutar Producción

```bash
npm run start
```

**Verificar:**
- [ ] Servidor inicia en modo producción
- [ ] La app funciona igual que en dev
- [ ] No hay errores en consola
- [ ] Performance es buena (< 3s load time)

## Componentes shadcn/ui Adicionales

Si quieres agregar más componentes:

```bash
cd apps/admin

# Input para formularios
npx shadcn-ui@latest add input

# Table para listas
npx shadcn-ui@latest add table

# Dialog para modales
npx shadcn-ui@latest add dialog

# Form para formularios complejos
npx shadcn-ui@latest add form

# Toast para notificaciones
npx shadcn-ui@latest add toast

# Select para dropdowns
npx shadcn-ui@latest add select

# Badge para etiquetas
npx shadcn-ui@latest add badge

# Dropdown Menu
npx shadcn-ui@latest add dropdown-menu
```

**Verificar después de cada instalación:**
- [ ] Componente se crea en `src/components/ui/`
- [ ] No hay errores de importación
- [ ] El componente funciona correctamente

## Troubleshooting

### Error: Cannot find module '@/...'

**Solución:**
1. Verificar `tsconfig.json` tiene:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```
2. Reiniciar el servidor de desarrollo
3. Reiniciar VSCode/editor

### Error: Tailwind classes no se aplican

**Solución:**
1. Verificar `globals.css` importa Tailwind:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
2. Verificar `tailwind.config.js` tiene content correcto
3. Reiniciar el servidor

### Error: Token inválido / 401

**Solución:**
1. Verificar que el API está corriendo
2. Limpiar localStorage: `localStorage.clear()`
3. Limpiar cookies
4. Volver a hacer login
5. Verificar que el token se guarda correctamente

### Error: Middleware redirige en loop

**Solución:**
1. Verificar que el middleware excluye rutas públicas
2. Verificar que la cookie se guarda con el nombre correcto
3. Limpiar todas las cookies
4. Reiniciar el servidor

### Error: CORS

**Solución:**
1. Verificar que el API tiene CORS configurado
2. Verificar que `NEXT_PUBLIC_API_URL` es correcto
3. Si es desarrollo, debe permitir `http://localhost:3000`

### Error: React Query no actualiza

**Solución:**
1. Verificar que las mutation invalidan el cache correcto
2. Verificar query keys
3. Usar `refetch()` manualmente si es necesario

## Desarrollo Continuo

### Crear Nueva Página CRUD

1. [ ] Crear directorio en `src/app/(dashboard)/[entidad]/`
2. [ ] Crear `page.tsx` para lista
3. [ ] Crear `new/page.tsx` para crear
4. [ ] Crear `[id]/page.tsx` para editar
5. [ ] Agregar endpoints en `src/lib/api.ts`
6. [ ] Agregar hooks en `src/lib/queries.ts`
7. [ ] Probar funcionalidad completa

### Agregar Nuevo Componente

1. [ ] Decidir si usar shadcn/ui o crear custom
2. [ ] Crear en `src/components/` o `src/components/ui/`
3. [ ] Exportar correctamente
4. [ ] Documentar con JSDoc
5. [ ] Agregar ejemplo de uso

### Integrar Nueva Librería

1. [ ] Instalar con `npm install`
2. [ ] Actualizar tipos si es necesario
3. [ ] Importar donde se necesite
4. [ ] Verificar que no rompe build
5. [ ] Documentar en README si es core

## Próximos Pasos Sugeridos

- [ ] Implementar CRUD completo de Usuarios
- [ ] Implementar CRUD completo de Menú
- [ ] Agregar vista de Transacciones
- [ ] Implementar filtros avanzados
- [ ] Agregar exportación a Excel
- [ ] Implementar gráficos con Recharts
- [ ] Agregar tema dark/light toggle
- [ ] Implementar notificaciones en tiempo real
- [ ] Agregar subida de imágenes
- [ ] Implementar tests con Vitest
- [ ] Configurar CI/CD
- [ ] Deploy a producción

## Documentación de Referencia

- Next.js: https://nextjs.org/docs
- React Query: https://tanstack.com/query/latest
- Tailwind CSS: https://tailwindcss.com/docs
- shadcn/ui: https://ui.shadcn.com
- Zustand: https://github.com/pmndrs/zustand
- Lucide Icons: https://lucide.dev
