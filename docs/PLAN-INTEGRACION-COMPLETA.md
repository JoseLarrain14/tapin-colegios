# Plan de Integración Completa - TapIn Colegios

## Objetivo
Conectar correctamente el frontend con el backend, eliminando datos mockeados y asegurando que las transacciones de la app móvil se reflejen en el sistema de casinos/cafeterías.

---

## Estado Actual del Proyecto

### Autenticación (YA IMPLEMENTADA)
- JWT + Refresh Tokens funcionando
- Roles: `guardian`, `school_admin`, `super_admin`, `cafeteria_operator`
- Middlewares de autorización en `packages/api/src/middleware/authorization.ts`
- AuthService en `packages/api/src/services/auth.service.ts`

### Base de Datos (YA IMPLEMENTADA)
- **School** → Colegio
- **Cafeteria** → Casino/Cafetería del colegio
- **Student** → Estudiante con Wallet
- **Guardian** → Apoderado (usuario de la app móvil)
- **Transaction** → Compras (con campo `source: 'app' | 'casino'`)
- **Order** → Pedidos desde la app móvil

### Panel Admin (PARCIALMENTE CONECTADO)
| Funcionalidad | Estado |
|---------------|--------|
| Login/Logout | Conectado |
| Dashboard Stats | **MOCKEADO** - Línea 19-49 de `page.tsx` |
| CRUD Colegios | Conectado |
| Lista Estudiantes | Conectado |
| Lista Transacciones | Conectado |
| CRUD Menú | Conectado |
| CRUD Paquetes | Conectado |

### App Móvil (MAYORMENTE CONECTADA)
| Funcionalidad | Estado |
|---------------|--------|
| Login/Registro | Conectado |
| Ver Estudiantes | Conectado |
| Ver Balance | Conectado |
| Crear Pedidos | Conectado |
| Historial | Conectado |
| Recargas | Conectado |

---

## TAREAS A IMPLEMENTAR

### TAREA 1: Endpoint de Estadísticas para Dashboard

**Archivo a crear:** `packages/api/src/routes/stats.routes.ts`

```typescript
// Estructura del endpoint
GET /api/v1/stats/dashboard

// Respuesta esperada:
{
  "success": true,
  "data": {
    "stats": {
      "activeSchools": { "value": 12, "change": "+2 este mes" },
      "totalUsers": { "value": 1234, "change": "+89 este mes" },
      "transactionsToday": { "value": 456, "change": "+23% vs ayer" },
      "revenueThisMonth": { "value": 2400000, "formatted": "$2.4M", "change": "+12%" }
    },
    "recentActivity": [
      { "id": "...", "description": "Juan Pérez - Cafetería Central", "amount": 2500, "type": "purchase", "createdAt": "..." }
    ]
  }
}
```

**Consultas necesarias:**
- `prisma.school.count({ where: { active: true } })`
- `prisma.guardian.count()`
- `prisma.transaction.count({ where: { createdAt: { gte: today } } })`
- `prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'completed', createdAt: { gte: monthStart } } })`

---

### TAREA 2: Endpoints para Operador de Casino

**Archivo a crear:** `packages/api/src/routes/casino.routes.ts`

#### Endpoint 2.1: Listar pedidos pendientes
```typescript
GET /api/v1/casino/pending-orders

// Retorna pedidos con status: pending, confirmed, preparing, ready
// Filtrados por fecha de hoy
```

#### Endpoint 2.2: Validar entrega de pedido
```typescript
POST /api/v1/casino/validate-order
Body: { "orderId": "uuid" }

// Acciones:
// 1. Order.status = 'delivered'
// 2. Crear Transaction con:
//    - source: 'app'
//    - validationMethod: 'app_order'
//    - validatedBy: userId del operador
```

#### Endpoint 2.3: Compra directa en casino
```typescript
POST /api/v1/casino/direct-purchase
Body: {
  "studentRut": "12345678-9",
  "cafeteriaId": "uuid",
  "items": [{ "name": "Completo", "price": 1500, "quantity": 1 }],
  "validationMethod": "rut_search" | "fingerprint" | "qr_code"
}

// Acciones:
// 1. Buscar estudiante por RUT
// 2. Verificar saldo suficiente
// 3. Descontar de Wallet
// 4. Crear WalletLog
// 5. Crear Transaction con:
//    - source: 'casino'
//    - validationMethod: (el especificado)
//    - validatedBy: userId del operador
```

#### Endpoint 2.4: Buscar estudiante por RUT
```typescript
GET /api/v1/casino/student/:rut

// Retorna info del estudiante:
// - nombre, foto, curso
// - balance de wallet
// - tickets disponibles
```

---

### TAREA 3: Registrar Nuevas Rutas

**Archivo a modificar:** `packages/api/src/index.ts`

Agregar después de línea 21:
```typescript
import { statsRoutes } from './routes/stats.routes.js';
import { casinoRoutes } from './routes/casino.routes.js';
```

Agregar en función `registerRoutes()` (después de línea 112):
```typescript
await app.register(statsRoutes, { prefix: '/api/v1/stats' });
await app.register(casinoRoutes, { prefix: '/api/v1/casino' });
```

---

### TAREA 4: Conectar Dashboard Admin a API Real

**Archivo a modificar:** `apps/admin/src/app/(dashboard)/page.tsx`

Cambiar de datos estáticos a llamada API:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await apiClient.stats.dashboard()
        setStats(response.data.data.stats)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  // Renderizar stats reales
}
```

**Archivo a modificar:** `apps/admin/src/lib/api.ts`

Agregar:
```typescript
stats: {
  dashboard: () => api.get('/stats/dashboard'),
},
```

---

### TAREA 5: Actualizar Seeds de Datos

**Archivo a modificar:** `packages/api/prisma/seed.ts`

Agregar usuarios de prueba:

```typescript
// Super Admin
const superAdmin = await prisma.user.upsert({
  where: { email: 'super@tapin.cl' },
  create: {
    email: 'super@tapin.cl',
    passwordHash: await bcrypt.hash('superadmin123', 10),
    role: 'super_admin',
    active: true,
    emailVerified: true,
  },
  update: {},
});

// Cafeteria Operator
const operator = await prisma.user.upsert({
  where: { email: 'casino@colegio.cl' },
  create: {
    email: 'casino@colegio.cl',
    passwordHash: await bcrypt.hash('casino123', 10),
    role: 'cafeteria_operator',
    active: true,
    emailVerified: true,
  },
  update: {},
});

// Guardian de prueba
const guardianUser = await prisma.user.upsert({
  where: { email: 'apoderado@test.cl' },
  create: {
    email: 'apoderado@test.cl',
    passwordHash: await bcrypt.hash('apoderado123', 10),
    role: 'guardian',
    active: true,
    emailVerified: true,
  },
  update: {},
});

const guardian = await prisma.guardian.upsert({
  where: { userId: guardianUser.id },
  create: {
    userId: guardianUser.id,
    firstName: 'Maria',
    lastName: 'Gonzalez',
    phone: '+56912345678',
    rut: '11111111-1',
    relationship: 'mother',
    preferredSchoolId: firstSchool.id,
  },
  update: {},
});

// Vincular guardian con estudiante existente
await prisma.guardianStudent.upsert({
  where: {
    guardianId_studentId: { guardianId: guardian.id, studentId: testStudent.id }
  },
  create: {
    guardianId: guardian.id,
    studentId: testStudent.id,
    isPrimary: true,
  },
  update: {},
});

// Transacciones de ejemplo
await prisma.transaction.createMany({
  data: [
    {
      walletId: wallet.id,
      cafeteriaId: cafeteria.id,
      type: 'purchase',
      amount: 2500,
      description: 'Pedido desde app móvil',
      items: JSON.stringify([{ name: 'Sandwich', price: 2500, quantity: 1 }]),
      validatedBy: operator.id,
      validationMethod: 'app_order',
      source: 'app',
    },
    {
      walletId: wallet.id,
      cafeteriaId: cafeteria.id,
      type: 'purchase',
      amount: 1500,
      description: 'Compra directa en casino',
      items: JSON.stringify([{ name: 'Completo', price: 1500, quantity: 1 }]),
      validatedBy: operator.id,
      validationMethod: 'rut_search',
      source: 'casino',
    },
  ],
});
```

---

## Credenciales de Prueba (después del seed)

| Rol | Email | Password | Uso |
|-----|-------|----------|-----|
| Super Admin | super@tapin.cl | superadmin123 | Panel admin - acceso total |
| School Admin | admin@colegio.cl | admin123 | Panel admin - un colegio |
| Casino Operator | casino@colegio.cl | casino123 | Validar pedidos en cafetería |
| Guardian | apoderado@test.cl | apoderado123 | App móvil |

---

## Diagrama de Flujo: Pedido App → Casino

```
┌──────────────────────────────────────────────────────────────────┐
│                     FLUJO COMPLETO                                │
└──────────────────────────────────────────────────────────────────┘

1. APODERADO (App Móvil)
   │
   ├── Selecciona items del menú
   ├── POST /api/v1/orders
   │   └── Order creado (status: 'pending')
   │   └── Wallet.balance descontado
   │   └── WalletLog creado
   │
   └── Estudiante recibe notificación de pedido listo

2. ESTUDIANTE va a la cafetería

3. OPERADOR DE CASINO
   │
   ├── GET /api/v1/casino/pending-orders
   │   └── Ve lista de pedidos del día
   │
   ├── Busca al estudiante por nombre/foto
   │
   └── POST /api/v1/casino/validate-order { orderId }
       └── Order.status = 'delivered'
       └── Transaction creada:
           - source: 'app'
           - validationMethod: 'app_order'
           - validatedBy: operadorId

4. APODERADO ve en historial
   └── Pedido marcado como "Entregado"
   └── Transaction visible con detalles
```

---

## Verificación Post-Implementación

### Test 1: Dashboard Admin
```bash
# 1. Ejecutar seeds
cd packages/api && pnpm run db:seed

# 2. Iniciar backend
pnpm run dev

# 3. Iniciar admin
cd apps/admin && pnpm run dev

# 4. Login en http://localhost:3000/login
# Email: admin@colegio.cl
# Password: admin123

# 5. Verificar que dashboard muestra números reales
```

### Test 2: Validar Pedido en Casino
```bash
# 1. Login como operador
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"casino@colegio.cl","password":"casino123"}'

# 2. Ver pedidos pendientes (usar token del paso 1)
curl -X GET http://localhost:3000/api/v1/casino/pending-orders \
  -H "Authorization: Bearer <TOKEN>"

# 3. Validar un pedido
curl -X POST http://localhost:3000/api/v1/casino/validate-order \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"<ORDER_ID>"}'
```

### Test 3: Compra Directa
```bash
curl -X POST http://localhost:3000/api/v1/casino/direct-purchase \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "studentRut": "12345678-9",
    "cafeteriaId": "<CAFETERIA_ID>",
    "items": [{"name":"Completo","price":1500,"quantity":1}],
    "validationMethod": "rut_search"
  }'
```

---

## Archivos Involucrados

### A Crear:
- `packages/api/src/routes/stats.routes.ts`
- `packages/api/src/routes/casino.routes.ts`

### A Modificar:
- `packages/api/src/index.ts` (registrar rutas)
- `packages/api/prisma/seed.ts` (usuarios de prueba)
- `apps/admin/src/app/(dashboard)/page.tsx` (conectar API)
- `apps/admin/src/lib/api.ts` (agregar endpoint stats)

---

## Escenario de Validación End-to-End

Este escenario prueba el flujo completo de integración entre el panel admin (casino), la app móvil (apoderado) y el backend, verificando que los datos fluyen correctamente en ambas direcciones.

### Objetivo de la Validación
Demostrar que:
1. Los productos creados en el casino aparecen disponibles para comprar en la app
2. Las recargas de saldo del apoderado se reflejan correctamente
3. Las compras realizadas generan transacciones visibles en el software del casino
4. Los estudiantes registrados desde la app aparecen en el sistema del casino

---

### PASO 1: Configurar Producto en el Casino

**Actor:** Administrador del Casino (Panel Admin)
**Credenciales:** `admin@colegio.cl` / `admin123`

| Acción | Resultado Esperado |
|--------|-------------------|
| 1. Login en panel admin | Acceso al dashboard |
| 2. Ir a sección "Menú" | Ver lista de productos actuales |
| 3. Crear nuevo producto: **"Empanada de Pino"** - $1.800 | Producto guardado en BD |
| 4. Verificar que aparece en la lista | Producto visible con precio correcto |

**Verificación en BD:**
```sql
SELECT * FROM menu_items WHERE name = 'Empanada de Pino';
-- Debe existir con price = 1800
```

---

### PASO 2: Apoderado Registra Estudiante

**Actor:** Apoderado (App Móvil)
**Credenciales:** `apoderado@test.cl` / `apoderado123`

| Acción | Resultado Esperado |
|--------|-------------------|
| 1. Login en app móvil | Acceso a pantalla principal |
| 2. Ir a "Agregar Estudiante" | Formulario de registro |
| 3. Ingresar datos: **Pedro González**, RUT: **33333333-3**, Curso: 3ro Básico A | Estudiante creado |
| 4. Seleccionar colegio del estudiante | Vinculación correcta |

**Verificación en Panel Admin (Casino):**
- Login como `admin@colegio.cl`
- Ir a sección "Estudiantes"
- **Resultado esperado:** Pedro González (33333333-3) aparece en la lista

---

### PASO 3: Apoderado Recarga Saldo

**Actor:** Apoderado (App Móvil)

| Acción | Resultado Esperado |
|--------|-------------------|
| 1. Seleccionar estudiante Pedro González | Ver balance actual: $0 |
| 2. Ir a "Recargar Saldo" | Ver paquetes de recarga disponibles |
| 3. Seleccionar paquete de $5.000 | Redirigir a pasarela de pago |
| 4. Completar pago (mock en desarrollo) | Pago procesado |
| 5. Volver a pantalla principal | Balance actualizado: $5.000 |

**Verificación en BD:**
```sql
SELECT balance FROM wallets
JOIN students ON wallets.student_id = students.id
WHERE students.rut = '33333333-3';
-- Debe mostrar balance = 5000
```

---

### PASO 4: Apoderado Realiza Compra del Producto

**Actor:** Apoderado (App Móvil)

| Acción | Resultado Esperado |
|--------|-------------------|
| 1. Ir a sección "Cafetería" o "Menú" | Ver productos disponibles |
| 2. Buscar "Empanada de Pino" ($1.800) | Producto visible (creado en Paso 1) |
| 3. Agregar al pedido para Pedro González | Item agregado |
| 4. Confirmar pedido | Pedido creado, saldo descontado |
| 5. Ver balance actualizado | Balance: $3.200 ($5.000 - $1.800) |

**Resultado:** Pedido creado con status `pending`, esperando retiro en cafetería.

---

### PASO 5: Transacción Visible en Software del Casino

**Actor:** Operador del Casino (Panel Admin)
**Credenciales:** `casino@colegio.cl` / `casino123` (o `admin@colegio.cl`)

| Acción | Resultado Esperado |
|--------|-------------------|
| 1. Login en panel admin | Acceso al sistema |
| 2. Ir a sección "Pedidos Pendientes" (o endpoint `/casino/pending-orders`) | Ver lista de pedidos del día |
| 3. Buscar pedido de Pedro González | Pedido visible con detalle: "Empanada de Pino" x1 = $1.800 |
| 4. Marcar pedido como "Entregado" | Status cambia a `delivered` |
| 5. Ir a sección "Transacciones" | Ver transacción registrada |

**Verificaciones en sección Transacciones:**
- **Estudiante:** Pedro González
- **Producto:** Empanada de Pino
- **Monto:** $1.800
- **Origen:** `app` (pedido desde aplicación móvil)
- **Método de validación:** `app_order`
- **Validado por:** ID del operador

---

### PASO 6: Verificación Cruzada Final

| Sistema | Qué verificar | Resultado esperado |
|---------|---------------|-------------------|
| **App Móvil** | Historial de Pedro González | Transacción "Empanada de Pino" - $1.800 visible |
| **App Móvil** | Balance de Pedro | $3.200 |
| **Panel Admin** | Lista de estudiantes | Pedro González (33333333-3) visible |
| **Panel Admin** | Lista de transacciones | Compra de Empanada de Pino por Pedro González |
| **Panel Admin** | Dashboard (estadísticas) | Contador de transacciones del día +1 |

---

### Diagrama del Flujo de Validación

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ESCENARIO DE VALIDACIÓN COMPLETO                         │
└─────────────────────────────────────────────────────────────────────────────┘

    PANEL ADMIN (CASINO)                         APP MÓVIL (APODERADO)
    ═══════════════════                          ═══════════════════════

    [1] Admin crea producto
        "Empanada de Pino" $1.800
              │
              ▼
        ┌─────────────┐
        │   BASE DE   │◄─────────────────────── [2] Apoderado registra
        │   DATOS     │                              estudiante "Pedro"
        └─────────────┘
              │                                        │
              │                                        ▼
              │                                  [3] Apoderado recarga
              │                                      $5.000 a Pedro
              │                                        │
              │                                        ▼
              │                                  [4] Apoderado compra
              │◄─────────────────────────────────    "Empanada de Pino"
              │         Pedido creado                  para Pedro
              │                                        │
              ▼                                        │
    [5] Casino ve pedido pendiente                    │
        de Pedro González                             │
              │                                        │
              ▼                                        │
    [6] Casino marca como                             │
        "Entregado"                                   │
              │                                        │
              ▼                                        ▼
    [7] Transacción visible ◄────────────────► [8] Historial actualizado
        en reporte del casino                      en app del apoderado

                              ✓ VALIDACIÓN EXITOSA
                     Los datos fluyen en ambas direcciones
```

---

### Criterios de Éxito

La integración se considera **EXITOSA** cuando:

| # | Criterio | Verificación |
|---|----------|--------------|
| 1 | Producto creado en casino aparece en app | Apoderado ve "Empanada de Pino" en menú |
| 2 | Estudiante registrado en app aparece en casino | Admin ve a Pedro González en lista |
| 3 | Recarga de saldo se refleja correctamente | Balance aumenta de $0 a $5.000 |
| 4 | Compra descuenta saldo correctamente | Balance baja de $5.000 a $3.200 |
| 5 | Pedido aparece en sistema del casino | Operador ve pedido pendiente |
| 6 | Transacción queda registrada | Visible en reportes con todos los datos |
| 7 | Historial del apoderado actualizado | Compra visible en app móvil |

---

### Script de Prueba Automatizada (Opcional)

```bash
#!/bin/bash
# test-e2e-integration.sh

API_URL="http://localhost:3000/api/v1"

echo "=== TEST E2E: Integración Casino-App ==="

# 1. Login como admin
echo "[1/7] Login admin..."
ADMIN_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@colegio.cl","password":"admin123"}' \
  | jq -r '.data.accessToken')

# 2. Crear producto
echo "[2/7] Creando producto 'Empanada de Pino'..."
curl -s -X POST "$API_URL/menu/<CAFETERIA_ID>" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Empanada de Pino","price":1800,"category":"Comida"}'

# 3. Login como apoderado
echo "[3/7] Login apoderado..."
GUARDIAN_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"apoderado@test.cl","password":"apoderado123"}' \
  | jq -r '.data.accessToken')

# 4. Verificar estudiantes del apoderado
echo "[4/7] Obteniendo estudiantes..."
curl -s -X GET "$API_URL/guardians/students" \
  -H "Authorization: Bearer $GUARDIAN_TOKEN" | jq '.data'

# 5. Verificar menú disponible
echo "[5/7] Verificando menú..."
curl -s -X GET "$API_URL/menu/<CAFETERIA_ID>" \
  -H "Authorization: Bearer $GUARDIAN_TOKEN" | jq '.data[] | select(.name=="Empanada de Pino")'

# 6. Login como operador de casino
echo "[6/7] Login operador casino..."
CASINO_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"casino@colegio.cl","password":"casino123"}' \
  | jq -r '.data.accessToken')

# 7. Verificar transacciones
echo "[7/7] Verificando transacciones..."
curl -s -X GET "$API_URL/transactions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data | length'

echo "=== TEST COMPLETADO ==="
```

---

## Notas Importantes

1. **El schema de BD ya está completo** - No se requieren migraciones
2. **La autenticación ya funciona** - Solo falta usarla en nuevos endpoints
3. **El campo `source` en Transaction** diferencia origen 'app' vs 'casino'
4. **El campo `validatedBy`** guarda quién procesó la transacción en el casino
