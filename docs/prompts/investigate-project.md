# Prompt: Investigación del Estado del Proyecto

## Contexto
- **Proyecto:** Tap In Colegios
- **Descripción:** Plataforma de gestión de cafeterías escolares para apoderados chilenos
- **Stack:** React Native Expo (mobile), Next.js 14 (admin), Fastify + Prisma (API)

---

## Instrucciones de Verificación

### Paso 1: Verificar API (packages/api)

```bash
# Iniciar API
cd packages/api && pnpm dev
```

**Verificaciones:**
1. Health check: `curl http://localhost:4000/health`
2. Swagger: Abrir http://localhost:4000/documentation
3. Login:
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@colegio.cl","password":"admin123"}'
```

**Criterios de éxito:**
- [ ] /health responde `{"status":"ok"}`
- [ ] Swagger muestra todos los endpoints
- [ ] Login retorna token JWT

---

### Paso 2: Verificar Admin Panel (apps/admin)

```bash
# Iniciar Admin
cd apps/admin && pnpm dev
```

**Verificaciones manuales:**
1. Abrir http://localhost:3000/login
2. Ingresar credenciales: admin@colegio.cl / admin123
3. Verificar redirect a dashboard
4. Navegar a cada sección del sidebar
5. Probar logout

**Criterios de éxito:**
- [ ] Login page carga sin errores
- [ ] Login exitoso redirige a dashboard
- [ ] Dashboard muestra estadísticas
- [ ] Navegación funciona a todas las secciones
- [ ] Logout limpia sesión y redirige a login

---

### Paso 3: Verificar con Playwright

```bash
cd apps/admin && pnpm test:e2e:headed
```

**Screenshots a capturar:**
- Login page cargada
- Dashboard después de login
- Cada sección del menú
- Estado de logout

**Criterios de éxito:**
- [ ] Todos los tests pasan
- [ ] Screenshots guardados en apps/admin/screenshots/

---

### Paso 4: Verificar CRUD de Menú

1. Ir a /menu
2. Crear nuevo producto
3. Editar producto existente
4. Eliminar producto

**Criterios de éxito:**
- [ ] Lista de productos carga
- [ ] Crear producto funciona
- [ ] Editar producto funciona
- [ ] Eliminar producto funciona

---

### Paso 5: Verificar CRUD de Paquetes

1. Ir a /packages
2. Crear paquete tipo "saldo"
3. Crear paquete tipo "tickets"
4. Editar paquete
5. Eliminar paquete

**Criterios de éxito:**
- [ ] Lista de paquetes carga
- [ ] Crear paquete saldo funciona
- [ ] Crear paquete tickets funciona
- [ ] Editar paquete funciona
- [ ] Eliminar paquete funciona

---

### Paso 6: Verificar Estudiantes y Transacciones

1. Ir a /students - verificar lista
2. Ir a /transactions - verificar historial
3. Probar filtros y búsqueda

**Criterios de éxito:**
- [ ] Lista de estudiantes carga
- [ ] Búsqueda funciona
- [ ] Lista de transacciones carga
- [ ] Filtros funcionan
- [ ] Paginación funciona

---

## Documentar Resultados

Para cada verificación, documentar:

1. **Estado:** PASA / FALLA / PARCIAL
2. **Evidencia:** Screenshot o log
3. **Errores:** Mensajes de error encontrados
4. **Notas:** Observaciones adicionales

---

## Formato de Reporte

```markdown
## Componente: [Nombre]
- **Estado:** [PASA/FALLA/PARCIAL]
- **Fecha:** [YYYY-MM-DD]
- **Evidencia:** [ruta a screenshot]
- **Errores:** [ninguno / descripción]
- **Notas:** [observaciones]
```

---

## Checklist Final

- [ ] API responde correctamente
- [ ] Login funciona con credenciales de prueba
- [ ] Dashboard carga sin errores
- [ ] Navegación funciona
- [ ] CRUD de menú funciona
- [ ] CRUD de paquetes funciona
- [ ] Lista de estudiantes funciona
- [ ] Historial de transacciones funciona
- [ ] Logout funciona
- [ ] No hay errores en consola del navegador
