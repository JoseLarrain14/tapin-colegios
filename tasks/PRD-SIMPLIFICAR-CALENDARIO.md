# PRD: Simplificación del Calendario de Menús

## Resumen Ejecutivo

El sistema actual de calendario de menús tiene problemas de sincronización entre admin y mobile, funcionalidad innecesaria (carrito, pedidos, filtros de horario), y bugs en la eliminación de platos. Este PRD define los cambios para simplificar el sistema a solo visualización del menú del día.

---

## Problemas Actuales

### 1. Mobile tiene funcionalidad innecesaria
- Sistema de carrito y pedidos que no se necesita
- Filtros de horario (Desayuno, Almuerzo, Once) que confunden
- pickupTime hardcoded a "12:30"
- Verificación de saldo/tickets para compras

### 2. Admin - No se pueden eliminar platos
- El botón X en el calendario no elimina correctamente los platos de un día
- El usuario no puede corregir errores después de asignar platos

### 3. Sincronización confusa
- Lo que se pone en admin no siempre aparece igual en mobile
- Filtros de horario en mobile no corresponden con lo asignado en admin

---

## Solución Propuesta

### Mobile: Convertir a Solo Visualización

**Objetivo:** El tab de cafetería solo muestra el menú del día, sin capacidad de compra.

**UI Final:**
```
┌─────────────────────────────────────┐
│  🍽️ Menú del Día                    │
├─────────────────────────────────────┤
│  [Estudiante: Juan Pérez ▼]         │
├─────────────────────────────────────┤
│  ◀  Semana 20-24 Enero  ▶           │
├─────────────────────────────────────┤
│  [Lun] [Mar] [Mié] [Jue] [Vie]      │
│    20    21    22    23    24       │
├─────────────────────────────────────┤
│                                     │
│  🥪 Sandwich de Pavo                │
│  Con lechuga, tomate y mayonesa     │
│  $3.500                             │
│  [imagen]                           │
│                                     │
│  🍝 Pasta con Salsa                 │
│  Tallarines con salsa bolognesa     │
│  $4.200                             │
│  [imagen]                           │
│                                     │
│  🥤 Jugo Natural                    │
│  Jugo de naranja 350ml              │
│  $1.500                             │
│                                     │
└─────────────────────────────────────┘
```

**Cuando no hay menú:**
```
┌─────────────────────────────────────┐
│                                     │
│  📭 No hay menú disponible          │
│  para este día                      │
│                                     │
└─────────────────────────────────────┘
```

### Admin: Arreglar Eliminación de Platos

**Objetivo:** El botón X en cada plato del calendario debe eliminarlo correctamente.

**Comportamiento esperado:**
1. Click en día del calendario → Abre modal con platos asignados
2. Click en X de un plato → Elimina ese plato de la lista
3. La lista se actualiza inmediatamente en la vista
4. El cambio se guarda en la base de datos

---

## Cambios Técnicos Detallados

### US-200: Simplificar Mobile a Solo Visualización

**Archivo:** `apps/mobile/app/(tabs)/cafeteria.tsx`

**Eliminar estos estados:**
```typescript
// ELIMINAR
const [cart, setCart] = useState<CartItem[]>([]);
const [showCart, setShowCart] = useState(false);
const [comments, setComments] = useState('');
const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
```

**Eliminar estas funciones:**
```typescript
// ELIMINAR
const addToCart = (item: MenuItem) => { ... }
const removeFromCart = (menuItemId: string) => { ... }
const updateQuantity = (menuItemId: string, delta: number) => { ... }
const handleConfirmOrder = async () => { ... }
const calculateTotal = () => { ... }
```

**Eliminar estos componentes UI:**
```typescript
// ELIMINAR - Filtros de horario
<View style={styles.timeSlotContainer}>
  <Text>Horario de retiro:</Text>
  {['Todos', 'Desayuno', 'Almuerzo', 'Once'].map(...)}
</View>

// ELIMINAR - Botón agregar en cada item
<TouchableOpacity onPress={() => addToCart(item)}>
  <Text>+</Text>
</TouchableOpacity>

// ELIMINAR - Vista del carrito completa
{showCart && (
  <View style={styles.cartContainer}>
    ...
  </View>
)}

// ELIMINAR - Botón ver carrito
<TouchableOpacity onPress={() => setShowCart(true)}>
  <Text>Ver Carrito ({cart.length})</Text>
</TouchableOpacity>
```

**Simplificar renderizado de items:**
```typescript
// NUEVO - Solo mostrar info del plato
const renderMenuItem = (item: MenuItem) => (
  <View style={styles.menuItem}>
    {item.imageUrl && (
      <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
    )}
    <View style={styles.itemInfo}>
      <Text style={styles.itemName}>{item.name}</Text>
      {item.description && (
        <Text style={styles.itemDescription}>{item.description}</Text>
      )}
      <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
    </View>
  </View>
);
```

**Agregar mensaje cuando no hay menú:**
```typescript
// NUEVO - Mensaje sin menú
{menuItems.length === 0 && !loading && (
  <View style={styles.emptyState}>
    <Text style={styles.emptyIcon}>📭</Text>
    <Text style={styles.emptyTitle}>No hay menú disponible</Text>
    <Text style={styles.emptySubtitle}>para este día</Text>
  </View>
)}
```

---

### US-201: Arreglar Eliminación de Platos en Admin

**Archivo:** `apps/admin/src/app/(dashboard)/menu/calendar/page.tsx`

**Problema identificado:**
El botón X en los items del calendario puede no estar conectado correctamente a la mutation de actualización.

**Verificar esta función (aproximadamente línea 441-470):**
```typescript
// En handleDragEnd o función similar para eliminar
const handleRemoveItemFromDay = (date: string, itemIdToRemove: string) => {
  const currentAssignment = assignments.find(a => a.date === date);
  if (currentAssignment) {
    const updatedIds = currentAssignment.items
      .map(i => i.menuItemId)
      .filter(id => id !== itemIdToRemove);

    // DEBE llamar a setDateMenuMutation, NO a updatePatternDayMutation
    setDateMenuMutation.mutate({
      date,
      menuItemIds: updatedIds,
      note: currentAssignment.note
    });
  }
};
```

**Asegurar que el botón X llama a la función correcta:**
```typescript
// En el componente que renderiza items del día
<button
  onClick={() => handleRemoveItemFromDay(date, item.menuItemId)}
  className="remove-item-btn"
>
  ✕
</button>
```

---

### US-202: Verificar y Garantizar Sincronización Admin ↔ Mobile

**Objetivo:** Asegurar que lo que el admin asigna en el calendario se muestre correctamente en mobile.

**Archivos involucrados:**
- Admin: `apps/admin/src/app/(dashboard)/menu/calendar/page.tsx`
- Mobile: `apps/mobile/app/(tabs)/cafeteria.tsx`
- API: `packages/api/src/routes/menu-planning.routes.ts`

**Flujo de datos actual:**
```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│     ADMIN       │         │      API        │         │     MOBILE      │
│                 │         │                 │         │                 │
│ Drag plato a    │───────▶ │ PUT /date/{d}   │         │                 │
│ día 20 Enero    │         │ menuItemIds[]   │         │                 │
│                 │         │       │         │         │                 │
│                 │         │       ▼         │         │                 │
│                 │         │ DailyMenu       │         │                 │
│                 │         │ Assignment      │         │ GET /resolve/   │
│                 │         │       │         │◀────────│ 2024-01-20      │
│                 │         │       ▼         │         │       │         │
│                 │         │ Retorna items   │─────────▶│       ▼         │
│                 │         │ del día         │         │ Muestra lista   │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

**Verificaciones a realizar:**

1. **Verificar endpoint resolve funciona:**
   - Admin asigna platos a fecha X
   - GET `/menu-planning/{cafeteriaId}/resolve/{date}` retorna esos platos
   - Response incluye: `source: 'assignment'`, `items: [...]`

2. **Verificar mobile usa endpoint correcto:**
   - Mobile debe llamar a `getMenuByDate(cafeteriaId, dateString, token)`
   - NO debe usar `getMenuByDay` que es por día de semana genérico
   - Verificar en `cafeteria.tsx` que se usa el endpoint correcto

3. **Verificar formato de fecha consistente:**
   - Admin envía fecha como `YYYY-MM-DD`
   - Mobile consulta con mismo formato `YYYY-MM-DD`
   - No debe haber problemas de timezone

4. **Verificar cafeteriaId correcto:**
   - Admin actualmente usa `'demo-cafeteria'` hardcoded
   - Mobile obtiene cafeteriaId del estudiante seleccionado
   - **Posible bug:** Si no coinciden, la sincronización falla

**Código a revisar en mobile (`cafeteria.tsx`):**
```typescript
// VERIFICAR: ¿Se usa getMenuByDate o getMenuByDay?
const loadMenu = async () => {
  const dateStr = getDateString(selectedDay); // YYYY-MM-DD

  // CORRECTO: usa fecha específica
  const response = await apiService.getMenuByDate(
    cafeteriaId,
    dateStr,
    accessToken
  );

  // INCORRECTO: usa día de semana genérico
  // const response = await apiService.getMenuByDay(cafeteriaId, selectedDay, token);
};
```

**Posibles problemas de sincronización:**

| Problema | Síntoma | Solución |
|----------|---------|----------|
| cafeteriaId diferente | Admin guarda en 'demo-cafeteria', mobile lee de otro | Unificar cafeteriaId |
| Formato de fecha | Admin usa Date, mobile usa string | Normalizar a YYYY-MM-DD |
| Endpoint incorrecto | Mobile usa getMenuByDay en vez de getMenuByDate | Cambiar a getMenuByDate |
| Cache no invalidado | Mobile muestra datos viejos | Refrescar al entrar al tab |
| Fallback a pattern | No hay assignment, usa weekly pattern | Verificar que admin creó assignment |

**Acciones de implementación:**

1. Confirmar que mobile usa `getMenuByDate` para fechas específicas
2. Agregar logging temporal para debug de sincronización:
   ```typescript
   console.log('Fetching menu for:', { cafeteriaId, date: dateStr });
   console.log('Response source:', response.data.source);
   console.log('Items count:', response.data.items.length);
   ```
3. Verificar que admin y mobile usan el mismo `cafeteriaId`
4. Agregar pull-to-refresh en mobile para forzar recarga

---

## Criterios de Aceptación

### US-202: Sincronización Admin ↔ Mobile
- [ ] Mobile usa endpoint `/resolve/{date}` para obtener menú
- [ ] Admin y mobile usan el mismo cafeteriaId
- [ ] Platos asignados en admin aparecen en mobile en menos de 5 segundos
- [ ] Platos eliminados en admin desaparecen de mobile al refrescar
- [ ] El campo `source` en response indica 'assignment' cuando hay asignación directa

### US-200: Mobile Solo Visualización
- [ ] No aparecen botones de "+" o "Agregar" en los platos
- [ ] No existe el carrito ni botón de ver carrito
- [ ] No existen filtros de Desayuno/Almuerzo/Once
- [ ] Se muestra lista de platos con: nombre, descripción, precio, imagen
- [ ] Días sin menú muestran "No hay menú disponible"
- [ ] Navegación de semanas funciona correctamente
- [ ] Selector de estudiante funciona correctamente

### US-201: Eliminación de Platos Admin
- [ ] Click en X de un plato lo elimina del día
- [ ] El plato desaparece inmediatamente de la vista
- [ ] El cambio se persiste en la base de datos
- [ ] Al recargar la página, el plato sigue eliminado
- [ ] Se puede eliminar hasta dejar el día vacío

---

## Plan de Verificación

### Test 1: Sincronización Admin → Mobile
1. Abrir admin, ir a Menú > Calendario
2. Arrastrar 3 platos al día Lunes 20 Enero
3. Abrir mobile, seleccionar Lunes 20 Enero
4. **Verificar:** Aparecen los 3 platos con nombre, descripción, precio

### Test 2: Eliminar Plato en Admin
1. En admin calendario, click en Lunes 20 Enero
2. Click en X del primer plato
3. **Verificar:** El plato desaparece
4. Recargar página
5. **Verificar:** El plato sigue sin aparecer
6. Verificar en mobile que solo aparecen 2 platos

### Test 3: Mobile Sin Carrito
1. Abrir mobile, tab Cafetería
2. **Verificar:** NO hay botones de agregar (+)
3. **Verificar:** NO hay botón de carrito
4. **Verificar:** NO hay filtros de horario
5. Solo se ve la lista de platos del día

### Test 4: Día Sin Menú
1. En admin, asegurar que Viernes 24 no tiene menú
2. En mobile, seleccionar Viernes 24
3. **Verificar:** Aparece mensaje "No hay menú disponible para este día"

### Test 5: Sincronización en Tiempo Real
1. Abrir admin en una ventana, mobile en otra (o dispositivo)
2. En admin, arrastrar plato "Pizza" a Martes 21
3. En mobile, seleccionar Martes 21
4. **Verificar:** Aparece "Pizza" inmediatamente (o al refrescar)
5. En admin, eliminar "Pizza" del Martes 21
6. En mobile, refrescar
7. **Verificar:** "Pizza" ya no aparece

### Test 6: Verificar CafeteriaId Consistente
1. En admin, abrir DevTools > Network
2. Arrastrar un plato a un día
3. **Verificar:** Request va a `/menu-planning/demo-cafeteria/date/...`
4. En mobile, abrir logs o debugger
5. Seleccionar el mismo día
6. **Verificar:** Request va al MISMO cafeteriaId
7. Si son diferentes, la sincronización falla

---

## Archivos a Modificar

| Archivo | Tipo de Cambio | User Story |
|---------|----------------|------------|
| `apps/mobile/app/(tabs)/cafeteria.tsx` | Simplificar a solo visualización | US-200 |
| `apps/admin/src/app/(dashboard)/menu/calendar/page.tsx` | Arreglar eliminación de platos | US-201 |
| `apps/mobile/app/(tabs)/cafeteria.tsx` | Verificar uso de getMenuByDate | US-202 |
| `apps/mobile/src/services/api.ts` | Verificar cafeteriaId consistente | US-202 |

## Archivos NO Modificar

- `packages/api/*` - API funciona correctamente
- `packages/api/prisma/schema.prisma` - Esquema está bien
- Otros tabs del mobile - No afectados

---

## Notas para Implementación

1. **Mantener la lógica de carga de menú** - `getMenuByDate` funciona bien
2. **No eliminar el servicio API completo** - Otros features pueden usarlo
3. **Preservar estilos existentes** - Solo remover componentes, no rediseñar
4. **El endpoint resolve funciona** - Admin guarda, mobile lee correctamente
