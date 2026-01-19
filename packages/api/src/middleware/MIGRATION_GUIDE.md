# Guía de Migración - Authorization Middleware

Esta guía muestra cómo migrar las rutas existentes que usan `verifyAuth` manual a los nuevos middlewares de autorización.

## Cambios Principales

### Antes (Patrón Antiguo)
```typescript
// Helper function duplicada en cada archivo de rutas
async function verifyAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send({
      success: false,
      message: 'Token de acceso requerido',
    });
    return null;
  }

  const token = authHeader.substring(7);
  const decoded = authService.verifyAccessToken(token);

  if (!decoded) {
    reply.status(401).send({
      success: false,
      message: 'Token invalido o expirado',
    });
    return null;
  }

  return decoded;
}

// Uso en cada ruta
app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
  const decoded = await verifyAuth(request, reply);
  if (!decoded) return;

  // ... resto del handler
});
```

### Después (Patrón Nuevo)
```typescript
import { authenticate, requireGuardian } from '../middleware/authorization.js';

app.get('/', {
  preHandler: [authenticate, requireGuardian]
}, async (request: FastifyRequest, reply: FastifyReply) => {
  // request.user está disponible automáticamente
  // request.guardian está disponible gracias a requireGuardian
  const guardian = (request as any).guardian;

  // ... resto del handler
});
```

## Ejemplos de Migración

### Ejemplo 1: Rutas de Guardians

**Antes:**
```typescript
export async function guardiansRoutes(app: FastifyInstance) {
  app.get('/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const guardian = await prisma.guardian.findUnique({
        where: { userId: decoded.userId },
        include: { preferredSchool: true }
      });

      if (!guardian) {
        return reply.status(404).send({
          success: false,
          message: 'Perfil de apoderado no encontrado',
        });
      }

      return reply.send({
        success: true,
        data: guardian,
      });
    } catch (error) {
      // error handling
    }
  });
}
```

**Después:**
```typescript
import { authenticate, requireGuardian } from '../middleware/authorization.js';

export async function guardiansRoutes(app: FastifyInstance) {
  app.get('/profile', {
    preHandler: [authenticate, requireGuardian]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // El guardian ya está validado y adjunto al request
      const guardian = (request as any).guardian;

      const fullGuardian = await prisma.guardian.findUnique({
        where: { id: guardian.id },
        include: { preferredSchool: true }
      });

      return reply.send({
        success: true,
        data: fullGuardian,
      });
    } catch (error) {
      // error handling
    }
  });
}
```

### Ejemplo 2: Rutas de Students con Verificación de Acceso

**Antes:**
```typescript
app.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  try {
    const decoded = await verifyAuth(request, reply);
    if (!decoded) return;

    const { id } = request.params;

    const guardian = await getGuardian(decoded.userId);
    if (!guardian) {
      return reply.status(404).send({
        success: false,
        message: 'Perfil de apoderado no encontrado',
      });
    }

    // Verify guardian has access to this student
    const guardianStudent = await prisma.guardianStudent.findUnique({
      where: {
        guardianId_studentId: {
          guardianId: guardian.id,
          studentId: id,
        },
      },
      include: { student: true }
    });

    if (!guardianStudent) {
      return reply.status(404).send({
        success: false,
        message: 'Estudiante no encontrado',
      });
    }

    return reply.send({
      success: true,
      data: guardianStudent.student,
    });
  } catch (error) {
    // error handling
  }
});
```

**Después:**
```typescript
import { authenticate, requireGuardianStudentAccess } from '../middleware/authorization.js';

app.get('/:id', {
  preHandler: [authenticate, requireGuardianStudentAccess]
}, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  try {
    const { id } = request.params;
    // El acceso ya fue verificado por el middleware
    // Guardian está adjunto al request

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        school: true,
        wallet: true,
        tickets: true
      }
    });

    return reply.send({
      success: true,
      data: student,
    });
  } catch (error) {
    // error handling
  }
});
```

### Ejemplo 3: Rutas para School Admins

**Nueva ruta para administradores de colegio:**
```typescript
import { authenticate, requireRole, requireSchoolAccess } from '../middleware/authorization.js';

export async function schoolAdminRoutes(app: FastifyInstance) {
  // Solo super_admin y school_admin pueden acceder
  app.get('/schools/:schoolId/students', {
    preHandler: [
      authenticate,
      requireRole('super_admin', 'school_admin'),
      requireSchoolAccess
    ]
  }, async (request: FastifyRequest<{ Params: { schoolId: string } }>, reply: FastifyReply) => {
    const { schoolId } = request.params;

    // school_admin solo puede ver estudiantes de su colegio
    // super_admin puede ver estudiantes de cualquier colegio
    const students = await prisma.student.findMany({
      where: { schoolId },
      include: { wallet: true }
    });

    return {
      success: true,
      data: students,
    };
  });

  // Solo super_admin puede crear colegios
  app.post('/schools', {
    preHandler: [
      authenticate,
      requireRole('super_admin')
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // Solo super_admin llega aquí
    const body = request.body as any;

    const school = await prisma.school.create({
      data: body
    });

    return reply.status(201).send({
      success: true,
      data: school,
    });
  });
}
```

### Ejemplo 4: Múltiples Niveles de Autorización

```typescript
import { authenticate, requireRole, requireSchoolAccess } from '../middleware/authorization.js';

// Ruta que requiere autenticación + rol específico + acceso al colegio
app.put('/schools/:schoolId/config', {
  preHandler: [
    authenticate,                                    // 1. Verificar token
    requireRole('super_admin', 'school_admin'),     // 2. Verificar rol
    requireSchoolAccess                              // 3. Verificar acceso al colegio
  ]
}, async (request, reply) => {
  const { schoolId } = request.params;
  const config = request.body;

  // En este punto:
  // - Usuario está autenticado
  // - Usuario es super_admin O school_admin
  // - Si es school_admin, solo puede modificar su propio colegio

  const school = await prisma.school.update({
    where: { id: schoolId },
    data: { config: JSON.stringify(config) }
  });

  return { success: true, data: school };
});
```

## Beneficios del Nuevo Enfoque

1. **Código más limpio**: No más funciones `verifyAuth` duplicadas
2. **Reutilizable**: Los middlewares se pueden combinar fácilmente
3. **Declarativo**: La configuración de seguridad está en la definición de la ruta
4. **Type-safe**: TypeScript conoce el tipo de `request.user`
5. **Mantenible**: Cambios en la lógica de autorización se hacen en un solo lugar
6. **Escalable**: Fácil agregar nuevos middlewares de autorización

## Checklist de Migración

- [ ] Importar middlewares necesarios de `../middleware/authorization.js`
- [ ] Remover función local `verifyAuth` de archivos de rutas
- [ ] Remover función local `getGuardian` (si usa `requireGuardian`)
- [ ] Reemplazar `const decoded = await verifyAuth(...)` con hooks de preHandler
- [ ] Actualizar handlers para usar `request.user` en lugar de `decoded`
- [ ] Actualizar handlers para usar `request.guardian` si aplica
- [ ] Verificar que los errores de autorización estén manejados correctamente
- [ ] Probar rutas con diferentes roles de usuario

## Notas Importantes

1. **Orden de los hooks importa**: Siempre ejecutar `authenticate` primero
2. **Manejo de errores**: Los middlewares envían respuestas de error automáticamente
3. **Type assertions**: Usar `(request as any).guardian` hasta que se mejoren los tipos
4. **Compatibilidad**: Los middlewares son compatibles con el patrón existente de respuestas
