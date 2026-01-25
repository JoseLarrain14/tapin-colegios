/**
 * Script para normalizar todos los RUTs en la base de datos
 *
 * Convierte todos los RUTs al formato estándar: XX.XXX.XXX-X
 *
 * Uso:
 *   npx tsx scripts/normalize-ruts.ts
 *   npx tsx scripts/normalize-ruts.ts --dry-run  (solo muestra cambios sin aplicarlos)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// RUT utilities
function cleanRut(rut: string): string {
  return rut.replace(/[.\-\s]/g, '').toUpperCase();
}

function formatRut(rut: string): string {
  const cleanedRut = cleanRut(rut);
  if (cleanedRut.length < 2) return cleanedRut;

  const body = cleanedRut.slice(0, -1);
  const verificationDigit = cleanedRut.slice(-1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formattedBody}-${verificationDigit}`;
}

interface NormalizationResult {
  id: string;
  originalRut: string;
  normalizedRut: string;
  changed: boolean;
}

async function normalizeRuts(dryRun: boolean = false): Promise<void> {
  console.log('='.repeat(60));
  console.log('Script de Normalización de RUTs');
  console.log('='.repeat(60));
  console.log(`Modo: ${dryRun ? 'DRY RUN (sin cambios)' : 'EJECUCIÓN REAL'}`);
  console.log('');

  try {
    // Get all students
    const students = await prisma.student.findMany({
      select: { id: true, rut: true, firstName: true, lastName: true },
    });

    console.log(`Total de estudiantes encontrados: ${students.length}`);
    console.log('');

    const results: NormalizationResult[] = [];
    const changes: NormalizationResult[] = [];

    for (const student of students) {
      const normalizedRut = formatRut(student.rut);
      const changed = student.rut !== normalizedRut;

      const result: NormalizationResult = {
        id: student.id,
        originalRut: student.rut,
        normalizedRut,
        changed,
      };

      results.push(result);

      if (changed) {
        changes.push(result);
      }
    }

    // Show summary
    console.log('-'.repeat(60));
    console.log('RESUMEN');
    console.log('-'.repeat(60));
    console.log(`Total estudiantes: ${results.length}`);
    console.log(`RUTs ya normalizados: ${results.length - changes.length}`);
    console.log(`RUTs a normalizar: ${changes.length}`);
    console.log('');

    if (changes.length === 0) {
      console.log('No hay RUTs que necesiten normalización.');
      return;
    }

    // Show changes
    console.log('-'.repeat(60));
    console.log('CAMBIOS A REALIZAR');
    console.log('-'.repeat(60));

    for (const change of changes) {
      console.log(`  ${change.originalRut.padEnd(15)} -> ${change.normalizedRut}`);
    }
    console.log('');

    // Apply changes if not dry run
    if (!dryRun) {
      console.log('-'.repeat(60));
      console.log('APLICANDO CAMBIOS...');
      console.log('-'.repeat(60));

      let updated = 0;
      let errors = 0;

      for (const change of changes) {
        try {
          await prisma.student.update({
            where: { id: change.id },
            data: { rut: change.normalizedRut },
          });
          updated++;
          process.stdout.write('.');
        } catch (error) {
          errors++;
          console.error(`\nError actualizando ${change.originalRut}:`, error);
        }
      }

      console.log('');
      console.log('');
      console.log(`Actualizados exitosamente: ${updated}`);
      console.log(`Errores: ${errors}`);
    } else {
      console.log('(Ejecuta sin --dry-run para aplicar los cambios)');
    }

  } catch (error) {
    console.error('Error durante la normalización:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Parse arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Run
normalizeRuts(dryRun)
  .then(() => {
    console.log('');
    console.log('Script finalizado.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
