# Instrucciones de Instalación - Panel Admin

## 1. Instalar Dependencias

Desde la raíz del monorepo:

```bash
npm install
```

Esto instalará todas las dependencias del workspace incluyendo `apps/admin`.

## 2. Configurar Variables de Entorno

Crea el archivo `.env.local` en `apps/admin/`:

```bash
cd apps/admin
cp .env.example .env.local
```

Edita `.env.local` y ajusta la URL del API si es necesario:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## 3. Ejecutar en Modo Desarrollo

Desde la raíz del monorepo:

```bash
# Solo el panel admin
npm run dev:admin

# O junto con el API
npm run dev:api & npm run dev:admin
```

El panel admin estará disponible en: http://localhost:3000

## 4. Credenciales de Prueba

Usa las credenciales del seed del API (si ya corriste `npm run db:migrate` en `packages/api`):

- **Email**: admin@colegio.cl
- **Password**: admin123

O crea un usuario admin directamente en la base de datos.

## 5. Agregar Componentes shadcn/ui

Para agregar más componentes de shadcn/ui:

```bash
cd apps/admin

# Ejemplos de componentes útiles
npx shadcn-ui@latest add input
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add form
npx shadcn-ui@latest add select
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add separator
```

## 6. Build para Producción

```bash
# Desde la raíz
npm run build:admin

# O desde apps/admin
cd apps/admin
npm run build
```

## 7. Ejecutar en Producción

```bash
cd apps/admin
npm run start
```

## Estructura de Archivos Creados

```
apps/admin/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── providers.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── ui/
│   │       ├── button.tsx
│   │       └── card.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   └── utils.ts
│   ├── store/
│   │   └── authStore.ts
│   └── middleware.ts
├── public/
├── .env.example
├── .gitignore
├── components.json
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── tsconfig.json
```

## Troubleshooting

### Error: Cannot find module '@/...'

Asegúrate de que los path aliases estén configurados en `tsconfig.json`:

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

### Error: Token inválido

Limpia el localStorage y las cookies:

```javascript
// En la consola del navegador
localStorage.clear()
```

Luego vuelve a hacer login.

### Error de conexión al API

Verifica que el API esté corriendo en `http://localhost:3001` y que la variable de entorno `NEXT_PUBLIC_API_URL` esté correcta.

### Middleware redirige constantemente

El middleware usa cookies para validar la autenticación. Asegúrate de que el login esté guardando el token en la cookie:

```typescript
document.cookie = `tapin-auth-token=${token}; path=/; max-age=2592000; SameSite=Strict`
```

## Próximos Pasos

1. Implementar páginas CRUD para cada entidad (Colegios, Usuarios, Menú, etc.)
2. Agregar filtros y paginación
3. Implementar gráficos y analytics con Recharts
4. Agregar manejo de archivos (upload de imágenes)
5. Implementar notificaciones con toast
6. Agregar tema dark/light con next-themes
