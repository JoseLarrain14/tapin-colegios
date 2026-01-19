# Implementación de Middleware de Autorización - Resumen

## Archivos Creados

### 1. `packages/api/src/middleware/authorization.ts`
Middleware principal con 5 hooks de autorización:
- **authenticate**: Verifica JWT y adjunta usuario al request
- **requireRole(...roles)**: Verifica que el usuario tenga uno de los roles permitidos
- **requireSchoolAccess**: Verifica que school_admin solo acceda a su colegio
- **requireGuardian**: Verifica que el usuario sea guardian y lo adjunta al request
- **requireGuardianStudentAccess**: Verifica que guardian tenga acceso al estudiante

### 2. `packages/api/src/types/fastify.d.ts`
Extensión de tipos TypeScript para FastifyRequest:
```typescript
interface FastifyRequest {
  user?: {
    userId: string;
    role: string;
    schoolId?: string;
  };
}
```

### 3. Documentación
- **README.md**: Documentación completa de cada middleware con ejemplos
- **MIGRATION_GUIDE.md**: Guía paso a paso para migrar rutas existentes
- **example-usage.ts**: 9 ejemplos prácticos de uso

## Archivos Modificados

### `packages/api/src/services/auth.service.ts`
Se modificaron 5 métodos:

1. **login()**: Ahora incluye schoolAdmin en la consulta
2. **register()**: Genera token con role
3. **refreshAccessToken()**: Recupera role y schoolId para nuevo token
4. **generateAccessToken()**: Acepta role y schoolId, los incluye en JWT
5. **verifyAccessToken()**: Retorna role y schoolId del token

## Estructura del JWT

El token JWT ahora incluye:
```json
{
  "sub": "user-uuid",
  "role": "school_admin",
  "schoolId": "school-uuid",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## Roles Soportados

- **super_admin**: Acceso total al sistema
- **school_admin**: Administrador de un colegio específico (incluye schoolId en JWT)
- **cafeteria_operator**: Operador de cafetería
- **guardian**: Apoderado/tutor

## Ejemplos de Uso

### Ruta solo para super_admin
```typescript
app.get('/admin/users', {
  preHandler: [authenticate, requireRole('super_admin')]
}, handler);
```

### Ruta para school_admin con verificación de colegio
```typescript
app.get('/schools/:schoolId/students', {
  preHandler: [
    authenticate,
    requireRole('super_admin', 'school_admin'),
    requireSchoolAccess
  ]
}, handler);
```

### Ruta para guardians con verificación de estudiante
```typescript
app.get('/students/:id', {
  preHandler: [authenticate, requireGuardianStudentAccess]
}, handler);
```

## Respuestas de Error

### 401 - No autenticado
```json
{
  "success": false,
  "message": "Token de acceso requerido"
}
```

### 403 - No autorizado (rol incorrecto)
```json
{
  "success": false,
  "message": "No tienes permisos para acceder a este recurso",
  "requiredRoles": ["super_admin"],
  "userRole": "guardian"
}
```

### 403 - No autorizado (colegio incorrecto)
```json
{
  "success": false,
  "message": "No tienes permisos para acceder a datos de este colegio"
}
```

## Próximos Pasos

1. **Migrar rutas existentes**: Usar MIGRATION_GUIDE.md para actualizar rutas
2. **Eliminar código duplicado**: Remover funciones `verifyAuth` de archivos de rutas
3. **Crear rutas de administración**: Implementar rutas para school_admin
4. **Testing**: Crear tests para verificar autorización por roles
5. **Seeders**: Crear usuarios con diferentes roles para testing

## Testing Manual

Para probar la implementación:

1. Crear usuario school_admin:
```sql
INSERT INTO users (id, email, password_hash, role) VALUES ('...', 'admin@school.com', '...', 'school_admin');
INSERT INTO school_admins (id, user_id, school_id) VALUES ('...', '<user-id>', '<school-id>');
```

2. Login y obtener token

3. Probar acceso a rutas con diferentes roles

## Archivos del Proyecto

```
packages/api/src/
├── middleware/
│   ├── authorization.ts           # Middleware principal
│   ├── README.md                  # Documentación completa
│   ├── MIGRATION_GUIDE.md         # Guía de migración
│   └── example-usage.ts           # Ejemplos prácticos
├── types/
│   └── fastify.d.ts              # Tipos extendidos
└── services/
    └── auth.service.ts           # Modificado para incluir role/schoolId en JWT
```

## Notas Técnicas

- Los middlewares son **hooks de Fastify** que se ejecutan en el orden especificado
- El JWT se genera en auth.service.ts y se verifica en authorization.ts
- Los middlewares no lanzan excepciones, envían respuestas directamente
- TypeScript reconoce request.user automáticamente gracias a fastify.d.ts
- Compatible con el patrón existente de respuestas { success, message, data }

## Beneficios

1. **Seguridad mejorada**: Control granular por roles
2. **Código limpio**: Sin duplicación de lógica de auth
3. **Mantenible**: Cambios centralizados en un solo lugar
4. **Type-safe**: TypeScript valida correctamente los tipos
5. **Escalable**: Fácil agregar nuevos middlewares y roles
6. **Declarativo**: La seguridad se ve claramente en la definición de rutas

## Autor

Implementado para Tap In Colegios API
Backend: Fastify + Prisma + TypeScript
