import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
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

const createStudentSchema = z.object({
  rut: z.string().min(8, 'RUT debe tener al menos 8 caracteres').refine(validateRut, {
    message: 'RUT inválido',
  }),
  firstName: z.string().min(1, 'Nombre es requerido'),
  lastName: z.string().min(1, 'Apellido es requerido'),
  grade: z.string().optional(),
  section: z.string().optional(),
});

// Helper to verify auth token
async function verifyAuth(request: FastifyRequest, reply: FastifyReply) {
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

// Helper to get school admin's school ID
async function getSchoolAdminSchoolId(userId: string): Promise<string | null> {
  const schoolAdmin = await prisma.schoolAdmin.findUnique({
    where: { userId },
    select: { schoolId: true },
  });
  return schoolAdmin?.schoolId || null;
}

export async function adminRoutes(app: FastifyInstance) {
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
            wallet: {
              select: {
                id: true,
                balance: true,
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
        balance: student.wallet?.balance || 0,
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
}
