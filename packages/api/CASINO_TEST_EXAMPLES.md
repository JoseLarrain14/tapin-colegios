# Casino Endpoints - Ejemplos de Prueba

## Configuración Inicial

```bash
# Variables de entorno
API_URL=http://localhost:3000
AUTH_TOKEN=your-jwt-token-here
```

---

## 1. Obtener Token de Autenticación

Primero necesitas autenticarte como operador de cafetería o administrador escolar:

```bash
# Login como operador de cafetería
curl -X POST $API_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operador@cafeteria.com",
    "password": "password123"
  }'

# Respuesta
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "...",
    "user": {
      "id": "uuid",
      "email": "operador@cafeteria.com",
      "role": "cafeteria_operator"
    }
  }
}
```

Guarda el `accessToken` para usar en las siguientes peticiones.

---

## 2. Buscar Estudiante por RUT

```bash
# GET /api/v1/casino/student/:rut
curl -X GET $API_URL/api/v1/casino/student/12345678-9 \
  -H "Authorization: Bearer $AUTH_TOKEN"

# También funciona sin formato
curl -X GET $API_URL/api/v1/casino/student/123456789 \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "id": "student-uuid",
    "firstName": "Juan",
    "lastName": "Pérez",
    "rut": "12345678-9",
    "grade": "8°",
    "section": "A",
    "photoUrl": null,
    "school": {
      "id": "school-uuid",
      "name": "Colegio San José",
      "code": "CSJ001"
    },
    "balance": 10000,
    "tickets": [],
    "totalTickets": 0
  }
}
```

---

## 3. Ver Pedidos Pendientes

```bash
# GET /api/v1/casino/pending-orders
curl -X GET $API_URL/api/v1/casino/pending-orders \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order-uuid",
        "status": "pending",
        "pickupDate": "2026-01-18T00:00:00.000Z",
        "pickupTime": "12:00",
        "total": 3500,
        "items": [
          {
            "menuItemId": "item-uuid",
            "name": "Hamburguesa",
            "price": 2500,
            "quantity": 1
          },
          {
            "menuItemId": "item-uuid-2",
            "name": "Papas fritas",
            "price": 1000,
            "quantity": 1
          }
        ],
        "ticketsUsed": null,
        "comments": "Sin cebolla",
        "student": {
          "id": "student-uuid",
          "firstName": "María",
          "lastName": "González",
          "rut": "98765432-1",
          "photoUrl": null
        },
        "cafeteria": {
          "id": "cafeteria-uuid",
          "name": "Cafetería Central",
          "schoolId": "school-uuid"
        },
        "createdAt": "2026-01-17T10:30:00.000Z"
      }
    ],
    "totalOrders": 1
  }
}
```

---

## 4. Validar Pedido (App Order)

```bash
# POST /api/v1/casino/validate-order
curl -X POST $API_URL/api/v1/casino/validate-order \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-uuid-from-previous-request"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Pedido validado y entregado exitosamente",
  "data": {
    "order": {
      "id": "order-uuid",
      "status": "delivered",
      "total": 3500,
      "updatedAt": "2026-01-18T14:30:00.000Z"
    },
    "transaction": {
      "id": "transaction-uuid",
      "type": "purchase",
      "amount": 3500,
      "source": "app",
      "validationMethod": "app_order",
      "createdAt": "2026-01-18T14:30:00.000Z"
    }
  }
}
```

---

## 5. Compra Directa - Método Huella Digital

```bash
# POST /api/v1/casino/direct-purchase
curl -X POST $API_URL/api/v1/casino/direct-purchase \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentRut": "12345678-9",
    "cafeteriaId": "cafeteria-uuid",
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
    "validationMethod": "fingerprint"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Compra de $3.200 procesada exitosamente",
  "data": {
    "transaction": {
      "id": "transaction-uuid",
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
      "id": "wallet-uuid",
      "previousBalance": 10000,
      "newBalance": 6800,
      "amountDeducted": 3200
    },
    "student": {
      "id": "student-uuid",
      "firstName": "Juan",
      "lastName": "Pérez",
      "rut": "12345678-9"
    }
  }
}
```

---

## 6. Compra Directa - Método Búsqueda por RUT

```bash
# POST /api/v1/casino/direct-purchase
curl -X POST $API_URL/api/v1/casino/direct-purchase \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentRut": "98.765.432-1",
    "cafeteriaId": "cafeteria-uuid",
    "items": [
      {
        "name": "Sándwich completo",
        "price": 2500,
        "quantity": 1
      }
    ],
    "validationMethod": "rut_search"
  }'
```

---

## 7. Compra Directa - Método QR Code

```bash
# POST /api/v1/casino/direct-purchase
curl -X POST $API_URL/api/v1/casino/direct-purchase \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentRut": "11223344-5",
    "cafeteriaId": "cafeteria-uuid",
    "items": [
      {
        "name": "Ensalada de frutas",
        "price": 1500,
        "quantity": 1
      },
      {
        "name": "Agua mineral",
        "price": 500,
        "quantity": 1
      }
    ],
    "validationMethod": "qr_code"
  }'
```

---

## Casos de Error

### Error: Saldo insuficiente

```bash
curl -X POST $API_URL/api/v1/casino/direct-purchase \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentRut": "12345678-9",
    "cafeteriaId": "cafeteria-uuid",
    "items": [
      {
        "name": "Almuerzo completo",
        "price": 50000,
        "quantity": 1
      }
    ],
    "validationMethod": "fingerprint"
  }'
```

**Respuesta:**
```json
{
  "success": false,
  "message": "Saldo insuficiente",
  "data": {
    "requiredAmount": 50000,
    "currentBalance": 6800,
    "deficit": 43200
  }
}
```

---

### Error: Estudiante no encontrado

```bash
curl -X GET $API_URL/api/v1/casino/student/99999999-9 \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Respuesta:**
```json
{
  "success": false,
  "message": "Estudiante no encontrado"
}
```

---

### Error: Pedido ya entregado

```bash
curl -X POST $API_URL/api/v1/casino/validate-order \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "already-delivered-order-uuid"
  }'
```

**Respuesta:**
```json
{
  "success": false,
  "message": "Este pedido ya fue entregado"
}
```

---

### Error: Token inválido o expirado

```bash
curl -X GET $API_URL/api/v1/casino/pending-orders \
  -H "Authorization: Bearer invalid-token"
```

**Respuesta:**
```json
{
  "success": false,
  "message": "Token invalido o expirado"
}
```

---

### Error: Permisos insuficientes

```bash
# Intentar acceder con un token de guardian
curl -X GET $API_URL/api/v1/casino/pending-orders \
  -H "Authorization: Bearer guardian-token"
```

**Respuesta:**
```json
{
  "success": false,
  "message": "No tienes permisos para acceder a este recurso",
  "requiredRoles": ["cafeteria_operator", "school_admin"],
  "userRole": "guardian"
}
```

---

## Script de Prueba Completo

```bash
#!/bin/bash

API_URL="http://localhost:3000"

# 1. Login
echo "=== LOGIN ==="
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operador@cafeteria.com",
    "password": "password123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')
echo "Token obtenido: ${TOKEN:0:20}..."

# 2. Buscar estudiante
echo -e "\n=== BUSCAR ESTUDIANTE ==="
curl -s -X GET $API_URL/api/v1/casino/student/12345678-9 \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. Ver pedidos pendientes
echo -e "\n=== PEDIDOS PENDIENTES ==="
curl -s -X GET $API_URL/api/v1/casino/pending-orders \
  -H "Authorization: Bearer $TOKEN" | jq

# 4. Compra directa
echo -e "\n=== COMPRA DIRECTA ==="
curl -s -X POST $API_URL/api/v1/casino/direct-purchase \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentRut": "12345678-9",
    "cafeteriaId": "cafeteria-uuid",
    "items": [
      {
        "name": "Empanada",
        "price": 1200,
        "quantity": 1
      }
    ],
    "validationMethod": "fingerprint"
  }' | jq

echo -e "\n=== PRUEBAS COMPLETADAS ==="
```

---

## Verificación en Base de Datos

Después de ejecutar las pruebas, puedes verificar los datos en SQLite:

```sql
-- Ver transacciones recientes
SELECT
  t.id,
  t.type,
  t.amount,
  t.source,
  t.validationMethod,
  s.firstName || ' ' || s.lastName as student,
  t.createdAt
FROM transactions t
JOIN wallets w ON t.walletId = w.id
JOIN students s ON w.studentId = s.id
ORDER BY t.createdAt DESC
LIMIT 10;

-- Ver logs de billetera
SELECT
  wl.type,
  wl.amount,
  wl.balanceBefore,
  wl.balanceAfter,
  wl.description,
  s.firstName || ' ' || s.lastName as student,
  wl.createdAt
FROM wallet_logs wl
JOIN wallets w ON wl.walletId = w.id
JOIN students s ON w.studentId = s.id
ORDER BY wl.createdAt DESC
LIMIT 10;

-- Ver pedidos entregados hoy
SELECT
  o.id,
  o.status,
  o.total,
  s.firstName || ' ' || s.lastName as student,
  o.updatedAt
FROM orders o
JOIN students s ON o.studentId = s.id
WHERE o.status = 'delivered'
  AND DATE(o.updatedAt) = DATE('now')
ORDER BY o.updatedAt DESC;
```
