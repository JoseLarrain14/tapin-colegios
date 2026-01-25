# PRD: Migración App Mobile a Next.js PWA

## Overview
Migrar la aplicación móvil React Native (Expo) ubicada en `apps/mobile/` a una Progressive Web App usando Next.js 14 con App Router y Tailwind CSS. La nueva app web en `apps/web/` debe replicar toda la funcionalidad de la app móvil.

## Problem Statement
La app móvil actual solo está disponible para dispositivos móviles. Se necesita una versión web accesible desde cualquier navegador, que además funcione como PWA para ofrecer una experiencia similar a una app nativa.

## Target Users
- **Apoderados/Padres**: Usuarios que prefieren acceder desde computador o navegador móvil
- **Usuarios sin espacio en celular**: No necesitan instalar una app nativa

## Technical Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **State Management**: Zustand + React Query
- **HTTP Client**: Axios
- **PWA**: next-pwa

## Source Reference
Código fuente a migrar en `apps/mobile/`:
- Screens: `apps/mobile/app/`
- Components: `apps/mobile/src/components/`
- Services: `apps/mobile/src/services/`
- Stores: `apps/mobile/src/store/`
- Utils: `apps/mobile/src/utils/`
- Theme: `apps/mobile/src/constants/theme.ts`

---

## User Stories

### FASE 0: Project Setup

#### US-001: Crear proyecto Next.js
**Priority:** 1
**Description:** Inicializar proyecto Next.js en apps/web con TypeScript y App Router.
**Acceptance Criteria:**
- [ ] Ejecutar: `cd apps && npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --no-import-alias`
- [ ] Estructura creada en `apps/web/`
- [ ] `package.json` con scripts de dev/build/start
- [ ] Proyecto compila con `pnpm build`

#### US-002: Configurar Tailwind con tema del proyecto
**Priority:** 2
**Description:** Configurar Tailwind CSS con los colores y espaciado del tema actual.
**Acceptance Criteria:**
- [ ] Leer `apps/mobile/src/constants/theme.ts` como referencia
- [ ] Configurar `tailwind.config.ts` con colores: primary (#C9384E), background, surface, text, success, warning, error, info, border
- [ ] Agregar spacing: xs (4px), sm (8px), md (16px), lg (24px), xl (32px), 2xl (48px)
- [ ] Agregar borderRadius: sm (4px), md (8px), lg (12px), xl (16px)
- [ ] Agregar shadows: sm, md, lg
- [ ] TypeScript compila sin errores

#### US-003: Configurar PWA
**Priority:** 3
**Description:** Configurar next-pwa para Progressive Web App.
**Acceptance Criteria:**
- [ ] Instalar: `pnpm add next-pwa`
- [ ] Crear `public/manifest.json` con name "Tap In Colegios", theme_color "#C9384E"
- [ ] Crear iconos placeholder en `public/icons/` (icon-192x192.png, icon-512x512.png)
- [ ] Configurar `next.config.js` con withPWA
- [ ] Agregar meta tags PWA en `src/app/layout.tsx`
- [ ] Build compila sin errores

---

### FASE 1: Infrastructure

#### US-004: Crear utility de storage
**Priority:** 4
**Description:** Crear wrapper de localStorage para almacenamiento.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/lib/storage.ts`
- [ ] Implementar: getItem, setItem, removeItem
- [ ] Manejar SSR (typeof window check)
- [ ] TypeScript compila sin errores

#### US-005: Migrar utilidades de formateo de fechas
**Priority:** 5
**Description:** Copiar y adaptar dateFormat.ts
**Acceptance Criteria:**
- [ ] Copiar `apps/mobile/src/utils/dateFormat.ts` a `apps/web/src/utils/dateFormat.ts`
- [ ] Verificar que funciones formatDateTime, formatDate, formatTime, formatRelativeTime, formatShortDate, formatCLP funcionan
- [ ] Sin dependencias de React Native
- [ ] TypeScript compila sin errores

#### US-006: Migrar API service
**Priority:** 6
**Description:** Adaptar servicio API de mobile a web.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/lib/api.ts`
- [ ] Copiar contenido de `apps/mobile/src/services/api.ts`
- [ ] Cambiar `Constants.expoConfig?.extra?.apiUrl` por `process.env.NEXT_PUBLIC_API_URL`
- [ ] Crear `.env.local` con NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
- [ ] Mantener todos los métodos y tipos
- [ ] Exportar ApiService class y apiService instance
- [ ] TypeScript compila sin errores

#### US-007: Migrar authStore (Zustand)
**Priority:** 7
**Description:** Adaptar store de autenticación para web.
**Acceptance Criteria:**
- [ ] Instalar: `pnpm add zustand`
- [ ] Crear `apps/web/src/store/authStore.ts`
- [ ] Copiar lógica de `apps/mobile/src/store/authStore.ts`
- [ ] Cambiar storage de SecureStore a localStorage (usar lib/storage.ts)
- [ ] Remover lógica de push notifications (será diferente en web)
- [ ] Mantener: login, logout, register, checkAuth, refreshAccessToken
- [ ] TypeScript compila sin errores

#### US-008: Migrar registerStore (Zustand)
**Priority:** 8
**Description:** Copiar store de registro multi-paso.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/store/registerStore.ts`
- [ ] Copiar contenido de `apps/mobile/src/store/registerStore.ts`
- [ ] Sin cambios necesarios (es Zustand puro)
- [ ] TypeScript compila sin errores

#### US-009: Crear middleware de autenticación
**Priority:** 9
**Description:** Middleware Next.js para proteger rutas.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/middleware.ts`
- [ ] Definir rutas protegidas: /students, /recharge, /profile, /cafeteria, /history, /wallet-history, /spending-stats, /payment-history, /notifications, /coupons, /help, /edit-profile
- [ ] Definir rutas de auth: /login, /register
- [ ] Redirigir a /login si no autenticado y accede a ruta protegida
- [ ] Redirigir a / si autenticado y accede a /login o /register
- [ ] Usar cookie 'auth_token' para verificar
- [ ] TypeScript compila sin errores

---

### FASE 2: UI Components Base

#### US-010: Crear componente Button
**Priority:** 10
**Description:** Componente Button con variantes.
**Acceptance Criteria:**
- [ ] Instalar: `pnpm add clsx tailwind-merge`
- [ ] Crear `apps/web/src/lib/utils.ts` con función cn() para merge de clases
- [ ] Crear `apps/web/src/components/ui/Button.tsx`
- [ ] Variantes: primary (default), outline, ghost, danger
- [ ] Tamaños: sm, md (default), lg
- [ ] Props: disabled, loading (muestra spinner), fullWidth
- [ ] Usar colores del tema (primary, etc.)
- [ ] TypeScript compila sin errores

#### US-011: Crear componente Input
**Priority:** 11
**Description:** Componente Input con label y error.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/components/ui/Input.tsx`
- [ ] Props: label, error, helperText, type, placeholder, value, onChange, disabled
- [ ] Estilo: borde gris, focus borde primary, error borde rojo
- [ ] Mostrar label arriba del input
- [ ] Mostrar error/helperText debajo
- [ ] TypeScript compila sin errores

#### US-012: Crear componente Card
**Priority:** 12
**Description:** Componente Card container.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/components/ui/Card.tsx`
- [ ] Props: children, className, padding (boolean, default true)
- [ ] Estilo: bg-white, rounded-xl, shadow-sm, p-4 (si padding)
- [ ] TypeScript compila sin errores

#### US-013: Crear componente Dialog/Modal
**Priority:** 13
**Description:** Componente Modal para dialogs y confirmaciones.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/components/ui/Dialog.tsx`
- [ ] Usar createPortal para renderizar en body
- [ ] Props: open, onClose, title, children
- [ ] Overlay oscuro con click para cerrar (opcional)
- [ ] Animación de fade in/out con CSS
- [ ] Botón X para cerrar
- [ ] Crear también ConfirmDialog con props: title, message, onConfirm, onCancel, confirmText, cancelText
- [ ] TypeScript compila sin errores

#### US-014: Crear componente LoadingSpinner
**Priority:** 14
**Description:** Spinner de carga.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/components/ui/LoadingSpinner.tsx`
- [ ] SVG spinner animado con Tailwind animate-spin
- [ ] Props: size (sm, md, lg), color (default primary)
- [ ] Exportar también FullPageLoader (spinner centrado en pantalla)
- [ ] TypeScript compila sin errores

#### US-015: Crear componente Avatar
**Priority:** 15
**Description:** Avatar con imagen o iniciales.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/components/ui/Avatar.tsx`
- [ ] Props: src (opcional), name, size (sm, md, lg)
- [ ] Si src: mostrar imagen con next/image
- [ ] Si no src: mostrar iniciales con fondo de color
- [ ] Forma circular
- [ ] TypeScript compila sin errores

#### US-016: Crear componente Badge
**Priority:** 16
**Description:** Badge para tags y estados.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/components/ui/Badge.tsx`
- [ ] Props: children, variant (default, success, warning, error, info)
- [ ] Estilo: pequeño, rounded-full, colores según variant
- [ ] TypeScript compila sin errores

#### US-017: Crear index de componentes UI
**Priority:** 17
**Description:** Archivo index para exportar todos los componentes UI.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/components/ui/index.ts`
- [ ] Exportar: Button, Input, Card, Dialog, ConfirmDialog, LoadingSpinner, FullPageLoader, Avatar, Badge
- [ ] TypeScript compila sin errores

---

### FASE 3: Layouts

#### US-018: Crear Root Layout con providers
**Priority:** 18
**Description:** Layout raíz con providers de estado.
**Acceptance Criteria:**
- [ ] Instalar: `pnpm add @tanstack/react-query`
- [ ] Editar `apps/web/src/app/layout.tsx`
- [ ] Agregar QueryClientProvider
- [ ] Agregar metadata: title "Tap In Colegios", description
- [ ] Importar globals.css
- [ ] Agregar fuente Inter de next/font
- [ ] TypeScript compila sin errores

#### US-019: Crear Auth Layout
**Priority:** 19
**Description:** Layout para páginas de autenticación (sin navegación).
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(auth)/layout.tsx`
- [ ] Layout simple con fondo claro
- [ ] Logo centrado en la parte superior
- [ ] Contenedor centrado para formularios
- [ ] TypeScript compila sin errores

#### US-020: Crear Dashboard Layout con navegación
**Priority:** 20
**Description:** Layout para páginas autenticadas con sidebar y bottom nav.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(dashboard)/layout.tsx`
- [ ] Crear `apps/web/src/components/layout/Sidebar.tsx` - navegación lateral para desktop
- [ ] Crear `apps/web/src/components/layout/BottomNav.tsx` - navegación inferior para mobile
- [ ] Sidebar visible en md: y superiores, BottomNav visible en mobile
- [ ] Items de navegación: Inicio (/), Cafetería (/cafeteria), Historial (/history), Perfil (/profile)
- [ ] Usar iconos de lucide-react
- [ ] Instalar: `pnpm add lucide-react`
- [ ] Marcar item activo según ruta actual
- [ ] TypeScript compila sin errores

#### US-021: Crear componente Header
**Priority:** 21
**Description:** Header para dashboard con logo y user menu.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/components/layout/Header.tsx`
- [ ] Logo "Tap In" a la izquierda
- [ ] Menú de usuario a la derecha (avatar, dropdown con logout)
- [ ] Integrar en Dashboard layout
- [ ] TypeScript compila sin errores

---

### FASE 4: Auth Screens

#### US-022: Crear página Landing/Redirect
**Priority:** 22
**Description:** Página inicial que redirige según estado de auth.
**Acceptance Criteria:**
- [ ] Editar `apps/web/src/app/page.tsx`
- [ ] Si autenticado: redirect a /(dashboard)
- [ ] Si no autenticado: mostrar landing simple con botón "Iniciar Sesión"
- [ ] Usar useAuthStore para verificar estado
- [ ] TypeScript compila sin errores

#### US-023: Migrar página Login
**Priority:** 23
**Description:** Página de inicio de sesión.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(auth)/login/page.tsx`
- [ ] Referencia: `apps/mobile/app/login.tsx`
- [ ] Formulario: email, password
- [ ] Validación: email requerido y válido, password requerido
- [ ] Usar authStore.login()
- [ ] Mostrar errores de API
- [ ] Links: "Crear cuenta" -> /register, "Olvidé mi contraseña" -> /forgot-password
- [ ] Redirigir a / después de login exitoso
- [ ] TypeScript compila sin errores

#### US-024: Migrar Register Step 1 (Relación)
**Priority:** 24
**Description:** Paso 1 del registro: seleccionar relación con estudiante.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(auth)/register/page.tsx`
- [ ] Referencia: `apps/mobile/app/register/index.tsx`
- [ ] Opciones: Padre, Madre, Apoderado, Otro
- [ ] Guardar en registerStore
- [ ] Botón "Continuar" -> /register/step2
- [ ] Link "Ya tengo cuenta" -> /login
- [ ] Progress indicator (paso 1 de 5)
- [ ] TypeScript compila sin errores

#### US-025: Migrar Register Step 2 (Email)
**Priority:** 25
**Description:** Paso 2: ingresar email.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(auth)/register/step2/page.tsx`
- [ ] Referencia: `apps/mobile/app/register/step2.tsx`
- [ ] Input email con validación
- [ ] Guardar en registerStore
- [ ] Botón "Continuar" -> /register/step3
- [ ] Botón "Atrás" -> /register
- [ ] Progress indicator (paso 2 de 5)
- [ ] TypeScript compila sin errores

#### US-026: Migrar Register Step 3 (Password)
**Priority:** 26
**Description:** Paso 3: crear contraseña.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(auth)/register/step3/page.tsx`
- [ ] Referencia: `apps/mobile/app/register/step3.tsx`
- [ ] Input password con toggle mostrar/ocultar
- [ ] Input confirmar password
- [ ] Validación: mínimo 8 caracteres, passwords coinciden
- [ ] Guardar en registerStore
- [ ] Botón "Continuar" -> /register/step4
- [ ] TypeScript compila sin errores

#### US-027: Migrar Register Step 4 (Datos personales)
**Priority:** 27
**Description:** Paso 4: nombre y apellido.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(auth)/register/step4/page.tsx`
- [ ] Referencia: `apps/mobile/app/register/step4.tsx`
- [ ] Inputs: firstName, lastName
- [ ] Checkbox aceptar términos
- [ ] Guardar en registerStore
- [ ] Botón "Continuar" -> /register/step5
- [ ] TypeScript compila sin errores

#### US-028: Migrar Register Step 5 (Seleccionar colegio)
**Priority:** 28
**Description:** Paso 5: buscar y seleccionar colegio.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(auth)/register/step5/page.tsx`
- [ ] Referencia: `apps/mobile/app/register/step5.tsx`
- [ ] Input búsqueda de colegio (debounce)
- [ ] Lista de colegios encontrados
- [ ] Seleccionar colegio
- [ ] Botón "Crear cuenta" -> ejecutar authStore.register()
- [ ] Mostrar loading y errores
- [ ] Redirigir a / después de registro exitoso
- [ ] TypeScript compila sin errores

#### US-029: Migrar Forgot Password
**Priority:** 29
**Description:** Página para recuperar contraseña.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(auth)/forgot-password/page.tsx`
- [ ] Referencia: `apps/mobile/app/forgot-password.tsx`
- [ ] Input email
- [ ] Botón "Enviar instrucciones"
- [ ] Llamar apiService.forgotPassword()
- [ ] Mostrar mensaje de éxito o error
- [ ] Link "Volver al login" -> /login
- [ ] TypeScript compila sin errores

#### US-030: Migrar Reset Password
**Priority:** 30
**Description:** Página para restablecer contraseña con token.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(auth)/reset-password/page.tsx`
- [ ] Referencia: `apps/mobile/app/reset-password.tsx`
- [ ] Leer token de query params
- [ ] Inputs: nueva contraseña, confirmar contraseña
- [ ] Validar token con apiService.verifyResetToken()
- [ ] Llamar apiService.resetPassword() al enviar
- [ ] Redirigir a /login después de éxito
- [ ] TypeScript compila sin errores

---

### FASE 5: Main Dashboard Screens

#### US-031: Migrar Home/Dashboard
**Priority:** 31
**Description:** Página principal con estudiantes y saldo.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(dashboard)/page.tsx`
- [ ] Referencia: `apps/mobile/app/(tabs)/index.tsx`
- [ ] Cargar estudiantes con apiService.getStudents()
- [ ] Selector de estudiante (si tiene múltiples)
- [ ] Mostrar saldo del estudiante seleccionado (apiService.getWallet)
- [ ] Card de tickets disponibles
- [ ] Acciones rápidas: Recargar, Ver historial, Agregar estudiante
- [ ] Estado de loading y error
- [ ] TypeScript compila sin errores

#### US-032: Migrar Cafetería
**Priority:** 32
**Description:** Página de menú de cafetería.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(dashboard)/cafeteria/page.tsx`
- [ ] Referencia: `apps/mobile/app/(tabs)/cafeteria.tsx`
- [ ] Selector de semana (anterior, actual, siguiente)
- [ ] Tabs de días de la semana
- [ ] Mostrar menú del día seleccionado (apiService.getMenuByDay o getMenuByDate)
- [ ] Selector de estudiante
- [ ] Mostrar items del menú con precios
- [ ] Estado de loading y error
- [ ] TypeScript compila sin errores

#### US-033: Migrar Historial
**Priority:** 33
**Description:** Página de historial de transacciones.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(dashboard)/history/page.tsx`
- [ ] Referencia: `apps/mobile/app/(tabs)/history.tsx`
- [ ] Listar órdenes con apiService.getOrders()
- [ ] Listar consumos de tickets con apiService.getTicketConsumptions()
- [ ] Filtro por estudiante
- [ ] Filtro por mes/fecha
- [ ] Mostrar fecha, tipo, monto, items
- [ ] Paginación o scroll infinito
- [ ] TypeScript compila sin errores

#### US-034: Migrar Perfil
**Priority:** 34
**Description:** Página de perfil del usuario.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(dashboard)/profile/page.tsx`
- [ ] Referencia: `apps/mobile/app/(tabs)/profile.tsx`
- [ ] Mostrar datos del guardian: nombre, email, relación
- [ ] Links a: Editar perfil, Mis estudiantes, Historial de pagos, Estadísticas, Notificaciones, Cupones, Ayuda
- [ ] Botón "Cerrar sesión" -> authStore.logout()
- [ ] TypeScript compila sin errores

---

### FASE 6: Student Management

#### US-035: Migrar Students list
**Priority:** 35
**Description:** Lista de estudiantes del guardian.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(dashboard)/students/page.tsx`
- [ ] Referencia: `apps/mobile/app/students.tsx`
- [ ] Listar estudiantes con apiService.getStudents()
- [ ] Mostrar: foto, nombre, RUT, curso
- [ ] Click en estudiante -> /students/[id]/edit
- [ ] Botón "Agregar estudiante" -> /students/add
- [ ] TypeScript compila sin errores

#### US-036: Migrar Add Student
**Priority:** 36
**Description:** Página para agregar o vincular estudiante.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(dashboard)/students/add/page.tsx`
- [ ] Referencia: `apps/mobile/app/add-student.tsx`
- [ ] Dos flujos: crear nuevo o vincular existente
- [ ] Buscar por RUT (apiService.searchStudentByRut)
- [ ] Si existe: vincular con apiService.linkStudent()
- [ ] Si no existe: formulario para crear con apiService.createStudent()
- [ ] Campos: nombre, apellido, RUT, curso, límite diario
- [ ] Redirigir a /students después de éxito
- [ ] TypeScript compila sin errores

#### US-037: Migrar Edit Student
**Priority:** 37
**Description:** Página para editar estudiante.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(dashboard)/students/[id]/edit/page.tsx`
- [ ] Referencia: `apps/mobile/app/edit-student.tsx`
- [ ] Cargar datos con apiService.getStudent()
- [ ] Formulario editable: nombre, apellido, curso, límite diario
- [ ] Guardar con apiService.updateStudent()
- [ ] Manejar error 409 (concurrent modification)
- [ ] Botón eliminar (con confirmación)
- [ ] TypeScript compila sin errores

---

### FASE 7: Secondary Screens

#### US-038: Migrar Recharge
**Priority:** 38
**Description:** Página de recarga de saldo.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(dashboard)/recharge/page.tsx`
- [ ] Referencia: `apps/mobile/app/recharge.tsx`
- [ ] Selector de estudiante
- [ ] Cargar paquetes de recarga (apiService.getRechargePackages)
- [ ] Seleccionar paquete
- [ ] Iniciar pago (apiService.initPayment)
- [ ] Mostrar link/redirect a pasarela de pago
- [ ] TypeScript compila sin errores

#### US-039: Migrar Wallet History
**Priority:** 39
**Description:** Historial de movimientos de billetera.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(dashboard)/wallet-history/page.tsx`
- [ ] Referencia: `apps/mobile/app/wallet-history.tsx`
- [ ] Selector de estudiante
- [ ] Cargar logs con apiService.getWalletLogs()
- [ ] Mostrar: fecha, tipo (depósito, compra, etc.), monto, balance
- [ ] Colores según tipo (verde depósito, rojo gasto)
- [ ] TypeScript compila sin errores

#### US-040: Migrar Spending Stats
**Priority:** 40
**Description:** Estadísticas de gastos.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(dashboard)/spending-stats/page.tsx`
- [ ] Referencia: `apps/mobile/app/spending-stats.tsx`
- [ ] Selector de estudiante
- [ ] Selector de período (diario, semanal, mensual)
- [ ] Cargar stats con apiService.getWalletStats()
- [ ] Mostrar total gastado, promedio, desglose por categoría
- [ ] TypeScript compila sin errores

#### US-041: Migrar Payment History
**Priority:** 41
**Description:** Historial de pagos/recargas.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(dashboard)/payment-history/page.tsx`
- [ ] Referencia: `apps/mobile/app/payment-history.tsx`
- [ ] Cargar pagos con apiService.getPayments()
- [ ] Mostrar: fecha, monto, estado, método de pago
- [ ] Badge de estado (aprobado, pendiente, rechazado)
- [ ] TypeScript compila sin errores

#### US-042: Migrar Edit Profile
**Priority:** 42
**Description:** Editar perfil del guardian.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(dashboard)/profile/edit/page.tsx`
- [ ] Referencia: `apps/mobile/app/edit-profile.tsx`
- [ ] Cargar datos con apiService.getGuardianProfile()
- [ ] Formulario: firstName, lastName, phone
- [ ] Guardar con apiService.updateGuardianProfile()
- [ ] Redirigir a /profile después de éxito
- [ ] TypeScript compila sin errores

#### US-043: Migrar Notifications
**Priority:** 43
**Description:** Centro de notificaciones.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(dashboard)/notifications/page.tsx`
- [ ] Referencia: `apps/mobile/app/notifications.tsx`
- [ ] Cargar notificaciones con apiService.getNotifications()
- [ ] Mostrar lista con título, mensaje, fecha
- [ ] Marcar como leída al hacer click (apiService.markNotificationRead)
- [ ] Botón "Marcar todas como leídas"
- [ ] Badge de no leídas
- [ ] TypeScript compila sin errores

#### US-044: Migrar Coupons
**Priority:** 44
**Description:** Página de cupones disponibles.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(dashboard)/coupons/page.tsx`
- [ ] Referencia: `apps/mobile/app/coupons.tsx`
- [ ] Mostrar lista de cupones (si hay endpoint)
- [ ] Si no hay endpoint: mostrar mensaje "Próximamente"
- [ ] TypeScript compila sin errores

#### US-045: Migrar Help
**Priority:** 45
**Description:** Página de ayuda y soporte.
**Acceptance Criteria:**
- [ ] Crear `apps/web/src/app/(dashboard)/help/page.tsx`
- [ ] Referencia: `apps/mobile/app/help.tsx`
- [ ] FAQ o información de contacto
- [ ] Link a email de soporte
- [ ] TypeScript compila sin errores

---

## Technical Considerations

### Mapeo React Native → React
| React Native | React/Next.js |
|--------------|---------------|
| View | div |
| Text | p, span, h1-h6 |
| TouchableOpacity | button |
| TextInput | input |
| Image | next/image |
| ScrollView | div con overflow-y-auto |
| StyleSheet | Tailwind classes |

### Quality Checks
```bash
cd apps/web && pnpm tsc --noEmit
cd apps/web && pnpm build
```

## Success Metrics
- Todas las pantallas funcionan igual que en mobile
- PWA instalable en Chrome/Safari
- TypeScript compila sin errores
- Build de producción exitoso
- API calls funcionan con backend existente
