# Quick Start - Panel Admin

**Panel de Administración Next.js configurado y listo para usar**

## Instalación Rápida (5 minutos)

### 1. Instalar Dependencias

```bash
# Desde la raíz del proyecto
npm install
```

Esto instalará todas las dependencias del monorepo incluyendo las del panel admin.

### 2. Configurar Variables de Entorno

```bash
cd apps/admin
cp .env.example .env.local
```

Editar `apps/admin/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### 3. Iniciar en Desarrollo

```bash
# Desde la raíz
npm run dev:admin
```

El panel estará disponible en: **http://localhost:3000**

### 4. Login

Ir a: **http://localhost:3000/login**

Usar credenciales del seed del API:
- **Email:** admin@colegio.cl
- **Password:** admin123

(O las credenciales que hayas configurado en tu base de datos)

## Estructura Creada

```
apps/admin/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/login/       # Página de login ✅
│   │   └── (dashboard)/        # Dashboard con sidebar ✅
│   ├── components/ui/          # Componentes shadcn/ui
│   ├── lib/
│   │   ├── api.ts             # Cliente API configurado ✅
│   │   └── queries.ts         # React Query hooks ✅
│   ├── store/
│   │   └── authStore.ts       # Zustand auth store ✅
│   └── middleware.ts          # Protección de rutas ✅
└── 30 archivos totales
```

## Características Implementadas

- [x] **Autenticación completa** - Login funcional con JWT
- [x] **Protección de rutas** - Middleware de Next.js
- [x] **Cliente API configurado** - Axios con interceptores
- [x] **React Query** - Hooks para todas las entidades
- [x] **Zustand store** - Estado global con persistencia
- [x] **Layouts responsivos** - Sidebar mobile + desktop
- [x] **Componentes UI** - shadcn/ui base (Button, Card)
- [x] **Ejemplo CRUD** - Página de colegios funcional

## Páginas Disponibles

### Autenticación
- `/login` - Página de login funcional

### Dashboard
- `/dashboard` - Home con stats
- `/schools` - CRUD de colegios (ejemplo completo)

### Por Implementar
- `/users` - Gestión de usuarios
- `/menu-items` - Gestión de menú
- `/transactions` - Historial de transacciones
- `/settings` - Configuración

## Stack Tecnológico

- **Next.js 14** - App Router
- **TypeScript** - Type safety
- **TailwindCSS** - Estilos
- **Zustand** - Estado global
- **React Query** - Server state
- **Axios** - HTTP client
- **shadcn/ui** - Componentes UI
- **Lucide React** - Icons

## Comandos Útiles

```bash
# Desarrollo
npm run dev:admin

# Build
npm run build:admin

# Linting
cd apps/admin && npm run lint

# Agregar componentes shadcn/ui
cd apps/admin
npx shadcn-ui@latest add [nombre]
```

## Próximos Pasos

1. **Probar el login** - Verificar que funciona con el API
2. **Explorar el código** - Revisar ejemplos en `apps/admin/src/`
3. **Leer la documentación**:
   - `apps/admin/README.md` - Documentación general
   - `apps/admin/INSTALLATION.md` - Guía detallada
   - `apps/admin/EXAMPLES.md` - Ejemplos de código
   - `apps/admin/CHECKLIST.md` - Verificación completa
4. **Implementar CRUDs** - Usar `schools/page.tsx` como referencia
5. **Agregar componentes** - Instalar más componentes shadcn/ui

## Documentación Completa

- **SETUP-ADMIN.md** (raíz) - Resumen técnico completo
- **apps/admin/README.md** - Documentación del proyecto
- **apps/admin/INSTALLATION.md** - Guía de instalación detallada
- **apps/admin/EXAMPLES.md** - Ejemplos y patrones de código
- **apps/admin/SUMMARY.md** - Resumen de lo implementado
- **apps/admin/CHECKLIST.md** - Checklist de verificación

## Soporte

Si encuentras problemas:
1. Revisa `apps/admin/INSTALLATION.md` sección Troubleshooting
2. Verifica que el API esté corriendo en `http://localhost:3001`
3. Limpia cache: `rm -rf .next node_modules && npm install`
4. Revisa los logs de consola del navegador

## Archivos Importantes

### Configuración
- `apps/admin/package.json` - Dependencias y scripts
- `apps/admin/next.config.js` - Config de Next.js
- `apps/admin/tailwind.config.js` - Config de Tailwind
- `apps/admin/tsconfig.json` - Config de TypeScript

### Auth y API
- `src/store/authStore.ts` - Store de autenticación
- `src/lib/api.ts` - Cliente API con interceptores
- `src/lib/queries.ts` - React Query hooks
- `src/middleware.ts` - Protección de rutas

### Ejemplos de Uso
- `src/app/(auth)/login/page.tsx` - Login funcional
- `src/app/(dashboard)/layout.tsx` - Layout con sidebar
- `src/app/(dashboard)/schools/page.tsx` - CRUD completo

## Tips

1. **Usa React Query** - No llames axios directamente
2. **Usa apiClient** - Endpoints ya configurados
3. **Usa cn()** - Para merge de clases Tailwind
4. **Revisa EXAMPLES.md** - Patrones de código comunes
5. **Instala componentes según necesidad** - shadcn/ui modular

---

**¡Proyecto configurado exitosamente!**

Para empezar: `npm install && npm run dev:admin`
