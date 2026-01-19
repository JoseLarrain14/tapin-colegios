# Casino/Cafeteria Endpoints Documentation

## Overview
Endpoints para operadores de cafetería (casino) que permiten gestionar pedidos y procesar compras directas en el punto de venta.

**Base URL:** `/api/v1/casino`

**Roles autorizados:**
- `cafeteria_operator`
- `school_admin`

---

## Endpoints

### 1. GET /pending-orders

Obtiene todos los pedidos pendientes de entrega.

**Autenticación:** Bearer Token requerido

**Roles:** `cafeteria_operator`, `school_admin`

**Filtros aplicados:**
- Status: `pending`, `confirmed`, `preparing`, `ready`
- Fecha de recogida >= hoy
- Ordenado por fecha de recogida (ascendente)

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid",
        "status": "pending",
        "pickupDate": "2026-01-18T00:00:00.000Z",
        "pickupTime": "12:00",
        "total": 3500,
        "items": [
          {
            "name": "Hamburguesa",
            "price": 2500,
            "quantity": 1
          }
        ],
        "ticketsUsed": null,
        "comments": "Sin cebolla",
        "student": {
          "id": "uuid",
          "firstName": "Juan",
          "lastName": "Pérez",
          "rut": "12345678-9",
          "photoUrl": "https://example.com/photo.jpg"
        },
        "cafeteria": {
          "id": "uuid",
          "name": "Cafetería Central",
          "schoolId": "uuid"
        },
        "createdAt": "2026-01-17T10:00:00.000Z"
      }
    ],
    "totalOrders": 15
  }
}
```

---

### 2. POST /validate-order

Valida y marca un pedido como entregado, creando la transacción correspondiente.

**Autenticación:** Bearer Token requerido

**Roles:** `cafeteria_operator`, `school_admin`

**Body:**
```json
{
  "orderId": "uuid-del-pedido"
}
```

**Validaciones:**
- El pedido debe existir
- No puede estar ya entregado (`delivered`)
- No puede estar cancelado (`cancelled`)

**Acciones ejecutadas (transacción atómica):**
1. Actualiza `Order.status = 'delivered'`
2. Crea `Transaction` con:
   - `source: 'app'`
   - `validationMethod: 'app_order'`
   - `validatedBy: userId` del operador
   - `type: 'purchase'`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Pedido validado y entregado exitosamente",
  "data": {
    "order": {
      "id": "uuid",
      "status": "delivered",
      "total": 3500,
      "updatedAt": "2026-01-18T14:30:00.000Z"
    },
    "transaction": {
      "id": "uuid",
      "type": "purchase",
      "amount": 3500,
      "source": "app",
      "validationMethod": "app_order",
      "createdAt": "2026-01-18T14:30:00.000Z"
    }
  }
}
```

**Errores:**
- `404`: Pedido no encontrado
- `400`: Pedido ya entregado o cancelado

---

### 3. POST /direct-purchase

Procesa una compra directa en el punto de venta (sin pedido previo).

**Autenticación:** Bearer Token requerido

**Roles:** `cafeteria_operator`, `school_admin`

**Body:**
```json
{
  "studentRut": "12345678-9",
  "cafeteriaId": "uuid",
  "items": [
    {
      "name": "Empanada de queso",
      "price": 1200,
      "quantity": 2
    },
    {
      "name": "Jugo natural",
      "price": 800,
      "quantity": 1
    }
  ],
  "validationMethod": "fingerprint" // fingerprint | rut_search | qr_code
}
```

**Validaciones:**
- Estudiante existe y está activo
- RUT se normaliza (sin puntos ni guiones)
- Cafetería existe y pertenece al colegio del estudiante
- Monto total > 0
- Saldo suficiente en la billetera

**Acciones ejecutadas (transacción atómica):**
1. Busca estudiante por RUT normalizado
2. Verifica saldo suficiente
3. Descuenta de `Wallet.balance`
4. Crea `WalletLog` (type: `purchase`)
5. Crea `Transaction` con:
   - `source: 'casino'`
   - `validationMethod`: según método usado
   - `validatedBy`: userId del operador

**Respuesta exitosa (201):**
```json
{
  "success": true,
  "message": "Compra de $3.200 procesada exitosamente",
  "data": {
    "transaction": {
      "id": "uuid",
      "type": "purchase",
      "amount": 3200,
      "items": [
        {
          "name": "Empanada de queso",
          "price": 1200,
          "quantity": 2
        },
        {
          "name": "Jugo natural",
          "price": 800,
          "quantity": 1
        }
      ],
      "source": "casino",
      "validationMethod": "fingerprint",
      "createdAt": "2026-01-18T14:45:00.000Z"
    },
    "wallet": {
      "id": "uuid",
      "previousBalance": 10000,
      "newBalance": 6800,
      "amountDeducted": 3200
    },
    "student": {
      "id": "uuid",
      "firstName": "María",
      "lastName": "González",
      "rut": "98765432-1"
    }
  }
}
```

**Errores:**
- `404`: Estudiante no encontrado
- `404`: Cafetería no encontrada
- `400`: Saldo insuficiente (incluye detalle de déficit)
- `400`: Cafetería no pertenece al colegio del estudiante

---

### 4. GET /student/:rut

Busca información del estudiante por RUT.

**Autenticación:** Bearer Token requerido

**Roles:** `cafeteria_operator`, `school_admin`

**Parámetros:**
- `rut` (path): RUT del estudiante (acepta formato con o sin puntos/guión)

**Normalización:**
El RUT se normaliza automáticamente removiendo `.` y `-`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "Pedro",
    "lastName": "Ramírez",
    "rut": "15678943-2",
    "grade": "8°",
    "section": "A",
    "photoUrl": "https://example.com/photo.jpg",
    "school": {
      "id": "uuid",
      "name": "Colegio San José",
      "code": "CSJ001"
    },
    "balance": 8500,
    "tickets": [
      {
        "ticketType": "almuerzo",
        "quantity": 5,
        "expiresAt": "2026-02-01T00:00:00.000Z"
      }
    ],
    "totalTickets": 5
  }
}
```

**Errores:**
- `404`: Estudiante no encontrado o inactivo

---

## Flujos de Uso

### Flujo 1: Validar pedido pre-ordenado
1. Operador escanea QR del estudiante o busca por RUT
2. GET `/student/:rut` para verificar identidad
3. GET `/pending-orders` para ver pedidos del día
4. POST `/validate-order` con el orderId correspondiente
5. Sistema actualiza orden y crea transacción automáticamente

### Flujo 2: Compra directa (sin pedido previo)
1. Operador identifica estudiante (huella digital, RUT, o QR)
2. GET `/student/:rut` para verificar saldo
3. Operador registra items comprados
4. POST `/direct-purchase` con items y método de validación
5. Sistema descuenta de billetera y registra transacción

---

## Métodos de Validación

| Método | Descripción | Uso típico |
|--------|-------------|------------|
| `fingerprint` | Huella digital biométrica | Terminal con lector de huellas |
| `rut_search` | Búsqueda manual por RUT | Punto de venta básico |
| `qr_code` | Código QR del estudiante | App móvil del estudiante |
| `app_order` | Pedido desde la app | Validación automática de orden |

---

## Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400 | Datos inválidos o saldo insuficiente |
| 401 | Token faltante o expirado |
| 403 | Usuario sin permisos para el rol |
| 404 | Recurso no encontrado (pedido, estudiante, cafetería) |
| 500 | Error interno del servidor |

---

## Notas Técnicas

### Transacciones atómicas
Todos los endpoints que modifican datos utilizan transacciones Prisma para garantizar consistencia:
- Si falla cualquier operación, se hace rollback completo
- No quedan estados inconsistentes entre Wallet, WalletLog y Transaction

### Normalización de RUT
El sistema normaliza automáticamente los RUTs:
```
"12.345.678-9" → "12345678-9"
"12345678-9"   → "12345678-9"
```

### Source vs ValidationMethod
- `source`: Origen de la transacción (`app` o `casino`)
- `validationMethod`: Método usado para validar identidad del estudiante

### Wallets automáticas
Si un estudiante no tiene Wallet al momento de validar un pedido o compra, se crea automáticamente con balance 0.
