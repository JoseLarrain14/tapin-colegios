# Próximos Pasos - Investigación de Estadísticas de Transacciones

## Resumen del Problema Detectado

Las pruebas automatizadas muestran que la página de transacciones **carga correctamente**, pero las tarjetas de estadísticas muestran valores "..." en lugar de números reales.

---

## Investigación Recomendada

### 1. Verificar Datos en Base de Datos

Primero, revisa si hay transacciones en la base de datos:

```bash
# Conectarse a la base de datos y verificar transacciones
cd packages/api

# Opción 1: Ver todas las transacciones
npx prisma studio

# Opción 2: Query directo
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM WalletTransaction;"
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Ticket WHERE usedAt IS NOT NULL;"
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Payment;"
```

**Acciones según resultado**:

- **Si NO hay datos**: Ejecutar seeders
  ```bash
  npm run db:seed
  # o
  npx prisma db seed
  ```

- **Si HAY datos**: Continuar con el paso 2

---

### 2. Revisar la Implementación de las Estadísticas

Verifica el componente que renderiza las estadísticas:

**Archivo a revisar**: Buscar el componente de transacciones

```bash
# Buscar el archivo de la página de transacciones
find apps/admin -name "*transaction*" -type f
```

**Puntos a verificar**:

1. ¿Se está haciendo fetch de las estadísticas?
2. ¿Hay manejo de estado de loading?
3. ¿Se muestran errores en la consola del navegador?
4. ¿Las queries a la API están funcionando?

---

### 3. Verificar API Endpoints

Prueba los endpoints de la API manualmente:

```bash
# Suponiendo que la API corre en http://localhost:3001 o similar

# Endpoint de estadísticas (ajustar según tu implementación)
curl http://localhost:3001/api/transactions/stats

# Endpoint de transacciones del día
curl http://localhost:3001/api/transactions/today

# Verificar con autenticación si es necesario
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/transactions/stats
```

---

### 4. Revisar Logs del Servidor

Ejecuta el servidor en modo desarrollo y observa los logs:

```bash
cd apps/admin
pnpm dev

# En otra terminal, navega a http://localhost:3000/transactions
# Observa los logs del servidor y de la consola del navegador
```

**Busca**:
- Errores de red (Network tab en DevTools)
- Errores en la consola (Console tab)
- Requests fallidos (Network > XHR/Fetch)
- Warnings de React

---

### 5. Ejecutar Test con DevTools Abierto

Para debugging más detallado:

```bash
cd apps/admin

# Ejecutar test con navegador visible Y pausado
pnpm test:e2e verify-transactions-stats --debug

# Esto abrirá el navegador y pausará la ejecución
# Podrás:
# - Ver la consola del navegador
# - Inspeccionar elementos
# - Ver requests de red
```

---

## Posibles Causas y Soluciones

### Causa 1: No hay datos en la base de datos

**Síntomas**:
- Las queries devuelven arrays vacíos o null
- No hay errores en consola
- La UI muestra "..." o "0"

**Solución**:
```bash
cd packages/api
npx prisma db seed
# Luego recargar la página
```

---

### Causa 2: Error en el fetch de datos

**Síntomas**:
- Errores en la consola del navegador
- Network requests con status 4xx o 5xx
- Loading infinito

**Solución**:
1. Revisar implementación del hook de datos
2. Verificar endpoints de API
3. Agregar manejo de errores

```typescript
// Ejemplo de manejo de errores mejorado
const { data, isLoading, error } = useTransactionStats();

if (error) {
  console.error('Error loading stats:', error);
  return <ErrorMessage message={error.message} />;
}

if (isLoading) {
  return <Skeleton />;
}

return <StatsDisplay stats={data} />;
```

---

### Causa 3: Problema con cálculo de estadísticas

**Síntomas**:
- Los datos existen en la DB
- Las queries funcionan
- Pero los valores calculados son incorrectos o undefined

**Solución**:
Revisar la lógica de cálculo en el backend:

```typescript
// Verificar funciones como:
// - getTodayTickets()
// - getTodayRecharges()
// - getTodaySales()
```

---

### Causa 4: Problema de timezone

**Síntomas**:
- Hay transacciones en la DB
- Pero no se muestran en "Hoy"
- Las fechas se ven correctas en Prisma Studio

**Solución**:
```typescript
// Asegurar que las comparaciones de fecha usen timezone correcto
const startOfToday = new Date();
startOfToday.setHours(0, 0, 0, 0);

const endOfToday = new Date();
endOfToday.setHours(23, 59, 59, 999);

// Usar en queries
where: {
  createdAt: {
    gte: startOfToday,
    lte: endOfToday,
  }
}
```

---

## Script de Debugging Rápido

Crea este archivo para hacer debugging rápido:

**Archivo**: `packages/api/debug-transactions.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugTransactions() {
  console.log('=== Transaction Debug Info ===\n');

  // 1. Total de transacciones
  const totalTransactions = await prisma.walletTransaction.count();
  console.log(`Total WalletTransactions: ${totalTransactions}`);

  // 2. Tickets usados
  const ticketsUsed = await prisma.ticket.count({
    where: { usedAt: { not: null } }
  });
  console.log(`Tickets usados: ${ticketsUsed}`);

  // 3. Pagos
  const payments = await prisma.payment.count();
  console.log(`Pagos: ${payments}`);

  // 4. Transacciones de hoy
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTransactions = await prisma.walletTransaction.count({
    where: {
      createdAt: { gte: today }
    }
  });
  console.log(`\nTransacciones de hoy: ${todayTransactions}`);

  // 5. Últimas 5 transacciones
  const lastTransactions = await prisma.walletTransaction.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      amount: true,
      createdAt: true,
    }
  });

  console.log('\nÚltimas 5 transacciones:');
  lastTransactions.forEach(t => {
    console.log(`  - ${t.type}: $${t.amount} (${t.createdAt.toISOString()})`);
  });

  await prisma.$disconnect();
}

debugTransactions().catch(console.error);
```

**Ejecutar**:
```bash
cd packages/api
npx ts-node debug-transactions.ts
```

---

## Checklist de Verificación

Marca los items que hayas verificado:

- [ ] La base de datos tiene transacciones
- [ ] El servidor API está corriendo sin errores
- [ ] Los endpoints de estadísticas responden
- [ ] No hay errores en la consola del navegador
- [ ] Los Network requests son exitosos (status 200)
- [ ] Los datos se reciben correctamente del backend
- [ ] El componente React renderiza los datos
- [ ] Las fechas y timezones son correctos
- [ ] El estado de loading se maneja correctamente
- [ ] Los errores se manejan y se muestran al usuario

---

## Información de Contexto

### Archivos Clave del Proyecto

```
apps/admin/
├── e2e/
│   └── verify-transactions-stats.spec.ts  ← Script de prueba
├── src/
│   ├── app/
│   │   └── transactions/
│   │       └── page.tsx                   ← Página de transacciones
│   └── components/
│       └── transactions/                  ← Componentes relacionados

packages/api/
├── prisma/
│   ├── schema.prisma                      ← Esquema de base de datos
│   └── dev.db                             ← Base de datos SQLite
└── src/
    └── routes/
        └── transactions/                  ← Endpoints de API
```

### Modelos Relevantes

Según tu schema de Prisma, probablemente tengas:

```prisma
model WalletTransaction {
  id        String   @id @default(uuid())
  type      String   // "PURCHASE", "RECHARGE", "TICKET_USE", etc.
  amount    Float
  createdAt DateTime @default(now())
  // ... otros campos
}

model Ticket {
  id      String    @id @default(uuid())
  usedAt  DateTime?
  // ... otros campos
}

model Payment {
  id        String   @id @default(uuid())
  amount    Float
  createdAt DateTime @default(now())
  // ... otros campos
}
```

---

## Contacto y Soporte

Si después de seguir estos pasos el problema persiste:

1. Revisa las capturas de pantalla en `screenshots/transactions-04-full-page.png`
2. Revisa los reportes generados:
   - `TRANSACTIONS-TEST-REPORT.md`
   - `VERIFICATION-SUMMARY.md`
3. Comparte los logs del servidor y del navegador
4. Ejecuta el script de debugging y comparte el output

---

## Recursos Adicionales

- [Playwright Documentation](https://playwright.dev/)
- [Prisma Debugging Guide](https://www.prisma.io/docs/guides/debugging)
- [Next.js Debugging](https://nextjs.org/docs/advanced-features/debugging)

---

**Última Actualización**: 19 de enero de 2026
**Generado por**: Claude Code (Test Engineer Agent)
