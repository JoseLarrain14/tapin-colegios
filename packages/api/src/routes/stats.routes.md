# Stats Routes Documentation

## Endpoint: GET /api/v1/stats/dashboard

### Description
Returns aggregated statistics for the dashboard. Data is automatically filtered based on the user's role:
- **super_admin**: sees all data across all schools
- **school_admin**: sees only data for their assigned school

### Authentication
Required. JWT token in Authorization header: `Bearer <token>`

### Roles Allowed
- `super_admin`
- `school_admin`

### Request
```http
GET /api/v1/stats/dashboard
Authorization: Bearer <jwt_token>
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "stats": {
      "activeSchools": {
        "value": 5,
        "change": "+20.0%"
      },
      "totalUsers": {
        "value": 150,
        "change": "+12.5%"
      },
      "transactionsToday": {
        "value": 45,
        "change": "+8.3%"
      },
      "revenueThisMonth": {
        "value": 2500000,
        "formatted": "$2.500.000",
        "change": "+15.2%"
      }
    },
    "recentActivity": [
      {
        "id": "uuid",
        "description": "purchase - Cafetería Principal",
        "amount": 2500,
        "type": "purchase",
        "student": "Juan Pérez",
        "cafeteria": "Cafetería Principal",
        "createdAt": "2026-01-18T10:30:00.000Z"
      }
    ]
  }
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Token de acceso requerido"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "message": "No tienes permisos para acceder a este recurso",
  "requiredRoles": ["super_admin", "school_admin"],
  "userRole": "guardian"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Error al obtener estadísticas del dashboard",
  "error": "Error message"
}
```

## Data Calculation Details

### 1. Active Schools
- **super_admin**: Total count of schools where `active = true`
- **school_admin**: Returns 1 if their school is active, 0 otherwise
- **Change**: Compares current count vs schools that existed before this month

### 2. Total Users
- **super_admin**: Total count of all guardians
- **school_admin**: Count of guardians that have at least one student in their school
- **Change**: Compares current count vs guardians created before this month

### 3. Transactions Today
- Count of transactions created today (since 00:00:00)
- **school_admin**: Filtered by students in their school
- **Change**: Compares today's count vs yesterday's count

### 4. Revenue This Month
- Sum of completed payments (`status = 'completed'`) from the 1st of current month
- **school_admin**: Only payments for students in their school
- **Change**: Compares this month vs last month
- **Formatted**: Chilean peso format with thousands separator

### 5. Recent Activity
- Last 10 transactions ordered by creation date (descending)
- **school_admin**: Only transactions for students in their school
- Includes:
  - Transaction details (id, description, amount, type)
  - Student name
  - Cafeteria name
  - Creation timestamp

## Example Usage

### Testing with curl

#### Super Admin
```bash
curl -X GET http://localhost:3000/api/v1/stats/dashboard \
  -H "Authorization: Bearer <super_admin_token>" \
  -H "Content-Type: application/json"
```

#### School Admin
```bash
curl -X GET http://localhost:3000/api/v1/stats/dashboard \
  -H "Authorization: Bearer <school_admin_token>" \
  -H "Content-Type: application/json"
```

### Testing with JavaScript/TypeScript

```typescript
const response = await fetch('http://localhost:3000/api/v1/stats/dashboard', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
console.log(data);
```

## Notes

- All monetary amounts are stored as integers (cents) in the database
- Percentage changes are calculated as: `((current - previous) / previous) * 100`
- If previous value is 0 and current > 0, change shows "+100%"
- Dates are handled in server timezone
- School admins automatically see filtered data based on their `schoolId` from the JWT token
