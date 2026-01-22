import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import multipart from '@fastify/multipart';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { parse as csvParse } from 'csv-parse/sync';
import prisma from '../utils/prisma.js';
import { authService } from '../services/auth.service.js';

// RUT validation functions
function cleanRut(rut: string): string {
  return rut.replace(/[.\-\s]/g, '').toUpperCase();
}

function calculateVerificationDigit(rutNumber: string | number): string {
  const rut = String(rutNumber);
  let sum = 0;
  let multiplier = 2;

  for (let i = rut.length - 1; i >= 0; i--) {
    sum += parseInt(rut[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);

  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
}

function validateRut(rut: string): boolean {
  if (!rut || typeof rut !== 'string') {
    return false;
  }

  const cleanedRut = cleanRut(rut);

  if (cleanedRut.length < 8 || cleanedRut.length > 9) {
    return false;
  }

  const rutNumber = cleanedRut.slice(0, -1);
  const providedDigit = cleanedRut.slice(-1);

  if (!/^\d+$/.test(rutNumber)) {
    return false;
  }

  if (!/^[0-9K]$/.test(providedDigit)) {
    return false;
  }

  const calculatedDigit = calculateVerificationDigit(rutNumber);
  return providedDigit === calculatedDigit;
}

// Extended RUT validation that returns detailed info for better error messages
function validateRutWithDetails(rut: string): { valid: boolean; expectedDigit?: string; message?: string } {
  if (!rut || typeof rut !== 'string') {
    return { valid: false, message: 'RUT es requerido' };
  }

  const cleanedRut = cleanRut(rut);

  if (cleanedRut.length < 8 || cleanedRut.length > 9) {
    return { valid: false, message: 'RUT debe tener entre 8 y 9 caracteres' };
  }

  const rutNumber = cleanedRut.slice(0, -1);
  const providedDigit = cleanedRut.slice(-1);

  if (!/^\d+$/.test(rutNumber)) {
    return { valid: false, message: 'El cuerpo del RUT debe contener solo números' };
  }

  if (!/^[0-9K]$/.test(providedDigit)) {
    return { valid: false, message: 'El dígito verificador debe ser un número o K' };
  }

  const calculatedDigit = calculateVerificationDigit(rutNumber);

  if (providedDigit !== calculatedDigit) {
    return {
      valid: false,
      expectedDigit: calculatedDigit,
      message: `RUT inválido. El dígito verificador correcto es ${calculatedDigit}`
    };
  }

  return { valid: true };
}

function formatRut(rut: string): string {
  const cleanedRut = cleanRut(rut);

  if (cleanedRut.length < 2) {
    return cleanedRut;
  }

  const body = cleanedRut.slice(0, -1);
  const verificationDigit = cleanedRut.slice(-1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formattedBody}-${verificationDigit}`;
}

// Validation schemas
const listStudentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});

const listAdminTransactionsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  type: z.enum(['all', 'ticket', 'purchase', 'deposit', 'refund']).optional(),
  search: z.string().optional(),
});

const createStudentSchema = z.object({
  rut: z.string().min(8, 'RUT debe tener al menos 8 caracteres').superRefine((rut, ctx) => {
    const result = validateRutWithDetails(rut);
    if (!result.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.message || 'RUT inválido',
      });
    }
  }),
  firstName: z.string().min(1, 'Nombre es requerido'),
  lastName: z.string().min(1, 'Apellido es requerido'),
  grade: z.string().optional(),
  section: z.string().optional(),
});

// Helper to verify auth token (exported for use in other routes)
export async function verifyAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send({
      success: false,
      message: 'Token de acceso requerido',
    });
    return null;
  }

  const token = authHeader.substring(7);
  const decoded = authService.verifyAccessToken(token);

  if (!decoded) {
    reply.status(401).send({
      success: false,
      message: 'Token inválido o expirado',
    });
    return null;
  }

  return decoded;
}

// Helper to get school admin's school ID (exported for use in other routes)
export async function getSchoolAdminSchoolId(userId: string): Promise<string | null> {
  const schoolAdmin = await prisma.schoolAdmin.findUnique({
    where: { userId },
    select: { schoolId: true },
  });
  return schoolAdmin?.schoolId || null;
}

// Helper to get school IDs for a guardian's students
async function getGuardianSchoolIds(userId: string): Promise<string[]> {
  const guardian = await prisma.guardian.findUnique({
    where: { userId },
    include: {
      students: {
        include: {
          student: {
            select: { schoolId: true }
          }
        }
      }
    }
  });

  if (!guardian) return [];

  // Get unique school IDs from all students
  const schoolIds = guardian.students.map(gs => gs.student.schoolId);
  return [...new Set(schoolIds)];
}

// Helper to validate cafeteria access by school (exported for use in other routes)
// accessMode: 'write' (default) - only super_admin and school_admin
//             'read' - also allows guardians with students in the school
export async function validateCafeteriaAccess(
  cafeteriaId: string,
  decoded: { userId: string; role: string; schoolId?: string },
  reply: FastifyReply,
  accessMode: 'read' | 'write' = 'write'
): Promise<{ cafeteria: any; schoolId: string } | null> {
  const cafeteria = await prisma.cafeteria.findUnique({
    where: { id: cafeteriaId },
    include: { school: true },
  });

  if (!cafeteria) {
    reply.status(404).send({
      success: false,
      message: 'Cafeteria no encontrada',
    });
    return null;
  }

  // Super admin has access to everything
  if (decoded.role === 'super_admin') {
    return { cafeteria, schoolId: cafeteria.schoolId };
  }

  // School admin: verify school access (read and write)
  if (decoded.role === 'school_admin') {
    const userSchoolId = decoded.schoolId || await getSchoolAdminSchoolId(decoded.userId);
    if (userSchoolId && cafeteria.schoolId === userSchoolId) {
      return { cafeteria, schoolId: userSchoolId };
    }
  }

  // Guardian: verify they have a student in this school (read only)
  if (decoded.role === 'guardian' && accessMode === 'read') {
    const guardianSchoolIds = await getGuardianSchoolIds(decoded.userId);
    if (guardianSchoolIds.includes(cafeteria.schoolId)) {
      return { cafeteria, schoolId: cafeteria.schoolId };
    }
  }

  reply.status(403).send({
    success: false,
    message: 'No tienes acceso a esta cafeteria',
  });
  return null;
}

// Interface for import row
interface ImportRow {
  rut: string;
  firstName: string;
  lastName: string;
  grade?: string;
  section?: string;
}

interface ImportError {
  row: number;
  rut?: string;
  message: string;
}

export async function adminRoutes(app: FastifyInstance) {
  // Register multipart plugin for file uploads
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
  });

  /**
   * GET /api/v1/admin/config
   * Get admin configuration (school, cafeteria)
   */
  app.get('/config', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      if (!['school_admin', 'super_admin'].includes(decoded.role)) {
        return reply.status(403).send({
          success: false,
          message: 'No tienes permisos para acceder a este recurso',
        });
      }

      const schoolId = decoded.schoolId || await getSchoolAdminSchoolId(decoded.userId);

      if (!schoolId) {
        return reply.status(403).send({
          success: false,
          message: 'Administrador sin colegio asignado',
        });
      }

      // Get school with cafeterias
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: {
          id: true,
          name: true,
          code: true,
          cafeterias: {
            where: { active: true },
            select: {
              id: true,
              name: true,
            },
            take: 1,
          },
        },
      });

      if (!school) {
        return reply.status(404).send({
          success: false,
          message: 'Colegio no encontrado',
        });
      }

      const cafeteria = school.cafeterias[0] || null;

      return reply.send({
        success: true,
        data: {
          school: {
            id: school.id,
            name: school.name,
            code: school.code,
          },
          cafeteria: cafeteria,
        },
      });
    } catch (error) {
      console.error('Get admin config error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener configuración',
      });
    }
  });

  /**
   * GET /api/v1/admin/students
   * List all students for admin
   * - school_admin: only students from their school
   * - super_admin: all students (can filter by schoolId)
   */
  app.get('/students', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 1. Verify authentication
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      // 2. Verify role (school_admin or super_admin only)
      if (!['school_admin', 'super_admin'].includes(decoded.role)) {
        return reply.status(403).send({
          success: false,
          message: 'No tienes permisos para acceder a este recurso',
        });
      }

      // 3. Parse query parameters
      const query = listStudentsQuerySchema.parse(request.query);
      const { page, limit, search } = query;
      const skip = (page - 1) * limit;

      // 4. Build where clause based on role
      const where: {
        schoolId?: string;
        OR?: Array<{
          firstName?: { contains: string };
          lastName?: { contains: string };
          rut?: { contains: string };
        }>;
      } = {};

      // For school_admin: only their school
      if (decoded.role === 'school_admin') {
        // Get school ID from SchoolAdmin table
        const schoolId = decoded.schoolId || await getSchoolAdminSchoolId(decoded.userId);

        if (!schoolId) {
          return reply.status(403).send({
            success: false,
            message: 'Administrador sin colegio asignado',
          });
        }
        where.schoolId = schoolId;
      }

      // Apply search filter (name or RUT)
      if (search && search.trim()) {
        const searchTerm = search.trim();
        where.OR = [
          { firstName: { contains: searchTerm } },
          { lastName: { contains: searchTerm } },
          { rut: { contains: searchTerm } },
        ];
      }

      // 5. Query database with pagination
      const [students, total] = await Promise.all([
        prisma.student.findMany({
          where,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            rut: true,
            grade: true,
            section: true,
            photoUrl: true,
            dailyLimit: true,
            active: true,
            createdAt: true,
            school: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            tickets: {
              select: {
                ticketType: true,
                quantity: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: [
            { lastName: 'asc' },
            { firstName: 'asc' },
          ],
        }),
        prisma.student.count({ where }),
      ]);

      // 6. Transform response
      const formattedStudents = students.map((student) => ({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: `${student.firstName} ${student.lastName}`,
        rut: student.rut,
        grade: student.grade,
        section: student.section,
        photoUrl: student.photoUrl,
        dailyLimit: student.dailyLimit,
        active: student.active,
        school: student.school,
        tickets: student.tickets.reduce((acc, t) => {
          acc[t.ticketType] = t.quantity;
          return acc;
        }, {} as Record<string, number>),
        totalTickets: student.tickets.reduce((sum, t) => sum + t.quantity, 0),
        createdAt: student.createdAt,
      }));

      return reply.send({
        success: true,
        data: formattedStudents,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: 'Parámetros inválidos',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      console.error('List admin students error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al listar estudiantes',
      });
    }
  });

  /**
   * POST /api/v1/admin/students
   * Create a new student in admin's school
   * - school_admin: creates in their school
   * - super_admin: must specify schoolId (not implemented yet, uses default)
   */
  app.post('/students', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 1. Verify authentication
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      // 2. Verify role (school_admin or super_admin only)
      if (!['school_admin', 'super_admin'].includes(decoded.role)) {
        return reply.status(403).send({
          success: false,
          message: 'No tienes permisos para crear estudiantes',
        });
      }

      // 3. Get school ID for admin
      const schoolId = decoded.schoolId || await getSchoolAdminSchoolId(decoded.userId);

      if (!schoolId) {
        return reply.status(403).send({
          success: false,
          message: 'Administrador sin colegio asignado',
        });
      }

      // 4. Parse and validate body
      const body = createStudentSchema.parse(request.body);
      const formattedRut = formatRut(body.rut);

      // 5. Check if RUT already exists in this school
      const existingStudent = await prisma.student.findFirst({
        where: {
          rut: formattedRut,
          schoolId,
        },
      });

      if (existingStudent) {
        return reply.status(409).send({
          success: false,
          message: 'Ya existe un estudiante con este RUT en el colegio',
        });
      }

      // 6. Create student with wallet in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create student
        const student = await tx.student.create({
          data: {
            schoolId,
            rut: formattedRut,
            firstName: body.firstName,
            lastName: body.lastName,
            grade: body.grade || null,
            section: body.section || null,
            dailyLimit: 0,
            active: true,
          },
        });

        // Create wallet with 0 balance
        const wallet = await tx.wallet.create({
          data: {
            studentId: student.id,
            balance: 0,
          },
        });

        return { student, wallet };
      });

      // 7. Fetch complete student data
      const student = await prisma.student.findUnique({
        where: { id: result.student.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          rut: true,
          grade: true,
          section: true,
          photoUrl: true,
          dailyLimit: true,
          active: true,
          createdAt: true,
          school: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          wallet: {
            select: {
              id: true,
              balance: true,
            },
          },
        },
      });

      return reply.status(201).send({
        success: true,
        message: 'Estudiante creado exitosamente',
        data: {
          ...student,
          fullName: `${student?.firstName} ${student?.lastName}`,
          balance: student?.wallet?.balance || 0,
          tickets: {},
          totalTickets: 0,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: 'Datos inválidos',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      console.error('Create admin student error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al crear estudiante',
      });
    }
  });

  /**
   * POST /api/v1/admin/students/import
   * Import students from Excel/CSV file
   * Expected columns: RUT, Nombre, Apellido, Curso, Seccion
   */
  app.post('/students/import', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 1. Verify authentication
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      // 2. Verify role (school_admin or super_admin only)
      if (!['school_admin', 'super_admin'].includes(decoded.role)) {
        return reply.status(403).send({
          success: false,
          message: 'No tienes permisos para importar estudiantes',
        });
      }

      // 3. Get school ID for admin
      const schoolId = decoded.schoolId || await getSchoolAdminSchoolId(decoded.userId);

      if (!schoolId) {
        return reply.status(403).send({
          success: false,
          message: 'Administrador sin colegio asignado',
        });
      }

      // 4. Get the uploaded file
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          success: false,
          message: 'No se recibió ningún archivo',
        });
      }

      const filename = data.filename.toLowerCase();
      const buffer = await data.toBuffer();

      // 5. Parse file based on extension
      let rows: ImportRow[] = [];

      if (filename.endsWith('.csv')) {
        // Parse CSV
        const content = buffer.toString('utf-8');
        const records = csvParse(content, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          bom: true,
        }) as Record<string, string>[];

        rows = records.map((record) => ({
          rut: record['RUT'] || record['rut'] || record['Rut'] || '',
          firstName: record['Nombre'] || record['nombre'] || record['NOMBRE'] || record['FirstName'] || '',
          lastName: record['Apellido'] || record['apellido'] || record['APELLIDO'] || record['LastName'] || '',
          grade: record['Curso'] || record['curso'] || record['CURSO'] || record['Grade'] || '',
          section: record['Seccion'] || record['seccion'] || record['SECCION'] || record['Sección'] || record['Section'] || '',
        }));
      } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
        // Parse Excel
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

        rows = jsonData.map((record) => ({
          rut: String(record['RUT'] || record['rut'] || record['Rut'] || ''),
          firstName: String(record['Nombre'] || record['nombre'] || record['NOMBRE'] || record['FirstName'] || ''),
          lastName: String(record['Apellido'] || record['apellido'] || record['APELLIDO'] || record['LastName'] || ''),
          grade: String(record['Curso'] || record['curso'] || record['CURSO'] || record['Grade'] || ''),
          section: String(record['Seccion'] || record['seccion'] || record['SECCION'] || record['Sección'] || record['Section'] || ''),
        }));
      } else {
        return reply.status(400).send({
          success: false,
          message: 'Formato de archivo no soportado. Use CSV o XLSX.',
        });
      }

      if (rows.length === 0) {
        return reply.status(400).send({
          success: false,
          message: 'El archivo está vacío o no tiene el formato esperado',
        });
      }

      // 6. Get existing RUTs in the school
      const existingStudents = await prisma.student.findMany({
        where: { schoolId },
        select: { rut: true },
      });
      const existingRuts = new Set(existingStudents.map((s) => cleanRut(s.rut)));

      // 7. Process rows
      const errors: ImportError[] = [];
      const duplicates: string[] = [];
      const toCreate: ImportRow[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // +2 because row 1 is headers, row 2 is first data

        // Validate required fields
        if (!row.rut || !row.rut.trim()) {
          errors.push({ row: rowNum, message: 'RUT es requerido' });
          continue;
        }

        if (!row.firstName || !row.firstName.trim()) {
          errors.push({ row: rowNum, rut: row.rut, message: 'Nombre es requerido' });
          continue;
        }

        if (!row.lastName || !row.lastName.trim()) {
          errors.push({ row: rowNum, rut: row.rut, message: 'Apellido es requerido' });
          continue;
        }

        // Validate RUT format
        if (!validateRut(row.rut)) {
          errors.push({ row: rowNum, rut: row.rut, message: 'RUT inválido' });
          continue;
        }

        const formattedRut = formatRut(row.rut);
        const cleanedRut = cleanRut(row.rut);

        // Check for duplicates in school
        if (existingRuts.has(cleanedRut)) {
          duplicates.push(formattedRut);
          continue;
        }

        // Check for duplicates in the import file
        const isDuplicateInFile = toCreate.some((r) => cleanRut(r.rut) === cleanedRut);
        if (isDuplicateInFile) {
          errors.push({ row: rowNum, rut: row.rut, message: 'RUT duplicado en el archivo' });
          continue;
        }

        // Add to create list
        toCreate.push({
          rut: formattedRut,
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          grade: row.grade?.trim() || undefined,
          section: row.section?.trim() || undefined,
        });
      }

      // 8. Create students in batch transaction
      let created = 0;

      if (toCreate.length > 0) {
        await prisma.$transaction(async (tx) => {
          for (const student of toCreate) {
            // Create student
            const newStudent = await tx.student.create({
              data: {
                schoolId,
                rut: student.rut,
                firstName: student.firstName,
                lastName: student.lastName,
                grade: student.grade || null,
                section: student.section || null,
                dailyLimit: 0,
                active: true,
              },
            });

            // Create wallet
            await tx.wallet.create({
              data: {
                studentId: newStudent.id,
                balance: 0,
              },
            });

            created++;
          }
        });
      }

      // 9. Return summary
      return reply.send({
        success: true,
        message: `Importación completada: ${created} estudiantes creados`,
        data: {
          total: rows.length,
          created,
          duplicates: duplicates.length,
          errors: errors.length,
          duplicateRuts: duplicates,
          errorDetails: errors,
        },
      });
    } catch (error) {
      console.error('Import students error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al importar estudiantes',
      });
    }
  });

  /**
   * GET /api/v1/admin/transactions
   * Get unified transactions list (Transaction + WalletLog + Payment)
   * Combines all transaction types into a single normalized response
   */
  app.get('/transactions', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 1. Verify authentication
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      // 2. Verify role (school_admin or super_admin only)
      if (!['school_admin', 'super_admin'].includes(decoded.role)) {
        return reply.status(403).send({
          success: false,
          message: 'No tienes permisos para acceder a este recurso',
        });
      }

      // 3. Get school ID for admin
      const schoolId = decoded.schoolId || await getSchoolAdminSchoolId(decoded.userId);

      if (!schoolId) {
        return reply.status(403).send({
          success: false,
          message: 'Administrador sin colegio asignado',
        });
      }

      // 4. Parse query parameters
      const query = listAdminTransactionsSchema.parse(request.query);
      const { page, limit, dateFrom, dateTo, type, search } = query;

      // 5. Build date filters
      const dateFilter: { gte?: Date; lte?: Date } = {};
      if (dateFrom) {
        dateFilter.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.lte = endDate;
      }

      // 6. Query transactions from Transaction table
      // Handle special filtering for 'ticket' and 'purchase' types:
      // - 'ticket': filter by ticketsUsed IS NOT NULL (tickets are stored as purchase with ticketsUsed)
      // - 'purchase': filter by type='purchase' AND ticketsUsed IS NULL (direct sales only)
      const transactionTypeFilter = (() => {
        if (!type || type === 'all' || type === 'deposit') return {};
        if (type === 'ticket') return { ticketsUsed: { not: null } };
        if (type === 'purchase') return { type: 'purchase', ticketsUsed: null };
        return { type };
      })();

      // Build search filter for Prisma queries (search by student name or RUT)
      const searchFilter = search?.trim() ? {
        student: {
          OR: [
            { firstName: { contains: search.trim(), mode: 'insensitive' as const } },
            { lastName: { contains: search.trim(), mode: 'insensitive' as const } },
            { rut: { contains: search.trim() } },
          ],
        },
      } : {};

      const transactions = await prisma.transaction.findMany({
        where: {
          cafeteria: { schoolId },
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
          ...transactionTypeFilter,
          ...(search?.trim() && { wallet: searchFilter }),
        },
        include: {
          wallet: {
            include: {
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  rut: true,
                  grade: true,
                },
              },
            },
          },
          validator: {
            select: {
              id: true,
              email: true,
              guardian: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // 7. Query wallet logs (deposits, refunds, adjustments)
      // Skip WalletLog query entirely when filtering for 'ticket' or 'purchase' (those are only in Transaction table)
      const walletLogs = (type === 'ticket' || type === 'purchase') ? [] : await prisma.walletLog.findMany({
        where: {
          wallet: {
            student: { schoolId },
            ...searchFilter,
          },
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
          ...(type && type !== 'all' && { type }),
        },
        include: {
          wallet: {
            include: {
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  rut: true,
                  grade: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // 8. Query payments (recharges)
      // Build search filter for payments (directly on student, not nested in wallet)
      const paymentSearchFilter = search?.trim() ? {
        OR: [
          { firstName: { contains: search.trim(), mode: 'insensitive' as const } },
          { lastName: { contains: search.trim(), mode: 'insensitive' as const } },
          { rut: { contains: search.trim() } },
        ],
      } : {};

      // Skip Payment query when filtering for 'ticket', 'purchase', or 'refund' (payments are only deposits)
      const payments = (type === 'ticket' || type === 'purchase' || type === 'refund') ? [] : await prisma.payment.findMany({
        where: {
          student: {
            schoolId,
            ...paymentSearchFilter,
          },
          status: 'completed',
          ...(Object.keys(dateFilter).length > 0 && { completedAt: dateFilter }),
        },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              rut: true,
              grade: true,
            },
          },
          guardian: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          rechargePackage: {
            select: {
              name: true,
              type: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
      });

      // 8.1. Create Set of Payment IDs that already have a WalletLog reference (to avoid duplicates)
      const walletLogPaymentIds = new Set(
        walletLogs
          .filter(log => log.type === 'deposit' && log.referenceId)
          .map(log => log.referenceId)
      );

      // 8.2. Create Map of Payments for quick lookup when enriching WalletLogs
      const paymentsMap = new Map(payments.map(p => [p.id, p]));

      // 9. Normalize all transactions into a unified format
      interface UnifiedTransaction {
        id: string;
        date: Date;
        type: string;
        amount: number;
        description: string;
        studentName: string;
        studentRut: string;
        studentGrade: string | null;
        method: string | null;
        operatorName: string | null;
        source: string;
      }

      const normalizedTransactions: UnifiedTransaction[] = [];

      // Add Transaction records (search is now handled at Prisma query level)
      for (const tx of transactions) {
        if (!tx.wallet.student) continue;

        const student = tx.wallet.student;
        const studentName = `${student.firstName} ${student.lastName}`;

        // Determine if this is a ticket consumption or a direct purchase
        const isTicketConsumption = tx.ticketsUsed !== null;
        const normalizedType = isTicketConsumption ? 'ticket' : tx.type;

        normalizedTransactions.push({
          id: tx.id,
          date: tx.createdAt,
          type: normalizedType,
          amount: tx.amount,
          description: tx.description || `${isTicketConsumption ? 'Consumo de ticket' : tx.type === 'purchase' ? 'Compra directa' : tx.type === 'refund' ? 'Devolución' : 'Ajuste'} en casino`,
          studentName,
          studentRut: student.rut,
          studentGrade: student.grade,
          method: tx.validationMethod || null,
          operatorName: tx.validator?.guardian
            ? `${tx.validator.guardian.firstName} ${tx.validator.guardian.lastName}`
            : tx.validator?.email || null,
          source: tx.source,
        });
      }

      // Add WalletLog records (search is now handled at Prisma query level)
      for (const log of walletLogs) {
        if (!log.wallet.student) continue;

        const student = log.wallet.student;
        const studentName = `${student.firstName} ${student.lastName}`;

        // Look up related Payment if this WalletLog has a referenceId
        const relatedPayment = log.referenceId ? paymentsMap.get(log.referenceId) : null;

        normalizedTransactions.push({
          id: log.id,
          date: log.createdAt,
          type: log.type,
          amount: log.amount,
          description: log.description || `${log.type === 'deposit' ? 'Depósito' : log.type === 'refund' ? 'Devolución' : 'Ajuste'} en billetera`,
          studentName,
          studentRut: student.rut,
          studentGrade: student.grade,
          method: null,
          operatorName: relatedPayment?.guardian
            ? `${relatedPayment.guardian.firstName} ${relatedPayment.guardian.lastName}`
            : null,
          source: 'wallet',
        });
      }

      // Add Payment records (search is now handled at Prisma query level)
      // Skip Payments that already have a WalletLog reference to avoid duplicates
      for (const payment of payments) {
        // Skip if this Payment already has a WalletLog associated with it
        if (walletLogPaymentIds.has(payment.id)) {
          continue;
        }

        const student = payment.student;
        const studentName = `${student.firstName} ${student.lastName}`;

        const packageInfo = payment.rechargePackage
          ? ` - ${payment.rechargePackage.name}`
          : '';

        normalizedTransactions.push({
          id: payment.id,
          date: payment.completedAt || payment.createdAt,
          type: 'deposit',
          amount: payment.amount,
          description: `Pago ${payment.gateway}${packageInfo}`,
          studentName,
          studentRut: student.rut,
          studentGrade: student.grade,
          method: null,
          operatorName: payment.guardian
            ? `${payment.guardian.firstName} ${payment.guardian.lastName}`
            : null,
          source: 'payment',
        });
      }

      // 10. Sort all transactions by date (most recent first)
      normalizedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());

      // 11. Apply pagination
      const total = normalizedTransactions.length;
      const skip = (page - 1) * limit;
      const paginatedTransactions = normalizedTransactions.slice(skip, skip + limit);

      // 12. Return response
      return reply.send({
        success: true,
        data: paginatedTransactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: 'Parámetros inválidos',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      console.error('List admin transactions error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al listar transacciones',
      });
    }
  });

  /**
   * GET /api/v1/admin/transactions/stats
   * Get transaction statistics for a date range
   * - school_admin: stats for their school only
   * - super_admin: stats for all schools
   * Query params: dateFrom, dateTo (optional, defaults to today)
   */
  app.get('/transactions/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 1. Verify authentication
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      // 2. Verify role (school_admin or super_admin only)
      if (!['school_admin', 'super_admin'].includes(decoded.role)) {
        return reply.status(403).send({
          success: false,
          message: 'No tienes permisos para acceder a este recurso',
        });
      }

      // 3. Parse query parameters for date range
      const query = request.query as { dateFrom?: string; dateTo?: string };

      // Parse dates in UTC to avoid timezone issues
      // When no date is provided, use today in UTC
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD" in UTC

      const dateFromStr = query.dateFrom || todayStr;
      const dateToStr = query.dateTo || todayStr;

      // Create dates at start and end of day in UTC
      const dateFrom = new Date(`${dateFromStr}T00:00:00.000Z`);
      const dateTo = new Date(`${dateToStr}T23:59:59.999Z`);

      // 4. Determine school filter
      let schoolId: string | null = null;
      if (decoded.role === 'school_admin') {
        schoolId = decoded.schoolId || await getSchoolAdminSchoolId(decoded.userId);

        if (!schoolId) {
          return reply.status(403).send({
            success: false,
            message: 'Administrador sin colegio asignado',
          });
        }
      }

      // 5. Build queries for statistics

      // Tickets Consumed: Count Transaction where ticketsUsed IS NOT NULL
      const ticketsConsumed = await prisma.transaction.count({
        where: {
          createdAt: { gte: dateFrom, lte: dateTo },
          ticketsUsed: { not: null },
          ...(schoolId && { cafeteria: { schoolId } }),
        },
      });

      // Total Sales: Sum Transaction.amount where type='purchase'
      // Exclude ticket consumptions (ticketsUsed IS NOT NULL) - only count direct sales
      const salesData = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          createdAt: { gte: dateFrom, lte: dateTo },
          type: 'purchase',
          ticketsUsed: null,
          ...(schoolId && { cafeteria: { schoolId } }),
        },
      });
      const totalSales = salesData._sum.amount || 0;

      // Total Recharges: Sum Payment.amount where status='completed'
      // Use completedAt instead of createdAt to count payments by completion date
      const rechargesData = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          completedAt: { gte: dateFrom, lte: dateTo },
          status: 'completed',
          ...(schoolId && {
            student: { schoolId }
          }),
        },
      });
      const totalRecharges = rechargesData._sum.amount || 0;

      // Transaction Count: Total of Transaction + WalletLog
      const transactionCount = await prisma.transaction.count({
        where: {
          createdAt: { gte: dateFrom, lte: dateTo },
          ...(schoolId && { cafeteria: { schoolId } }),
        },
      });

      const walletLogCount = await prisma.walletLog.count({
        where: {
          createdAt: { gte: dateFrom, lte: dateTo },
          ...(schoolId && { wallet: { student: { schoolId } } }),
        },
      });

      const totalTransactionCount = transactionCount + walletLogCount;

      // Count para tab "Ventas" (purchases sin tickets)
      const salesCount = await prisma.transaction.count({
        where: {
          createdAt: { gte: dateFrom, lte: dateTo },
          type: 'purchase',
          ticketsUsed: null,
          ...(schoolId && { cafeteria: { schoolId } }),
        },
      });

      // Count para tab "Recargas" (deposits)
      const rechargesCount = await prisma.walletLog.count({
        where: {
          createdAt: { gte: dateFrom, lte: dateTo },
          type: 'deposit',
          ...(schoolId && { wallet: { student: { schoolId } } }),
        },
      });

      // 6. Return statistics
      return reply.send({
        success: true,
        data: {
          ticketsConsumed,
          totalSales,
          totalRecharges,
          transactionCount: totalTransactionCount,
          salesCount,
          rechargesCount,
        },
      });
    } catch (error) {
      console.error('Get transaction stats error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener estadísticas',
      });
    }
  });

  /**
   * GET /api/v1/admin/transactions/export
   * Export transactions to CSV format
   */
  app.get('/transactions/export', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 1. Verify authentication
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      // 2. Verify role
      if (!['school_admin', 'super_admin'].includes(decoded.role)) {
        return reply.status(403).send({
          success: false,
          message: 'No tienes permisos para exportar transacciones',
        });
      }

      // 3. Get school ID
      const schoolId = decoded.schoolId || await getSchoolAdminSchoolId(decoded.userId);
      if (!schoolId) {
        return reply.status(403).send({
          success: false,
          message: 'Administrador sin colegio asignado',
        });
      }

      // 4. Parse query parameters
      const query = request.query as { dateFrom?: string; dateTo?: string; type?: string; search?: string };

      // Build date filters
      const dateFilter: { gte?: Date; lte?: Date } = {};
      if (query.dateFrom) {
        dateFilter.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        const endDate = new Date(query.dateTo);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.lte = endDate;
      }

      // 5. Query transactions (limit 10000)
      // Handle special filtering for 'ticket' and 'purchase' types (same as list endpoint)
      const exportTypeFilter = (() => {
        if (!query.type || query.type === 'all') return {};
        if (query.type === 'ticket') return { ticketsUsed: { not: null } };
        if (query.type === 'purchase') return { type: 'purchase', ticketsUsed: null };
        return { type: query.type };
      })();

      const transactions = await prisma.transaction.findMany({
        where: {
          cafeteria: { schoolId },
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
          ...exportTypeFilter,
        },
        include: {
          wallet: {
            include: {
              student: {
                select: {
                  firstName: true,
                  lastName: true,
                  rut: true,
                  grade: true,
                },
              },
            },
          },
          validator: {
            select: {
              email: true,
              guardian: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10000,
      });

      // 6. Filter by search if provided
      let filteredTransactions = transactions;
      if (query.search && query.search.trim()) {
        const searchLower = query.search.trim().toLowerCase();
        filteredTransactions = transactions.filter((tx) => {
          const student = tx.wallet.student;
          if (!student) return false;
          const studentName = `${student.firstName} ${student.lastName}`.toLowerCase();
          return studentName.includes(searchLower) || student.rut.toLowerCase().includes(searchLower);
        });
      }

      // 7. Build CSV content
      const headers = ['Fecha', 'Estudiante', 'RUT', 'Curso', 'Tipo', 'Método', 'Descripción', 'Monto', 'Operador'];
      const rows = filteredTransactions.map((tx) => {
        const student = tx.wallet.student;
        const operatorName = tx.validator?.guardian
          ? `${tx.validator.guardian.firstName} ${tx.validator.guardian.lastName}`
          : tx.validator?.email || '';

        // Determine type: 'ticket' if ticketsUsed is not null, otherwise use original type
        const displayType = tx.ticketsUsed ? 'ticket' : tx.type;

        return [
          new Date(tx.createdAt).toLocaleString('es-CL'),
          student ? `${student.firstName} ${student.lastName}` : '',
          student?.rut || '',
          student?.grade || '',
          displayType,
          tx.validationMethod || '',
          tx.description || '',
          tx.amount.toString(),
          operatorName,
        ];
      });

      // Build CSV string with BOM for Excel compatibility
      const csvContent = '\uFEFF' + [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      // 8. Return CSV file
      const filename = `transacciones_${new Date().toISOString().split('T')[0]}.csv`;
      reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(csvContent);
    } catch (error) {
      console.error('Export transactions error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al exportar transacciones',
      });
    }
  });
}
