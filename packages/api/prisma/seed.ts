import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
  console.log('🌱 Seeding database...');

  // Create schools
  const schools = [
    {
      name: 'Colegio San Francisco de Asís',
      code: 'SFA001',
      address: 'Av. Providencia 1234',
      city: 'Santiago',
      region: 'Región Metropolitana',
      phone: '+56 2 2345 6789',
      email: 'contacto@sanfrancisco.cl',
    },
    {
      name: 'Instituto Nacional',
      code: 'IN001',
      address: 'Arturo Prat 33',
      city: 'Santiago',
      region: 'Región Metropolitana',
      phone: '+56 2 2698 8100',
      email: 'contacto@institutonacional.cl',
    },
    {
      name: 'Colegio Alemán de Santiago',
      code: 'CAS001',
      address: 'Nuestra Señora del Rosario 850',
      city: 'Las Condes',
      region: 'Región Metropolitana',
      phone: '+56 2 2339 8300',
      email: 'info@dsstgo.cl',
    },
    {
      name: 'Colegio Santa María de Las Condes',
      code: 'SMLC001',
      address: 'Camino El Alba 11357',
      city: 'Las Condes',
      region: 'Región Metropolitana',
      phone: '+56 2 2339 8500',
      email: 'contacto@santamaria.cl',
    },
    {
      name: 'Liceo Carmela Carvajal',
      code: 'LCC001',
      address: 'Pedro de Valdivia 320',
      city: 'Providencia',
      region: 'Región Metropolitana',
      phone: '+56 2 2235 6700',
      email: 'contacto@carmelacarvajal.cl',
    },
    {
      name: 'Colegio Verbo Divino',
      code: 'CVD001',
      address: 'Av. Padre Hurtado 1155',
      city: 'Las Condes',
      region: 'Región Metropolitana',
      phone: '+56 2 2339 8700',
      email: 'info@verbodivino.cl',
    },
    {
      name: 'Colegio San Ignacio El Bosque',
      code: 'SIEB001',
      address: 'Av. Padre Hurtado 1815',
      city: 'Las Condes',
      region: 'Región Metropolitana',
      phone: '+56 2 2339 8900',
      email: 'contacto@sanignacio.cl',
    },
    {
      name: 'Colegio Los Andes',
      code: 'CLA001',
      address: 'Camino El Alba 11999',
      city: 'Vitacura',
      region: 'Región Metropolitana',
      phone: '+56 2 2339 9100',
      email: 'info@losandes.cl',
    },
    {
      name: 'Colegio Tabancura',
      code: 'CT001',
      address: 'Av. Tabancura 1750',
      city: 'Vitacura',
      region: 'Región Metropolitana',
      phone: '+56 2 2339 9300',
      email: 'contacto@tabancura.cl',
    },
    {
      name: 'Colegio Villa María Academy',
      code: 'VMA001',
      address: 'Av. Vicuña Mackenna 700',
      city: 'La Florida',
      region: 'Región Metropolitana',
      phone: '+56 2 2288 0100',
      email: 'info@villamaria.cl',
    },
  ];

  for (const school of schools) {
    await prisma.school.upsert({
      where: { code: school.code },
      update: school,
      create: school,
    });
    console.log(`✅ Created/Updated school: ${school.name}`);
  }

  // Get first school for admin user
  const firstSchool = await prisma.school.findFirst({ where: { code: 'SFA001' } });

  if (firstSchool) {
    // =========================================================================
    // 1. Super Admin User
    // =========================================================================
    const superAdminPassword = await bcrypt.hash('superadmin123', SALT_ROUNDS);
    const superAdminUser = await prisma.user.upsert({
      where: { email: 'super@tapin.cl' },
      update: {
        passwordHash: superAdminPassword,
        role: 'super_admin',
        active: true,
        emailVerified: true,
      },
      create: {
        email: 'super@tapin.cl',
        passwordHash: superAdminPassword,
        role: 'super_admin',
        active: true,
        emailVerified: true,
      },
    });
    console.log(`✅ Created/Updated super admin user: ${superAdminUser.email}`);

    // =========================================================================
    // 2. School Admin User
    // =========================================================================
    const adminPassword = await bcrypt.hash('admin123', SALT_ROUNDS);
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@colegio.cl' },
      update: {
        passwordHash: adminPassword,
        role: 'school_admin',
        active: true,
        emailVerified: true,
      },
      create: {
        email: 'admin@colegio.cl',
        passwordHash: adminPassword,
        role: 'school_admin',
        active: true,
        emailVerified: true,
      },
    });
    console.log(`✅ Created/Updated admin user: ${adminUser.email}`);

    // Link admin to school
    await prisma.schoolAdmin.upsert({
      where: { userId: adminUser.id },
      update: { schoolId: firstSchool.id },
      create: {
        userId: adminUser.id,
        schoolId: firstSchool.id,
      },
    });
    console.log(`✅ Linked admin to school: ${firstSchool.name}`);

    // =========================================================================
    // 3. Cafeteria Operator User
    // =========================================================================
    const cafeteriaOperatorPassword = await bcrypt.hash('casino123', SALT_ROUNDS);
    const cafeteriaOperatorUser = await prisma.user.upsert({
      where: { email: 'casino@colegio.cl' },
      update: {
        passwordHash: cafeteriaOperatorPassword,
        role: 'cafeteria_operator',
        active: true,
        emailVerified: true,
      },
      create: {
        email: 'casino@colegio.cl',
        passwordHash: cafeteriaOperatorPassword,
        role: 'cafeteria_operator',
        active: true,
        emailVerified: true,
      },
    });
    console.log(`✅ Created/Updated cafeteria operator user: ${cafeteriaOperatorUser.email}`);

    // =========================================================================
    // 4. Guardian User
    // =========================================================================
    const guardianPassword = await bcrypt.hash('apoderado123', SALT_ROUNDS);
    const guardianUser = await prisma.user.upsert({
      where: { email: 'apoderado@test.cl' },
      update: {
        passwordHash: guardianPassword,
        role: 'guardian',
        active: true,
        emailVerified: true,
      },
      create: {
        email: 'apoderado@test.cl',
        passwordHash: guardianPassword,
        role: 'guardian',
        active: true,
        emailVerified: true,
      },
    });
    console.log(`✅ Created/Updated guardian user: ${guardianUser.email}`);

    // Create Guardian profile
    const guardian = await prisma.guardian.upsert({
      where: { userId: guardianUser.id },
      update: {
        firstName: 'Maria',
        lastName: 'Gonzalez',
        phone: '+56912345678',
        rut: '11111111-1',
        relationship: 'mother',
        preferredSchoolId: firstSchool.id,
      },
      create: {
        userId: guardianUser.id,
        firstName: 'Maria',
        lastName: 'Gonzalez',
        phone: '+56912345678',
        rut: '11111111-1',
        relationship: 'mother',
        preferredSchoolId: firstSchool.id,
      },
    });
    console.log(`✅ Created/Updated guardian profile: ${guardian.firstName} ${guardian.lastName}`);

    // =========================================================================
    // Create Cafeteria for testing
    // =========================================================================
    const cafeteria = await prisma.cafeteria.upsert({
      where: { id: 'demo-cafeteria' },
      update: {
        schoolId: firstSchool.id,
        name: 'Cafetería Principal',
        description: 'Cafetería del colegio',
        active: true,
      },
      create: {
        id: 'demo-cafeteria',
        schoolId: firstSchool.id,
        name: 'Cafetería Principal',
        description: 'Cafetería del colegio',
        active: true,
      },
    });
    console.log(`✅ Created/Updated cafeteria: ${cafeteria.name}`);

    // Create sample menu items
    const menuItems = [
      { name: 'Completo', description: 'Hot dog con palta, tomate y mayo', price: 1500, category: 'Comida' },
      { name: 'Sándwich Ave Palta', description: 'Sándwich de ave con palta fresca', price: 2500, category: 'Comida' },
      { name: 'Jugo Natural', description: 'Jugo de fruta natural', price: 1000, category: 'Bebidas' },
      { name: 'Bebida 500ml', description: 'Bebida en lata o botella', price: 800, category: 'Bebidas' },
      { name: 'Galletas', description: 'Paquete de galletas', price: 500, category: 'Snacks' },
    ];

    for (const item of menuItems) {
      await prisma.menuItem.upsert({
        where: { id: `${cafeteria.id}-${item.name.toLowerCase().replace(/\s+/g, '-')}` },
        update: { ...item, cafeteriaId: cafeteria.id },
        create: {
          id: `${cafeteria.id}-${item.name.toLowerCase().replace(/\s+/g, '-')}`,
          cafeteriaId: cafeteria.id,
          ...item,
        },
      });
    }
    console.log(`✅ Created ${menuItems.length} menu items`);

    // Create sample recharge packages
    const packages = [
      { name: 'Recarga $5.000', description: 'Recarga de saldo', price: 5000, type: 'balance' },
      { name: 'Recarga $10.000', description: 'Recarga de saldo', price: 10000, type: 'balance' },
      { name: '10 Almuerzos', description: 'Pack de 10 tickets de almuerzo', price: 15000, type: 'ticket', ticketCount: 10, ticketType: 'lunch' },
    ];

    for (const pkg of packages) {
      await prisma.rechargePackage.upsert({
        where: { id: `${cafeteria.id}-${pkg.name.toLowerCase().replace(/\s+/g, '-')}` },
        update: { ...pkg, cafeteriaId: cafeteria.id },
        create: {
          id: `${cafeteria.id}-${pkg.name.toLowerCase().replace(/\s+/g, '-')}`,
          cafeteriaId: cafeteria.id,
          ...pkg,
        },
      });
    }
    console.log(`✅ Created ${packages.length} recharge packages`);

    // =========================================================================
    // 5. First Test Student (Juan Perez)
    // =========================================================================
    const testStudent1 = await prisma.student.upsert({
      where: { rut: '12345678-9' },
      update: {
        firstName: 'Juan',
        lastName: 'Pérez',
        grade: '8vo Básico',
        section: 'A',
        schoolId: firstSchool.id,
      },
      create: {
        rut: '12345678-9',
        firstName: 'Juan',
        lastName: 'Pérez',
        grade: '8vo Básico',
        section: 'A',
        schoolId: firstSchool.id,
      },
    });
    console.log(`✅ Created/Updated student: ${testStudent1.firstName} ${testStudent1.lastName}`);

    // Create wallet for first student
    const wallet1 = await prisma.wallet.upsert({
      where: { studentId: testStudent1.id },
      update: { balance: 5000 },
      create: {
        studentId: testStudent1.id,
        balance: 5000,
      },
    });
    console.log(`✅ Created wallet for ${testStudent1.firstName} with $5.000 balance`);

    // =========================================================================
    // 6. Second Test Student (Sofia Perez)
    // =========================================================================
    const testStudent2 = await prisma.student.upsert({
      where: { rut: '22222222-2' },
      update: {
        firstName: 'Sofia',
        lastName: 'Perez',
        grade: '5to Basico',
        section: 'B',
        schoolId: firstSchool.id,
      },
      create: {
        rut: '22222222-2',
        firstName: 'Sofia',
        lastName: 'Perez',
        grade: '5to Basico',
        section: 'B',
        schoolId: firstSchool.id,
      },
    });
    console.log(`✅ Created/Updated student: ${testStudent2.firstName} ${testStudent2.lastName}`);

    // Create wallet for second student with $10.000
    const wallet2 = await prisma.wallet.upsert({
      where: { studentId: testStudent2.id },
      update: { balance: 10000 },
      create: {
        studentId: testStudent2.id,
        balance: 10000,
      },
    });
    console.log(`✅ Created wallet for ${testStudent2.firstName} with $10.000 balance`);

    // =========================================================================
    // 7. Link Guardian with Students (GuardianStudent)
    // =========================================================================
    // Link guardian with first student (primary)
    await prisma.guardianStudent.upsert({
      where: {
        guardianId_studentId: {
          guardianId: guardian.id,
          studentId: testStudent1.id,
        },
      },
      update: { isPrimary: true },
      create: {
        guardianId: guardian.id,
        studentId: testStudent1.id,
        isPrimary: true,
      },
    });
    console.log(`✅ Linked guardian ${guardian.firstName} with student ${testStudent1.firstName} (primary)`);

    // Link guardian with second student
    await prisma.guardianStudent.upsert({
      where: {
        guardianId_studentId: {
          guardianId: guardian.id,
          studentId: testStudent2.id,
        },
      },
      update: { isPrimary: false },
      create: {
        guardianId: guardian.id,
        studentId: testStudent2.id,
        isPrimary: false,
      },
    });
    console.log(`✅ Linked guardian ${guardian.firstName} with student ${testStudent2.firstName}`);

    // =========================================================================
    // 8. Sample Transactions
    // =========================================================================
    // Transaction 1: App order (from mobile app)
    const transaction1Id = 'demo-transaction-app-order';
    await prisma.transaction.upsert({
      where: { id: transaction1Id },
      update: {
        walletId: wallet1.id,
        cafeteriaId: cafeteria.id,
        type: 'purchase',
        amount: 2500,
        description: 'Compra desde app - Sándwich Ave Palta',
        items: JSON.stringify([{ name: 'Sándwich Ave Palta', quantity: 1, price: 2500 }]),
        validatedBy: cafeteriaOperatorUser.id,
        validationMethod: 'app_order',
        source: 'app',
      },
      create: {
        id: transaction1Id,
        walletId: wallet1.id,
        cafeteriaId: cafeteria.id,
        type: 'purchase',
        amount: 2500,
        description: 'Compra desde app - Sándwich Ave Palta',
        items: JSON.stringify([{ name: 'Sándwich Ave Palta', quantity: 1, price: 2500 }]),
        validatedBy: cafeteriaOperatorUser.id,
        validationMethod: 'app_order',
        source: 'app',
      },
    });
    console.log(`✅ Created transaction 1: App order (source=app, validationMethod=app_order)`);

    // Transaction 2: Casino RUT search
    const transaction2Id = 'demo-transaction-rut-search';
    await prisma.transaction.upsert({
      where: { id: transaction2Id },
      update: {
        walletId: wallet2.id,
        cafeteriaId: cafeteria.id,
        type: 'purchase',
        amount: 1500,
        description: 'Compra en casino - Completo',
        items: JSON.stringify([{ name: 'Completo', quantity: 1, price: 1500 }]),
        validatedBy: cafeteriaOperatorUser.id,
        validationMethod: 'rut_search',
        source: 'casino',
      },
      create: {
        id: transaction2Id,
        walletId: wallet2.id,
        cafeteriaId: cafeteria.id,
        type: 'purchase',
        amount: 1500,
        description: 'Compra en casino - Completo',
        items: JSON.stringify([{ name: 'Completo', quantity: 1, price: 1500 }]),
        validatedBy: cafeteriaOperatorUser.id,
        validationMethod: 'rut_search',
        source: 'casino',
      },
    });
    console.log(`✅ Created transaction 2: Casino purchase (source=casino, validationMethod=rut_search)`);

    // Create wallet logs for the transactions
    await prisma.walletLog.upsert({
      where: { id: 'demo-wallet-log-1' },
      update: {
        walletId: wallet1.id,
        type: 'purchase',
        amount: -2500,
        balanceBefore: 7500,
        balanceAfter: 5000,
        referenceId: transaction1Id,
        description: 'Compra desde app - Sándwich Ave Palta',
      },
      create: {
        id: 'demo-wallet-log-1',
        walletId: wallet1.id,
        type: 'purchase',
        amount: -2500,
        balanceBefore: 7500,
        balanceAfter: 5000,
        referenceId: transaction1Id,
        description: 'Compra desde app - Sándwich Ave Palta',
      },
    });

    await prisma.walletLog.upsert({
      where: { id: 'demo-wallet-log-2' },
      update: {
        walletId: wallet2.id,
        type: 'purchase',
        amount: -1500,
        balanceBefore: 11500,
        balanceAfter: 10000,
        referenceId: transaction2Id,
        description: 'Compra en casino - Completo',
      },
      create: {
        id: 'demo-wallet-log-2',
        walletId: wallet2.id,
        type: 'purchase',
        amount: -1500,
        balanceBefore: 11500,
        balanceAfter: 10000,
        referenceId: transaction2Id,
        description: 'Compra en casino - Completo',
      },
    });
    console.log(`✅ Created wallet logs for transactions`);
  }

  // =========================================================================
  // Print Test Credentials
  // =========================================================================
  console.log('');
  console.log('='.repeat(60));
  console.log('📝 Test credentials:');
  console.log('='.repeat(60));
  console.log('   Super Admin:        super@tapin.cl / superadmin123');
  console.log('   School Admin:       admin@colegio.cl / admin123');
  console.log('   Cafeteria Operator: casino@colegio.cl / casino123');
  console.log('   Guardian (Mobile):  apoderado@test.cl / apoderado123');
  console.log('='.repeat(60));
  console.log('');
  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
