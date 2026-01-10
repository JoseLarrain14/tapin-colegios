# Tap In Colegios

Plataforma de gestion de cafeterias escolares para apoderados (padres) en Chile.

## Descripcion

Tap In Colegios permite a los apoderados cargar saldo digital o comprar paquetes de tickets para que sus hijos puedan retirar comida en el casino escolar. El sistema soporta multiples modelos de negocio configurables por colegio:

- **Solo Tickets**: Compra de packs de tickets (ej: 5 almuerzos)
- **Solo Saldo**: Saldo libre para comprar en el kiosko
- **Modelo Mixto**: Tickets para almuerzo + saldo para snacks

## Tech Stack

### Backend (packages/api)
- **Runtime**: Node.js 20 LTS
- **Framework**: Fastify
- **Language**: TypeScript
- **ORM**: Prisma
- **Validation**: Zod
- **Auth**: JWT + Refresh Tokens

### Mobile App (apps/mobile)
- **Framework**: React Native
- **Toolchain**: Expo SDK 52+
- **Navigation**: Expo Router (file-based)
- **State Management**: Zustand
- **Data Fetching**: React Query (TanStack Query)
- **UI Kit**: React Native Paper
- **Language**: TypeScript

### Database
- **Primary**: PostgreSQL (Supabase)
- **Cache**: Redis (Upstash) - opcional

## Estructura del Proyecto

```
tap-in-colegios/
├── apps/
│   └── mobile/              # React Native Expo app
│       ├── src/
│       │   ├── screens/     # Pantallas de la app
│       │   ├── components/  # Componentes reutilizables
│       │   ├── hooks/       # Custom hooks
│       │   ├── services/    # API services
│       │   ├── store/       # Zustand stores
│       │   ├── utils/       # Utilidades
│       │   ├── types/       # TypeScript types
│       │   ├── constants/   # Constantes
│       │   └── navigation/  # Config de navegacion
│       └── assets/          # Imagenes, fuentes, etc.
├── packages/
│   ├── api/                 # Fastify backend
│   │   ├── src/
│   │   │   ├── routes/      # Rutas de la API
│   │   │   ├── services/    # Logica de negocio
│   │   │   ├── middleware/  # Auth, validation, etc.
│   │   │   ├── utils/       # Utilidades
│   │   │   ├── types/       # TypeScript types
│   │   │   └── config/      # Configuracion
│   │   └── prisma/          # Schema y migraciones
│   └── shared/              # Codigo compartido
│       └── src/
│           ├── types/       # Types compartidos
│           ├── utils/       # Utilidades compartidas
│           └── constants/   # Constantes compartidas
├── init.sh                  # Script de setup
├── features.db              # Base de datos de features
└── app_spec.txt             # Especificacion del proyecto
```

## Inicio Rapido

### Prerequisitos

- Node.js 20 LTS o superior
- npm o pnpm (recomendado)
- Git
- PostgreSQL (local o Supabase)

### Instalacion

1. Clonar el repositorio:
```bash
git clone <repository-url>
cd tap-in-colegios
```

2. Ejecutar el script de inicializacion:
```bash
./init.sh
```

Este script:
- Verifica prerequisitos
- Instala dependencias
- Configura variables de entorno
- Genera cliente Prisma
- Inicia servidores de desarrollo

### Comandos Disponibles

```bash
# Iniciar todo (API + Mobile)
./init.sh

# Solo API
./init.sh api

# Solo Mobile
./init.sh mobile

# Solo setup (sin iniciar servicios)
./init.sh setup-only
```

### Acceso a Servicios

- **API Server**: http://localhost:3000
- **API Documentation**: http://localhost:3000/documentation
- **Expo DevTools**: Ver terminal para codigo QR

## Roles de Usuario

| Rol | Descripcion |
|-----|-------------|
| `super_admin` | Administrador global de la plataforma |
| `school_admin` | Administrador de un colegio especifico |
| `cafeteria_operator` | Operador del punto de venta |
| `guardian` | Apoderado/Padre de estudiantes |

## API Endpoints

### Autenticacion
- `POST /api/v1/auth/register` - Registro de apoderado
- `POST /api/v1/auth/login` - Iniciar sesion
- `POST /api/v1/auth/logout` - Cerrar sesion
- `POST /api/v1/auth/refresh` - Renovar token
- `POST /api/v1/auth/forgot-password` - Solicitar reset
- `POST /api/v1/auth/reset-password` - Resetear password
- `GET /api/v1/auth/me` - Usuario actual

### Estudiantes
- `POST /api/v1/students` - Agregar estudiante
- `GET /api/v1/students` - Listar mis estudiantes
- `GET /api/v1/students/:id` - Detalle
- `PUT /api/v1/students/:id` - Actualizar
- `DELETE /api/v1/students/:id` - Eliminar

### Billeteras
- `GET /api/v1/wallets/:studentId` - Saldo
- `GET /api/v1/wallets/:studentId/history` - Historial
- `GET /api/v1/wallets/:studentId/stats` - Estadisticas

### Pagos
- `GET /api/v1/payments/packages/:cafeteriaId` - Paquetes disponibles
- `POST /api/v1/payments/init` - Iniciar pago
- `GET /api/v1/payments` - Historial de pagos

### Menu y Pedidos
- `GET /api/v1/menu/:cafeteriaId` - Menu del casino
- `POST /api/v1/orders` - Crear pedido
- `GET /api/v1/orders` - Mis pedidos
- `PUT /api/v1/orders/:id/cancel` - Cancelar pedido

## Variables de Entorno

### Backend (packages/api/.env)
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"
PORT=3000
NODE_ENV="development"
```

### Mobile (apps/mobile/.env)
```env
EXPO_PUBLIC_API_URL="http://localhost:3000/api/v1"
EXPO_PUBLIC_ENV="development"
```

## Desarrollo

### Base de Datos

```bash
# Abrir Prisma Studio (UI de base de datos)
npx prisma studio

# Crear nueva migracion
npx prisma migrate dev --name migration_name

# Aplicar migraciones
npx prisma migrate deploy

# Generar cliente
npx prisma generate
```

### Testing

```bash
# Ejecutar tests
npm run test

# Tests con coverage
npm run test:coverage
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## Paleta de Colores

| Color | Hex | Uso |
|-------|-----|-----|
| Primary | `#FF4D6D` | Botones, acentos |
| Primary Light | `#FFE5EA` | Fondos claros |
| Background | `#FFFFFF` | Fondo principal |
| Text Primary | `#1A1A1A` | Texto principal |
| Text Secondary | `#666666` | Texto secundario |
| Success | `#4CAF50` | Exito |
| Warning | `#FFC107` | Advertencia |
| Error | `#F44336` | Error |

## Notas Importantes

- La app esta en **Espanol (Chile)**
- Montos en **CLP** (pesos chilenos) sin decimales
- El **RUT chileno** se valida con digito verificador
- Los **pagos son mock** inicialmente, pero la arquitectura esta lista para pasarelas reales (Webpay, Flow, Fintoc)
- La estructura para **cupones** esta preparada pero no implementada

## Licencia

Privado - Todos los derechos reservados
