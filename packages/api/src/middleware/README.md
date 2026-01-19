# Authorization Middleware

Este directorio contiene los middlewares de autenticación y autorización para el backend de Fastify.

## Middlewares Disponibles

### 1. `authenticate`

Hook de autenticación básico que verifica el JWT token y adjunta la información del usuario al request.

**Uso:**
```typescript
import { authenticate } from '../middleware/authorization.js';

app.get('/protected', { preHandler: authenticate }, async (request, reply) => {
  // request.user contiene: { userId, role, schoolId? }
  const userId = request.user!.userId;
  return { message: 'Authenticated!' };
});
```

### 2. `requireRole(...allowedRoles)`

Hook de autorización basado en roles. Verifica que el usuario autenticado tenga uno de los roles permitidos.

**Roles disponibles:**
- `super_admin` - Acceso total al sistema
- `school_admin` - Administrador de un colegio específico
- `cafeteria_operator` - Operador de cafetería
- `guardian` - Apoderado/tutor

**Uso:**
```typescript
import { authenticate, requireRole } from '../middleware/authorization.js';

// Solo super_admin puede acceder
app.get('/admin/users', {
  preHandler: [authenticate, requireRole('super_admin')]
}, async (request, reply) => {
  // Handler
});

// super_admin y school_admin pueden acceder
app.get('/schools/:id', {
  preHandler: [authenticate, requireRole('super_admin', 'school_admin')]
}, async (request, reply) => {
  // Handler
});
```

### 3. `requireSchoolAccess`

Hook que verifica que un school_admin solo pueda acceder a datos de su propio colegio.

- Para `super_admin`: permite acceso a todos los colegios
- Para `school_admin`: solo permite acceso a su colegio asignado
- Para otros roles: no realiza verificación

**Ubicación del schoolId:** El hook busca el schoolId en:
- `request.params.schoolId`
- `request.query.schoolId`
- `request.body.schoolId`

**Uso:**
```typescript
import { authenticate, requireSchoolAccess } from '../middleware/authorization.js';

// Protege rutas de colegios
app.get('/schools/:schoolId/students', {
  preHandler: [authenticate, requireSchoolAccess]
}, async (request, reply) => {
  // school_admin solo verá estudiantes de su colegio
  // super_admin puede ver estudiantes de cualquier colegio
});
```

### 4. `requireGuardian`

Hook que verifica que el usuario sea un apoderado y adjunta el registro de guardian al request.

**Uso:**
```typescript
import { authenticate, requireGuardian } from '../middleware/authorization.js';

app.get('/guardians/profile', {
  preHandler: [authenticate, requireGuardian]
}, async (request, reply) => {
  // request.guardian contiene el registro completo del guardian
  const guardian = (request as any).guardian;
  return { guardian };
});
```

### 5. `requireGuardianStudentAccess`

Hook que verifica que el apoderado tenga acceso al estudiante solicitado.

**Ubicación del studentId:** El hook busca el studentId en:
- `request.params.studentId`
- `request.params.id`

**Uso:**
```typescript
import { authenticate, requireGuardianStudentAccess } from '../middleware/authorization.js';

app.get('/students/:id', {
  preHandler: [authenticate, requireGuardianStudentAccess]
}, async (request, reply) => {
  // Solo apoderados vinculados al estudiante pueden acceder
  // request.guardian está disponible para usar en el handler
});
```

## Ejemplos Completos

### Ruta protegida para super_admin

```typescript
export async function adminRoutes(app: FastifyInstance) {
  app.get('/users', {
    preHandler: [authenticate, requireRole('super_admin')]
  }, async (request, reply) => {
    const users = await prisma.user.findMany();
    return { success: true, data: users };
  });
}
```

### Ruta protegida para school_admin con verificación de colegio

```typescript
export async function schoolRoutes(app: FastifyInstance) {
  app.get('/:schoolId/students', {
    preHandler: [
      authenticate,
      requireRole('super_admin', 'school_admin'),
      requireSchoolAccess
    ]
  }, async (request, reply) => {
    const { schoolId } = request.params;
    const students = await prisma.student.findMany({
      where: { schoolId }
    });
    return { success: true, data: students };
  });
}
```

### Ruta protegida para guardians

```typescript
export async function studentRoutes(app: FastifyInstance) {
  app.get('/:id', {
    preHandler: [authenticate, requireGuardianStudentAccess]
  }, async (request, reply) => {
    const { id } = request.params;
    const guardian = (request as any).guardian;

    const student = await prisma.student.findUnique({
      where: { id },
      include: { wallet: true }
    });

    return { success: true, data: student };
  });
}
```

## Respuestas de Error

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Token de acceso requerido"
}
```

```json
{
  "success": false,
  "message": "Token invalido o expirado"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "No tienes permisos para acceder a este recurso",
  "requiredRoles": ["super_admin"],
  "userRole": "guardian"
}
```

```json
{
  "success": false,
  "message": "No tienes permisos para acceder a datos de este colegio"
}
```

## JWT Payload

El JWT generado por `auth.service.ts` contiene:

```typescript
{
  sub: string;        // userId
  role: string;       // user role
  schoolId?: string;  // only for school_admin users
  iat: number;        // issued at timestamp
  exp: number;        // expiration timestamp
}
```

## TypeScript Types

El middleware extiende el tipo `FastifyRequest` para incluir información del usuario:

```typescript
interface FastifyRequest {
  user?: {
    userId: string;
    role: string;
    schoolId?: string;
  };
}
```

Esta extensión está definida en `src/types/fastify.d.ts`.
