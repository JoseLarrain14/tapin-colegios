# Problemas Corregidos - Admin Panel

## Fecha: 2026-01-18

## Problema Principal: Errores 500 en Archivos Estáticos

### Síntomas
- `webpack.js` - Error 500
- `login/page.js` - Error 500
- `app-pages-internals.js` - Error 500
- `layout.js` - Error 500

### Causa Raíz
**Múltiples instancias del servidor Next.js corriendo simultáneamente** en los puertos 3000, 3001, 3002, 3003.

Esto causaba:
- Conflictos de puerto
- Caché corrupta de Next.js
- Estado inconsistente del servidor
- Errores al servir archivos estáticos

### Solución Aplicada

1. **Identificación de procesos duplicados:**
   ```bash
   netstat -ano | findstr :3000
   netstat -ano | findstr :3001
   netstat -ano | findstr :3002
   netstat -ano | findstr :3003
   ```

   Encontrados PIDs: 27652, 42624, 38140, 36532, 18156

2. **Terminación de procesos:**
   ```bash
   taskkill //F //PID 27652
   taskkill //F //PID 42624
   taskkill //F //PID 38140
   taskkill //F //PID 36532
   taskkill //F //PID 18156
   ```

3. **Limpieza de caché:**
   ```bash
   cd apps/admin
   rm -rf .next
   rm -rf node_modules/.cache
   ```

4. **Reinstalación de dependencias:**
   ```bash
   cd C:/Users/josel/Documents/app-casinos-tapin
   pnpm install
   ```

5. **Inicio limpio del servidor:**
   ```bash
   pnpm --filter @tapin/admin dev
   ```

### Resultado
✅ Servidor Next.js iniciado correctamente en puerto 3000
✅ Ready in 1874ms sin errores
✅ Todos los archivos estáticos sirviéndose correctamente

---

## Problema Secundario: Warning de Viewport en Metadata

### Síntomas
Múltiples warnings durante el build:
```
⚠ Unsupported metadata viewport is configured in metadata export in /.
Please move it to viewport export instead.
```

### Causa
Next.js 14 cambió la forma de exportar la configuración de viewport. Ya no se debe incluir en el objeto `metadata`, sino en una exportación separada `viewport`.

### Solución Aplicada

**Archivo:** `apps/admin/src/app/layout.tsx`

**Antes:**
```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tap In Colegios - Panel de Administración',
  description: 'Plataforma de gestión de cafeterías escolares para apoderados',
  viewport: 'width=device-width, initial-scale=1',
}
```

**Después:**
```typescript
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Tap In Colegios - Panel de Administración',
  description: 'Plataforma de gestión de cafeterías escolares para apoderados',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}
```

### Resultado
✅ Warning eliminado
✅ Build limpio sin errores de viewport

---

## Verificación Final

### Build de Producción
```bash
pnpm run build
```

**Resultados:**
- ✅ Compilación exitosa
- ✅ Linting OK
- ✅ Type checking OK
- ✅ 12 páginas generadas correctamente
- ⚠️ Solo 1 warning menor sobre `<img>` vs `<Image>` (no crítico)

### Estado del Servidor
```
▲ Next.js 14.2.35
- Local:        http://localhost:3000
- Environments: .env.local

✓ Starting...
✓ Ready in 1874ms
```

---

## Archivos Modificados

1. `apps/admin/src/app/layout.tsx`
   - Separación de viewport de metadata
   - Import de tipo Viewport

2. `apps/admin/README.md`
   - Sección de Troubleshooting agregada
   - Comandos actualizados para usar pnpm
   - Documentación de errores comunes

---

## Recomendaciones

### Para Desarrollo

1. **Usar solo una instancia del servidor:**
   ```bash
   # Verificar puertos antes de iniciar
   netstat -ano | findstr :3000

   # Si hay procesos, matarlos primero
   taskkill //F //PID [PID]

   # Luego iniciar limpiamente
   pnpm --filter @tapin/admin dev
   ```

2. **Limpiar caché periódicamente:**
   ```bash
   cd apps/admin
   rm -rf .next
   ```

3. **Usar pnpm en lugar de npm:**
   - El proyecto es un monorepo con pnpm workspace
   - npm puede causar problemas de dependencias

### Para Producción

1. **Configurar PM2 o similar** para gestión de procesos
2. **Implementar health checks** para detectar servidor corrupto
3. **Automatizar limpieza de caché** en CI/CD

---

## Issues Pendientes (No Críticos)

1. **Warning de imagen en students/page.tsx (línea 188):**
   - Usar `<Image>` de Next.js en lugar de `<img>`
   - Beneficios: optimización automática, mejor performance

2. **Implementar páginas faltantes:**
   - Ver checklist en README.md

---

## Logs de Referencia

### Servidor Iniciado Correctamente
```
> @tapin/admin@0.1.0 dev
> next dev

  ▲ Next.js 14.2.35
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 1874ms
```

### Build Exitoso
```
Route (app)                              Size     First Load JS
┌ ○ /                                    2.26 kB          92 kB
├ ○ /_not-found                          871 B          88.2 kB
├ ○ /login                               2.38 kB         113 kB
├ ○ /menu                                4.61 kB         133 kB
...
```

---

## Conclusión

Todos los errores 500 han sido resueltos. El servidor Next.js del admin panel está funcionando correctamente en el puerto 3000 sin errores. Los archivos estáticos se sirven correctamente y el build de producción se completa exitosamente.

**Estado:** ✅ RESUELTO
