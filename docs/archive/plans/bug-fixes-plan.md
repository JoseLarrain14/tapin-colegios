# Plan de Corrección de Bugs - App React Native Tap In

**Fecha:** 2026-01-17
**Estado:** COMPLETADO

---

## Resumen Ejecutivo

Este documento detalla 6 bugs identificados en la aplicación móvil React Native y sus correcciones planificadas.

---

## Bug 1: Botón "Agregar" con texto azul

### Ubicación
- **Pantalla:** Mis Estudiantes (cuando hay estudiantes)
- **Archivo:** `apps/mobile/app/students.tsx`
- **Líneas:** 217-222

### Problema
El botón FAB "+ Agregar" en la esquina inferior muestra texto azul en lugar de blanco.

### Causa Raíz
El FAB de React Native Paper hereda el color del tema MD3 por defecto para el texto/ícono.

### Solución
```tsx
<FAB
  icon="plus"
  style={styles.fab}
  onPress={handleAddStudent}
  label="Agregar"
  color="#FFFFFF"  // Forzar color blanco
/>
```

### Verificación
- [x] Texto del botón es blanco (#FFFFFF)
- [x] Ícono "plus" es blanco
- [x] Fondo sigue siendo rojo (#C9384E)

---

## Bug 2: Filtro "Todos" no funciona en Historial

### Ubicación
- **Pantalla:** Historial → Filtro por hijo
- **Archivo:** `apps/mobile/app/(tabs)/history.tsx`
- **Líneas:** 90-92

### Problema
Al seleccionar "Todos" no muestra todas las transacciones, solo funciona filtrar por estudiante individual.

### Causa Raíz
El código auto-selecciona el primer estudiante al cargar:
```tsx
if (studentList.length > 0 && !selectedStudent) {
  setSelectedStudent(studentList[0]);
}
```

### Solución
Eliminar la auto-selección para que "Todos" sea el estado inicial por defecto.

### Verificación
- [x] Al abrir Historial, muestra todas las transacciones
- [x] El chip "Todos" está activo por defecto
- [x] Seleccionar un estudiante filtra correctamente
- [x] Volver a "Todos" muestra todas las transacciones

---

## Bug 3: Pantalla "Sin conexión" aparece con WiFi

### Ubicación
- **Pantalla:** Estadísticas de Gastos
- **Archivo:** `apps/mobile/app/spending-stats.tsx`
- **Líneas:** 45-74

### Problema
Muestra error de conexión aunque hay internet.

### Causa Raíz
Cualquier error de la API (incluyendo datos vacíos o endpoint 404) se muestra como "Error de conexión".

### Solución
Distinguir entre errores de red reales y respuestas sin datos:
- Si es error de red (Network, timeout) → mostrar NetworkError
- Si no hay datos → mostrar estado vacío con chartData: []

### Verificación
- [x] Con internet, muestra estadísticas o "Sin gastos"
- [x] Sin internet, muestra correctamente "Sin conexión"
- [x] Pull-to-refresh funciona

---

## Bug 4: Contenido se sale de la pantalla (overflow)

### Ubicación
- **Pantalla:** Home con estudiante seleccionado
- **Archivo:** `apps/mobile/app/(tabs)/index.tsx`
- **Líneas:** 260-296

### Problema
Los botones de acción (QR, ojo, "Ver historial", stats) se salen del contenedor.

### Causa Raíz
4 botones en un contenedor con `flexDirection: 'row'` sin wrap.

### Solución
Reorganizar en dos filas:
- **Fila 1:** Recargar + Ver detalles (flex: 1 cada uno)
- **Fila 2:** Ver historial + Ver estadísticas (centrados)

### Verificación
- [x] Botones no se salen del contenedor
- [x] Layout responsive en diferentes tamaños
- [x] Todos los botones son clickeables

---

## Bug 5: Validación de RUT incorrecta

### Ubicación
- **Pantalla:** Agregar Estudiante → Campo RUT
- **Archivo:** `apps/mobile/app/add-student.tsx`
- **Línea:** 63

### Problema
Muestra el dígito verificador correcto en el mensaje de error: "debería ser K"

### Causa Raíz
El mensaje de error expone información sensible:
```tsx
message: 'El digito verificador es incorrecto (deberia ser ' + calculatedDigit + ')'
```

### Solución
```tsx
message: 'El digito verificador es incorrecto. Por favor verifica el RUT.'
```

### Verificación
- [x] Mensaje NO muestra el dígito correcto
- [x] Validación matemática sigue funcionando
- [x] Formato se aplica correctamente

---

## Bug 6: Cerrar sesión no funciona

### Ubicación
- **Pantalla:** Perfil → Botón "Cerrar sesión"
- **Archivo:** `apps/mobile/app/profile.tsx`
- **Líneas:** 86-89

### Problema
Al presionar, muestra brevemente una pantalla con logo/interrogación y se queda pegado.

### Causa Raíz
Race condition entre `logout()` y `router.replace('/')` compitiendo con AuthProvider.

### Solución
```tsx
const handleLogout = async () => {
  await logout();
  // Dejar que AuthProvider maneje la navegación automáticamente
};
```

### Verificación
- [x] Logout redirige a splash sin quedarse pegado
- [x] No se puede navegar hacia atrás a tabs
- [x] Tokens se limpian correctamente
- [x] Login posterior funciona

---

## Archivos Modificados

| Bug | Archivo | Tipo de Cambio |
|-----|---------|----------------|
| 1 | `apps/mobile/app/students.tsx` | Prop en FAB |
| 2 | `apps/mobile/app/(tabs)/history.tsx` | Eliminar código |
| 3 | `apps/mobile/app/spending-stats.tsx` | Refactor loadData |
| 4 | `apps/mobile/app/(tabs)/index.tsx` | Reorganizar JSX + estilos |
| 5 | `apps/mobile/app/add-student.tsx` | Cambiar mensaje |
| 6 | `apps/mobile/app/profile.tsx` | Simplificar función |

---

## Asignación de Agentes

| Agente | Bugs | Especialidad |
|--------|------|--------------|
| Frontend Developer | 1, 4 | UI/Estilos |
| Code Reviewer | 2, 5 | Lógica de negocio |
| Backend Architect | 3 | Manejo de API/errores |
| Security Auditor | 6 | Autenticación |

---

## Historial de Cambios

| Fecha | Estado | Notas |
|-------|--------|-------|
| 2026-01-17 | Creado | Plan inicial documentado |
| 2026-01-17 | COMPLETADO | Todos los 6 bugs corregidos y verificados |
