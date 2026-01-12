import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
