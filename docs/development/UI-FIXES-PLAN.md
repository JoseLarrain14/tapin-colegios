# Plan de Corrección de UI - App Móvil

**Fecha de creación:** 2026-01-17
**Estado:** Pendiente de ejecución
**Responsable de coordinación:** Claude (Opus 4.5)
**Ejecutores:** Subagents especializados

---

## Resumen Ejecutivo

Este documento detalla el plan para corregir los problemas de UI identificados en la aplicación móvil. Los problemas principales incluyen navegación rota, botones sin funcionalidad, y headers inconsistentes.

---

## Problemas Identificados

### 🔴 Severidad Crítica

#### P1: Sistema Dual de Home (Conflicto de Arquitectura)

**Ubicación:**
- `apps/mobile/app/home.tsx` (defectuoso)
- `apps/mobile/app/(tabs)/index.tsx` (correcto)

**Descripción:**
Existen dos pantallas de "home" diferentes. El login (`login.tsx`) redirige a `/home` que es la versión defectuosa sin tab bar y con botones rotos. La versión correcta está en `/(tabs)/index.tsx`.

**Impacto:**
- Usuario llega a pantalla defectuosa post-login
- No ve el tab bar de navegación
- Botones no funcionan

**Solución propuesta:**
1. Modificar `login.tsx` para redirigir a `/(tabs)` en lugar de `/home`
2. Modificar `register/step5.tsx` para redirigir a `/(tabs)`
3. Evaluar eliminación de `home.tsx` si ya no es necesario

---

#### P2: Botones Sin Funcionalidad (onPress faltante)

**Ubicación:** `apps/mobile/app/home.tsx` líneas 259-270

**Código actual (DEFECTUOSO):**
```tsx
// Línea ~259 - Botón Historial SIN onPress
<TouchableOpacity style={styles.quickActionItem}>
  <View style={styles.quickActionIcon}>
    <Text style={styles.quickActionIconText}>📜</Text>
  </View>
  <Text style={styles.quickActionLabel}>Historial</Text>
</TouchableOpacity>

// Línea ~265 - Botón Menu SIN onPress
<TouchableOpacity style={styles.quickActionItem}>
  <View style={styles.quickActionIcon}>
    <Text style={styles.quickActionIconText}>🍽️</Text>
  </View>
  <Text style={styles.quickActionLabel}>Menu</Text>
</TouchableOpacity>
```

**Código correcto (referencia de `(tabs)/index.tsx`):**
```tsx
<TouchableOpacity
  style={styles.quickActionItem}
  onPress={() => router.push('/(tabs)/history')}
>
  ...
</TouchableOpacity>

<TouchableOpacity
  style={styles.quickActionItem}
  onPress={() => router.push('/(tabs)/cafeteria')}
>
  ...
</TouchableOpacity>
```

**Solución propuesta:**
- Si se mantiene `home.tsx`: Agregar `onPress` handlers
- Si se elimina `home.tsx`: Este problema se resuelve automáticamente

---

### 🟠 Severidad Alta

#### P3: Headers Faltantes en Pantallas Standalone

**Ubicación:** Múltiples archivos

| Archivo | Tiene Header | Tiene Back Button |
|---------|--------------|-------------------|
| `add-student.tsx` | ❌ No | ❌ No |
| `edit-student.tsx` | ❌ No | ❌ No |
| `students.tsx` | ❌ No | ❌ No |
| `recharge.tsx` | ❌ No | ❌ No |
| `wallet-history.tsx` | ❌ No | ❌ No |
| `spending-stats.tsx` | ❌ No | ❌ No |
| `coupons.tsx` | ❌ No | ❌ No |
| `notifications.tsx` | ❌ No | ❌ No |
| `help.tsx` | ⚠️ Parcial | ⚠️ Verificar |

**Impacto:**
- Usuario pierde contexto de dónde está
- No hay forma visual de volver atrás (solo gesto/botón físico)

**Solución propuesta:**
Crear un componente `ScreenHeader` reutilizable o usar el header del Stack navigator.

---

#### P4: Navbar Inconsistente en Flujo de Registro

**Ubicación:** `apps/mobile/app/register/`

**Descripción:**
- `register/index.tsx` (paso 1) - Header configurado pero verificar visibilidad
- `register/step2.tsx` a `step4.tsx` - Tienen headers
- `register/step5.tsx` - Pantalla de éxito, verificar navegación

**Problema reportado por usuario:**
"Cuando entras desde registrarte, la navbar no aparece"

**Solución propuesta:**
1. Verificar configuración del Stack layout en `register/_layout.tsx`
2. Asegurar que `headerShown: true` está activo para todas las pantallas
3. Verificar que el header se renderiza correctamente en el primer paso

---

### 🟡 Severidad Media

#### P5: Logout Duplicado

**Ubicación:**
- `apps/mobile/app/home.tsx` (línea ~353)
- `apps/mobile/app/(tabs)/profile.tsx`

**Impacto:** Inconsistencia de UX, confusión del usuario.

**Solución propuesta:**
- Mantener logout solo en Profile (patrón estándar)
- Eliminar de home.tsx (o eliminar home.tsx completo)

---

## Plan de Ejecución

### Fase 1: Correcciones Críticas de Navegación

**Objetivo:** Arreglar el flujo principal de navegación post-autenticación.

**Tareas:**

| ID | Tarea | Archivo(s) | Subagent | Dependencias |
|----|-------|-----------|----------|--------------|
| 1.1 | Cambiar redirección post-login de `/home` a `/(tabs)` | `login.tsx` | frontend-developer | Ninguna |
| 1.2 | Cambiar redirección post-registro de `/home` a `/(tabs)` | `register/step5.tsx` | frontend-developer | Ninguna |
| 1.3 | Verificar si `home.tsx` tiene otros usos | Análisis global | Explore | Ninguna |
| 1.4 | Eliminar o deprecar `home.tsx` si no es necesario | `home.tsx` | frontend-developer | 1.1, 1.2, 1.3 |

**Ejecución:** Tareas 1.1, 1.2, 1.3 pueden ejecutarse en **paralelo**.

---

### Fase 2: Corrección de Headers

**Objetivo:** Agregar headers consistentes a todas las pantallas standalone.

**Tareas:**

| ID | Tarea | Archivo(s) | Subagent | Dependencias |
|----|-------|-----------|----------|--------------|
| 2.1 | Crear componente `ScreenHeader` reutilizable (si no existe) | `src/components/` | frontend-developer | Ninguna |
| 2.2 | Agregar header a `add-student.tsx` | `add-student.tsx` | frontend-developer | 2.1 |
| 2.3 | Agregar header a `edit-student.tsx` | `edit-student.tsx` | frontend-developer | 2.1 |
| 2.4 | Agregar header a `students.tsx` | `students.tsx` | frontend-developer | 2.1 |
| 2.5 | Agregar header a `recharge.tsx` | `recharge.tsx` | frontend-developer | 2.1 |
| 2.6 | Agregar header a `wallet-history.tsx` | `wallet-history.tsx` | frontend-developer | 2.1 |
| 2.7 | Agregar header a `spending-stats.tsx` | `spending-stats.tsx` | frontend-developer | 2.1 |
| 2.8 | Agregar header a `coupons.tsx` | `coupons.tsx` | frontend-developer | 2.1 |
| 2.9 | Agregar header a `notifications.tsx` | `notifications.tsx` | frontend-developer | 2.1 |

**Ejecución:**
- Tarea 2.1 primero (crear componente base)
- Tareas 2.2-2.9 pueden ejecutarse en **paralelo** después

---

### Fase 3: Corrección de Flujo de Registro

**Objetivo:** Asegurar que la navbar aparece correctamente en todo el flujo de registro.

**Tareas:**

| ID | Tarea | Archivo(s) | Subagent | Dependencias |
|----|-------|-----------|----------|--------------|
| 3.1 | Revisar y corregir `register/_layout.tsx` | `register/_layout.tsx` | frontend-developer | Ninguna |
| 3.2 | Verificar header en `register/index.tsx` (paso 1) | `register/index.tsx` | frontend-developer | 3.1 |
| 3.3 | Verificar navegación en `register/step5.tsx` | `register/step5.tsx` | frontend-developer | Fase 1 |

**Ejecución:** Secuencial (3.1 → 3.2 → 3.3)

---

### Fase 4: Testing y Validación

**Objetivo:** Verificar que todas las correcciones funcionan correctamente.

**Tareas:**

| ID | Tarea | Herramienta | Subagent | Dependencias |
|----|-------|-------------|----------|--------------|
| 4.1 | Test de flujo de login → home | Playwright MCP | test-engineer | Fases 1-3 |
| 4.2 | Test de flujo de registro completo | Playwright MCP | test-engineer | Fases 1-3 |
| 4.3 | Test de navegación entre pantallas | Playwright MCP | test-engineer | Fases 1-3 |
| 4.4 | Test de botones (todos deben responder) | Playwright MCP | test-engineer | Fases 1-3 |
| 4.5 | Verificar headers visibles en todas las pantallas | Playwright MCP | test-engineer | Fases 1-3 |

**Ejecución:** En paralelo después de completar fases 1-3.

---

### Fase 5: Code Review y Documentación

**Objetivo:** Revisar calidad del código y documentar cambios.

**Tareas:**

| ID | Tarea | Subagent | Dependencias |
|----|-------|----------|--------------|
| 5.1 | Code review de todos los cambios | code-reviewer | Fase 4 |
| 5.2 | Documentar cambios realizados | documentation-expert | Fase 4 |
| 5.3 | Actualizar CHANGELOG si existe | documentation-expert | 5.2 |

---

## Diagrama de Dependencias

```
Fase 1 (Navegación Crítica)
├── 1.1 Login redirect ─────────────┐
├── 1.2 Register redirect ──────────┼──→ 1.4 Eliminar home.tsx
└── 1.3 Análisis home.tsx ──────────┘
                                     │
                                     ▼
Fase 2 (Headers)                 Fase 3 (Registro)
├── 2.1 Crear ScreenHeader       ├── 3.1 Layout registro
│       │                        │       │
│       ▼                        │       ▼
├── 2.2-2.9 (paralelo) ◄─────────┴── 3.2-3.3 Header registro
│
▼
Fase 4 (Testing) ──────────────────→ 4.1-4.5 (paralelo)
                                          │
                                          ▼
Fase 5 (Review/Docs) ──────────────→ 5.1-5.3 (secuencial)
```

---

## Archivos Involucrados

### Modificaciones Principales

```
apps/mobile/app/
├── login.tsx                 # Cambiar redirect
├── home.tsx                  # Eliminar o deprecar
├── register/
│   ├── _layout.tsx          # Verificar config header
│   ├── index.tsx            # Verificar header paso 1
│   └── step5.tsx            # Cambiar redirect
├── add-student.tsx          # Agregar header
├── edit-student.tsx         # Agregar header
├── students.tsx             # Agregar header
├── recharge.tsx             # Agregar header
├── wallet-history.tsx       # Agregar header
├── spending-stats.tsx       # Agregar header
├── coupons.tsx              # Agregar header
└── notifications.tsx        # Agregar header
```

### Nuevos Archivos (si aplica)

```
apps/mobile/src/components/
└── ScreenHeader.tsx         # Componente reutilizable (si se crea)
```

---

## Criterios de Éxito

- [ ] Usuario puede hacer login y llegar al home con tab bar visible
- [ ] Usuario puede registrarse y ver navbar en todos los pasos
- [ ] Todos los botones de navegación responden al tap
- [ ] Todas las pantallas standalone tienen header con botón back
- [ ] No hay pantallas "huérfanas" sin forma de volver
- [ ] Code review aprobado sin issues críticos

---

## Notas Adicionales

### Decisión Pendiente: ¿Eliminar home.tsx?

**Opción A:** Eliminar `home.tsx` completamente
- ✅ Elimina código duplicado y defectuoso
- ✅ Simplifica arquitectura
- ⚠️ Verificar que no hay deep links o referencias externas

**Opción B:** Mantener y corregir `home.tsx`
- ✅ Cambios mínimos
- ❌ Mantiene código duplicado
- ❌ Posible confusión futura

**Recomendación:** Opción A (eliminar), pero primero verificar con tarea 1.3.

---

## Registro de Cambios del Plan

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 2026-01-17 | Creación inicial del documento | Claude (Opus 4.5) |

---

## Referencias

- Exploración inicial de arquitectura: agentId `a6ce51a`
- Framework: Expo Router (file-based routing)
- UI Library: React Native Paper
