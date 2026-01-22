# Security Fix: Casino Routes - School Filtering

## Problem Summary

Two endpoints in `casino.routes.ts` were not properly filtering data by the operator's school, creating a security vulnerability where operators could access data from other schools.

## Vulnerabilities Fixed

### 1. **GET /api/v1/casino/pending-orders**
- **Before:** Returned ALL pending orders from ALL schools
- **After:** Only returns pending orders from the operator's school
- **Impact:** Medium - Operators could see orders from other schools

### 2. **GET /api/v1/casino/student/:rut**
- **Before:** Returned student information from ANY school
- **After:** Only returns students from the operator's school
- **Impact:** HIGH - Operators could access sensitive student data from other schools

## Changes Made

### File: `packages/api/src/routes/casino.routes.ts`

#### 1. Added Import
```typescript
import { getSchoolAdminSchoolId } from './admin.routes.js';
```

#### 2. Added Helper Function
Created `getOperatorSchoolId()` to determine the school ID for both school_admin and cafeteria_operator roles:

```typescript
async function getOperatorSchoolId(
  userId: string,
  role: string,
  tokenSchoolId?: string
): Promise<string | null> {
  // For school_admin: use token schoolId or fetch from SchoolAdmin table
  if (role === 'school_admin') {
    return tokenSchoolId || await getSchoolAdminSchoolId(userId);
  }

  // For cafeteria_operator: infer from transaction history
  // (workaround until proper CafeteriaOperator table is added)
  if (role === 'cafeteria_operator') {
    const transaction = await prisma.transaction.findFirst({
      where: { validatedBy: userId },
      include: {
        cafeteria: {
          select: { schoolId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (transaction?.cafeteria?.schoolId) {
      return transaction.cafeteria.schoolId;
    }

    return null; // No transactions yet - cannot determine school
  }

  return null;
}
```

#### 3. Fixed GET /pending-orders Endpoint

**Before:**
```typescript
const orders = await prisma.order.findMany({
  where: {
    status: { in: ['pending', 'confirmed', 'preparing', 'ready'] },
    pickupDate: { gte: today },
  },
  // ... no school filtering
});
```

**After:**
```typescript
const user = request.user!;

// Get operator's school ID
const operatorSchoolId = await getOperatorSchoolId(
  user.userId,
  user.role,
  user.schoolId
);

if (!operatorSchoolId) {
  return reply.status(403).send({
    success: false,
    message: 'Operador sin colegio asignado',
  });
}

const orders = await prisma.order.findMany({
  where: {
    status: { in: ['pending', 'confirmed', 'preparing', 'ready'] },
    pickupDate: { gte: today },
    // SECURITY FIX: Filter by operator's school
    cafeteria: {
      schoolId: operatorSchoolId,
    },
  },
  // ...
});
```

#### 4. Fixed GET /student/:rut Endpoint

**Before:**
```typescript
const student = await prisma.student.findFirst({
  where: {
    OR: [
      { rut: normalizedRut },
      { rut: rutWithHyphen },
      { rut: rut },
    ],
    active: true,
    // NO school filtering - SECURITY ISSUE!
  },
  // ...
});
```

**After:**
```typescript
const user = request.user!;

// Get operator's school ID
const operatorSchoolId = await getOperatorSchoolId(
  user.userId,
  user.role,
  user.schoolId
);

if (!operatorSchoolId) {
  return reply.status(403).send({
    success: false,
    message: 'Operador sin colegio asignado',
  });
}

const student = await prisma.student.findFirst({
  where: {
    OR: [
      { rut: normalizedRut },
      { rut: rutWithHyphen },
      { rut: rut },
    ],
    active: true,
    schoolId: operatorSchoolId, // SECURITY FIX: Only students from operator's school
  },
  // ...
});
```

## Architecture Note: Missing CafeteriaOperator Table

### Current Limitation

The database schema does **NOT** have a `CafeteriaOperator` table that links operators to specific cafeterias/schools. This creates a fundamental security gap:

- `school_admin` users have a `SchoolAdmin` table linking them to a school
- `cafeteria_operator` users are just `User` records with `role='cafeteria_operator'`
- **There is no direct way to know which school an operator belongs to**

### Temporary Workaround

The `getOperatorSchoolId()` function uses a workaround:
1. For operators, it looks at their **transaction history**
2. Finds the most recent transaction they validated
3. Extracts the school from that transaction's cafeteria

**Limitations of this approach:**
- New operators who haven't validated any transactions yet will get a 403 error
- Operators could theoretically work across multiple schools if not properly managed
- No enforcement at the database level

### Recommended Fix (Future)

Add a `CafeteriaOperator` table to the schema:

```prisma
model CafeteriaOperator {
  id          String   @id @default(uuid())
  userId      String   @unique @map("user_id")
  cafeteriaId String   @map("cafeteria_id")

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  cafeteria Cafeteria @relation(fields: [cafeteriaId], references: [id], onDelete: Cascade)

  @@map("cafeteria_operators")
}
```

This would:
- Explicitly link operators to cafeterias
- Allow easy lookup of operator's school via `cafeteria.schoolId`
- Enforce proper access control at the database level
- Enable operators to work at multiple locations if needed

## Testing Recommendations

1. **Test with school_admin:** Should still work as before
2. **Test with new cafeteria_operator:** Verify they get proper 403 error before validating first transaction
3. **Test with existing cafeteria_operator:** Should only see students/orders from their school
4. **Test cross-school access:** Operators should NOT be able to access data from other schools

## Security Impact

- **Before:** HIGH risk - Operators could access all schools' data
- **After:** MEDIUM risk - Operators are restricted to their school
- **Future:** LOW risk - Once CafeteriaOperator table is added

## Files Modified

- `C:\Users\josel\Documents\app-casinos-tapin\packages\api\src\routes\casino.routes.ts`

## Related Issues

- Need to create `CafeteriaOperator` table in schema
- Need to update user creation flow to assign operators to cafeterias
- Need to update authentication to include cafeteriaId in JWT token for operators
