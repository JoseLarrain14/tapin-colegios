# Documentación - Tap In Colegios

## Índice

### Estado del Proyecto
- [PROJECT-STATUS.md](./PROJECT-STATUS.md) - Estado actual verificado con Playwright

### Guías de Setup
- [Admin Panel](./admin/setup.md) - Configuración del panel de administración
- [API](../packages/api/README.md) - Backend Fastify + Prisma
- [Mobile](../apps/mobile/README.md) - App React Native Expo

### Arquitectura
- [Autorización](./auth/authorization.md) - Middleware de autenticación y roles

### Planes de Implementación
- [Admin Panel Plan](./ADMIN-PANEL-PLAN.md) - Plan original del panel admin
- [Auth Fix Plan](./auth-fix-plan.md) - Correcciones de autenticación
- [Bug Fixes Plan](./bug-fixes-plan.md) - Correcciones de bugs móvil
- [Cleanup Plan](./cleanup-plan.md) - Plan de limpieza del proyecto

### Prompts y Guías
- [Investigar Proyecto](./prompts/investigate-project.md) - Guía para verificar estado del proyecto

### Archivo
- [archive/](./archive/) - Reportes y documentación histórica

---

## Estructura del Proyecto

```
app-casinos-tapin/
├── apps/
│   ├── admin/          # Panel Next.js 14
│   └── mobile/         # App React Native Expo
├── packages/
│   └── api/            # Backend Fastify + Prisma
└── docs/               # Esta documentación
```

## Quick Links

- **API:** http://localhost:4000
- **Admin:** http://localhost:3000
- **Swagger:** http://localhost:4000/documentation

## Credenciales de Prueba

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@colegio.cl | admin123 |
