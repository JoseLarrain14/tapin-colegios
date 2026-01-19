# Test Plan - Dashboard API Integration

## Pre-requisitos

1. Backend corriendo en http://localhost:3001
2. Frontend admin corriendo en http://localhost:3000
3. Usuario con rol `super_admin` creado en la base de datos
4. Datos de prueba en la base de datos (colegios, usuarios, transacciones)

## Pasos de Prueba

### 1. Verificar Backend

```bash
# En la carpeta raíz del proyecto
cd packages/api
pnpm dev

# Verificar que el servidor esté corriendo
curl http://localhost:3001/health
```

**Resultado esperado:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-18T..."
}
```

### 2. Probar Endpoint de Stats Manualmente

```bash
# Primero hacer login para obtener el token
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Copiar el token del response y usarlo aquí
curl http://localhost:3001/api/v1/stats/dashboard \
  -H "Authorization: Bearer <TOKEN_AQUI>"
```

**Resultado esperado:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "activeSchools": {"value": X, "change": "+X%"},
      "totalUsers": {"value": X, "change": "+X%"},
      "transactionsToday": {"value": X, "change": "+X%"},
      "revenueThisMonth": {"value": X, "formatted": "$X", "change": "+X%"}
    },
    "recentActivity": [...]
  }
}
```

### 3. Verificar Frontend

```bash
# En la carpeta del admin
cd apps/admin
pnpm dev
```

Abrir navegador en http://localhost:3000

### 4. Tests Visuales

#### Test 1: Login
- [ ] Ir a /login
- [ ] Ingresar credenciales de admin
- [ ] Verificar redirección a dashboard

#### Test 2: Loading State
- [ ] Al cargar el dashboard, debe mostrar:
  - [ ] 4 cards con skeleton (animación pulse gris)
  - [ ] Actividad reciente con skeleton
- [ ] Duración: ~500ms a 2 segundos

#### Test 3: Stats Cards
- [ ] Verificar que se muestren 4 cards:
  - [ ] Colegios Activos (azul)
  - [ ] Usuarios Totales (verde)
  - [ ] Transacciones Hoy (púrpura)
  - [ ] Ingresos Mes (naranja)
- [ ] Verificar que cada card tenga:
  - [ ] Icono en color correspondiente
  - [ ] Label descriptivo
  - [ ] Valor numérico (no "12" o "1,234" hardcodeado)
  - [ ] Cambio porcentual con color (verde/rojo)

#### Test 4: Formateo de Datos
- [ ] Usuarios Totales debe tener separador de miles (ej: "1.234")
- [ ] Ingresos Mes debe tener formato CLP (ej: "$2.400.000")
- [ ] Cambios porcentuales deben tener signo (ej: "+12.5%" o "-5.3%")
- [ ] Colores de cambio:
  - [ ] Verde si es positivo (+)
  - [ ] Rojo si es negativo (-)

#### Test 5: Actividad Reciente
- [ ] Si hay transacciones:
  - [ ] Mostrar hasta 10 transacciones
  - [ ] Cada transacción debe tener:
    - [ ] Punto de color según tipo (azul/naranja/púrpura)
    - [ ] Descripción legible
    - [ ] Timestamp relativo ("Hace X minutos/horas/días")
    - [ ] Monto formateado en CLP
  - [ ] Hover debe cambiar el fondo
- [ ] Si NO hay transacciones:
  - [ ] Mostrar icono de recibo
  - [ ] Mensaje "No hay actividad reciente"

#### Test 6: Error State
Para probar esto, apagar el backend temporalmente:

```bash
# Detener el backend
# Recargar el dashboard
```

- [ ] Debe mostrar:
  - [ ] Banner rojo con icono de warning
  - [ ] Título "Error al cargar estadísticas"
  - [ ] Mensaje de error descriptivo
- [ ] NO debe romper la página
- [ ] Acciones Rápidas deben seguir visibles

#### Test 7: Responsive Design
- [ ] Desktop (>1024px):
  - [ ] 4 cards en una fila
  - [ ] Acciones rápidas en 3 columnas
- [ ] Tablet (768-1023px):
  - [ ] 2 cards por fila
  - [ ] Acciones rápidas en 3 columnas
- [ ] Mobile (<768px):
  - [ ] 1 card por fila
  - [ ] Acciones rápidas apiladas

#### Test 8: Dark Mode
- [ ] Cambiar a dark mode (si está implementado)
- [ ] Verificar contraste de colores
- [ ] Verificar que skeleton sea visible
- [ ] Verificar que los textos sean legibles

### 5. Tests de Integración

#### Test de Roles
```bash
# Crear usuario sin rol super_admin
# Intentar acceder a /stats/dashboard
```

**Resultado esperado:**
- [ ] Error 403 Forbidden
- [ ] Mensaje en UI de no autorizado

#### Test de Token Expirado
```bash
# Esperar que expire el token JWT
# Intentar cargar dashboard
```

**Resultado esperado:**
- [ ] Redirección automática a /login
- [ ] Mensaje de sesión expirada

### 6. Performance Tests

- [ ] Tiempo de carga total < 3 segundos
- [ ] Primera renderización < 500ms
- [ ] Animaciones fluidas (60fps)
- [ ] Sin errores en consola del navegador
- [ ] Sin warnings de React

### 7. Tests de Datos

Verificar con diferentes escenarios de datos:

#### Escenario 1: Datos Vacíos
```sql
-- Limpiar transacciones
DELETE FROM transactions;
```
- [ ] Stats deben mostrar 0
- [ ] Cambios deben mostrar "0%" o "+100%" si había datos antes
- [ ] Actividad reciente: "No hay actividad reciente"

#### Escenario 2: Datos Negativos
```sql
-- Simular pérdida de usuarios o escuelas
-- (desactivar algunas escuelas)
UPDATE schools SET active = 0 WHERE id IN (SELECT id FROM schools LIMIT 2);
```
- [ ] Cambio debe mostrar porcentaje negativo
- [ ] Color debe ser rojo

#### Escenario 3: Muchas Transacciones
```sql
-- Crear 100+ transacciones
-- (usar el script de seed)
```
- [ ] Debe mostrar solo las 10 más recientes
- [ ] No debe haber lag al renderizar

## Criterios de Éxito

- [ ] Todos los tests visuales pasan
- [ ] No hay errores en consola
- [ ] Loading states son claros
- [ ] Error handling funciona
- [ ] Datos se formatean correctamente
- [ ] Responsive design funciona
- [ ] Dark mode funciona (si aplica)
- [ ] Performance es aceptable

## Bugs Conocidos

- Ninguno por el momento

## Notas

- Si el endpoint devuelve error, verificar:
  1. Backend corriendo en puerto correcto
  2. Token JWT válido
  3. Usuario tiene rol `super_admin`
  4. Base de datos tiene datos de prueba

- Si los números no cambian:
  1. Verificar que hay transacciones de diferentes días
  2. Verificar que hay datos históricos (mes anterior)
