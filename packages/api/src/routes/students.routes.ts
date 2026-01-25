import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import prisma from '../utils/prisma.js';
import { authService } from '../services/auth.service.js';

// RUT validation functions (flexible validation - does NOT verify check digit)
function cleanRut(rut: string): string {
  return rut.replace(/[.\-\s]/g, '').toUpperCase();
}

function validateRut(rut: string): boolean {
  if (!rut || typeof rut !== 'string') {
    return false;
  }

  const cleanedRut = cleanRut(rut);

  // Allow 7-9 characters (flexible for shorter RUTs)
  if (cleanedRut.length < 7 || cleanedRut.length > 9) {
    return false;
  }

  const rutNumber = cleanedRut.slice(0, -1);
  const providedDigit = cleanedRut.slice(-1);

  if (!/^\d+$/.test(rutNumber)) {
    return false;
  }

  // Only check that digit is a valid character (0-9 or K), NOT mathematically correct
  if (!/^[0-9K]$/.test(providedDigit)) {
    return false;
  }

  return true;
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
const createStudentSchema = z.object({
  firstName: z.string().min(1, 'Nombre es requerido'),
  lastName: z.string().min(1, 'Apellido es requerido'),
  rut: z.string().min(7, 'RUT debe tener al menos 7 caracteres'),
  schoolId: z.string().uuid('ID de colegio invalido'),
  grade: z.string().optional(),
  section: z.string().optional(),
  photoUrl: z.string().url().optional().nullable(),
  dailyLimit: z.number().int().min(0).optional().default(0),
});

const updateStudentSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  grade: z.string().optional(),
  section: z.string().optional(),
  photoUrl: z.string().url().optional().nullable(),
  dailyLimit: z.number().int().min(0).optional(),
  // Optimistic concurrency control - if provided, will check for conflicts
  updatedAt: z.string().datetime().optional(),
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
      message: 'Token invalido o expirado',
    });
    return null;
  }

  return decoded;
}

// Helper to get guardian from user
async function getGuardian(userId: string) {
  return prisma.guardian.findUnique({
    where: { userId },
  });
}

export async function studentsRoutes(app: FastifyInstance) {
  /**
   * POST /api/v1/students
   * Create a new student (child)
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const body = createStudentSchema.parse(request.body);
      const formattedRut = formatRut(body.rut);

      // Get guardian
      const guardian = await getGuardian(decoded.userId);
      if (!guardian) {
        return reply.status(404).send({
          success: false,
          message: 'Perfil de apoderado no encontrado',
        });
      }

      // Verify school exists
      const school = await prisma.school.findUnique({
        where: { id: body.schoolId },
      });

      if (!school) {
        return reply.status(404).send({
          success: false,
          message: 'Colegio no encontrado',
        });
      }

      // Check if student with this RUT already exists
      const existingStudent = await prisma.student.findUnique({
        where: { rut: formattedRut },
      });

      if (existingStudent) {
        // Check if this guardian already has a relationship with this student
        const existingRelation = await prisma.guardianStudent.findUnique({
          where: {
            guardianId_studentId: {
              guardianId: guardian.id,
              studentId: existingStudent.id,
            },
          },
        });

        if (existingRelation) {
          return reply.status(400).send({
            success: false,
            message: 'Este estudiante ya esta asociado a tu cuenta',
          });
        }

        // Associate existing student with this guardian
        await prisma.guardianStudent.create({
          data: {
            guardianId: guardian.id,
            studentId: existingStudent.id,
            isPrimary: false,
          },
        });

        const studentWithDetails = await prisma.student.findUnique({
          where: { id: existingStudent.id },
          include: {
            school: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            wallet: true,
          },
        });

        return reply.status(200).send({
          success: true,
          message: 'Estudiante asociado exitosamente',
          data: {
            id: studentWithDetails!.id,
            firstName: studentWithDetails!.firstName,
            lastName: studentWithDetails!.lastName,
            rut: studentWithDetails!.rut,
            grade: studentWithDetails!.grade,
            section: studentWithDetails!.section,
            photoUrl: studentWithDetails!.photoUrl,
            dailyLimit: studentWithDetails!.dailyLimit,
            school: studentWithDetails!.school,
            balance: studentWithDetails!.wallet?.balance || 0,
          },
        });
      }

      // Create new student with wallet in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create student
        const student = await tx.student.create({
          data: {
            firstName: body.firstName,
            lastName: body.lastName,
            rut: formattedRut,
            schoolId: body.schoolId,
            grade: body.grade,
            section: body.section,
            photoUrl: body.photoUrl,
            dailyLimit: body.dailyLimit || 0,
          },
        });

        // Create wallet for student
        await tx.wallet.create({
          data: {
            studentId: student.id,
            balance: 0,
          },
        });

        // Create guardian-student relationship
        await tx.guardianStudent.create({
          data: {
            guardianId: guardian.id,
            studentId: student.id,
            isPrimary: true,
          },
        });

        return student;
      });

      // Fetch student with details
      const studentWithDetails = await prisma.student.findUnique({
        where: { id: result.id },
        include: {
          school: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          wallet: true,
        },
      });

      return reply.status(201).send({
        success: true,
        message: 'Estudiante creado exitosamente',
        data: {
          id: studentWithDetails!.id,
          firstName: studentWithDetails!.firstName,
          lastName: studentWithDetails!.lastName,
          rut: studentWithDetails!.rut,
          grade: studentWithDetails!.grade,
          section: studentWithDetails!.section,
          photoUrl: studentWithDetails!.photoUrl,
          dailyLimit: studentWithDetails!.dailyLimit,
          school: studentWithDetails!.school,
          balance: studentWithDetails!.wallet?.balance || 0,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: 'Datos invalidos',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      console.error('Create student error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al crear estudiante',
      });
    }
  });

  /**
   * GET /api/v1/students
   * List all students for the current guardian
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const guardian = await getGuardian(decoded.userId);
      if (!guardian) {
        return reply.status(404).send({
          success: false,
          message: 'Perfil de apoderado no encontrado',
        });
      }

      const guardianStudents = await prisma.guardianStudent.findMany({
        where: { guardianId: guardian.id },
        include: {
          student: {
            include: {
              school: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  config: true,
                },
              },
              wallet: true,
              tickets: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const students = guardianStudents.map((gs) => {
        // Parse school config
        let schoolConfig: any = {};
        try {
          schoolConfig = JSON.parse(gs.student.school.config || '{}');
        } catch {
          schoolConfig = {};
        }

        return {
          id: gs.student.id,
          firstName: gs.student.firstName,
          lastName: gs.student.lastName,
          rut: gs.student.rut,
          grade: gs.student.grade,
          section: gs.student.section,
          photoUrl: gs.student.photoUrl,
          dailyLimit: gs.student.dailyLimit,
          school: {
            id: gs.student.school.id,
            name: gs.student.school.name,
            code: gs.student.school.code,
            businessModel: schoolConfig.businessModel || 'mixed', // 'tickets_only', 'balance_only', or 'mixed'
            allowNegativeBalance: schoolConfig.allowNegativeBalance || false,
          },
          balance: gs.student.wallet?.balance || 0,
          tickets: gs.student.tickets.map((t) => ({
            type: t.ticketType,
            quantity: t.quantity,
            expiresAt: t.expiresAt,
          })),
          isPrimary: gs.isPrimary,
        };
      });

      return reply.send({
        success: true,
        data: students,
      });
    } catch (error) {
      console.error('List students error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al listar estudiantes',
      });
    }
  });

  /**
   * GET /api/v1/students/:id
   * Get a specific student by ID
   */
  app.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { id } = request.params;

      const guardian = await getGuardian(decoded.userId);
      if (!guardian) {
        return reply.status(404).send({
          success: false,
          message: 'Perfil de apoderado no encontrado',
        });
      }

      // Verify guardian has access to this student
      const guardianStudent = await prisma.guardianStudent.findUnique({
        where: {
          guardianId_studentId: {
            guardianId: guardian.id,
            studentId: id,
          },
        },
        include: {
          student: {
            include: {
              school: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  city: true,
                  region: true,
                  cafeterias: {
                    select: {
                      id: true,
                      name: true,
                    },
                    take: 1,
                  },
                },
              },
              wallet: true,
              tickets: true,
            },
          },
        },
      });

      if (!guardianStudent) {
        return reply.status(404).send({
          success: false,
          message: 'Estudiante no encontrado',
        });
      }

      const student = guardianStudent.student;
      const cafeteria = (student.school as any).cafeterias?.[0] || null;

      return reply.send({
        success: true,
        data: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          rut: student.rut,
          grade: student.grade,
          section: student.section,
          photoUrl: student.photoUrl,
          dailyLimit: student.dailyLimit,
          school: {
            id: student.school.id,
            name: student.school.name,
            code: student.school.code,
            city: student.school.city,
            region: student.school.region,
          },
          cafeteria: cafeteria,
          balance: student.wallet?.balance || 0,
          tickets: student.tickets.map((t) => ({
            type: t.ticketType,
            quantity: t.quantity,
            expiresAt: t.expiresAt,
          })),
          isPrimary: guardianStudent.isPrimary,
          createdAt: student.createdAt,
          updatedAt: student.updatedAt,
        },
      });
    } catch (error) {
      console.error('Get student error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener estudiante',
      });
    }
  });

  /**
   * PUT /api/v1/students/:id
   * Update a student
   */
  app.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { id } = request.params;
      const body = updateStudentSchema.parse(request.body);

      const guardian = await getGuardian(decoded.userId);
      if (!guardian) {
        return reply.status(404).send({
          success: false,
          message: 'Perfil de apoderado no encontrado',
        });
      }

      // Verify guardian has access to this student
      const guardianStudent = await prisma.guardianStudent.findUnique({
        where: {
          guardianId_studentId: {
            guardianId: guardian.id,
            studentId: id,
          },
        },
      });

      if (!guardianStudent) {
        return reply.status(404).send({
          success: false,
          message: 'Estudiante no encontrado',
        });
      }

      // Extract updatedAt for concurrency check, remove from update data
      const { updatedAt: expectedUpdatedAt, ...updateData } = body;

      // If updatedAt is provided, check for concurrent modifications (optimistic locking)
      if (expectedUpdatedAt) {
        const currentStudent = await prisma.student.findUnique({
          where: { id },
          select: { updatedAt: true },
        });

        if (currentStudent) {
          const expectedTime = new Date(expectedUpdatedAt).getTime();
          const currentTime = currentStudent.updatedAt.getTime();

          // Allow small time differences (within 1 second) due to timestamp precision
          if (Math.abs(currentTime - expectedTime) > 1000) {
            return reply.status(409).send({
              success: false,
              message: 'El registro ha sido modificado por otro usuario. Por favor, recarga la pagina e intenta de nuevo.',
              code: 'CONCURRENT_MODIFICATION',
              data: {
                expectedUpdatedAt: expectedUpdatedAt,
                currentUpdatedAt: currentStudent.updatedAt.toISOString(),
              },
            });
          }
        }
      }

      const updatedStudent = await prisma.student.update({
        where: { id },
        data: updateData,
        include: {
          school: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          wallet: true,
        },
      });

      return reply.send({
        success: true,
        message: 'Estudiante actualizado',
        data: {
          id: updatedStudent.id,
          firstName: updatedStudent.firstName,
          lastName: updatedStudent.lastName,
          rut: updatedStudent.rut,
          grade: updatedStudent.grade,
          section: updatedStudent.section,
          photoUrl: updatedStudent.photoUrl,
          dailyLimit: updatedStudent.dailyLimit,
          school: updatedStudent.school,
          balance: updatedStudent.wallet?.balance || 0,
          updatedAt: updatedStudent.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: 'Datos invalidos',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      console.error('Update student error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al actualizar estudiante',
      });
    }
  });

  /**
   * DELETE /api/v1/students/:id
   * Remove a student from guardian's list (doesn't delete the student)
   */
  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { id } = request.params;

      const guardian = await getGuardian(decoded.userId);
      if (!guardian) {
        return reply.status(404).send({
          success: false,
          message: 'Perfil de apoderado no encontrado',
        });
      }

      // Find and delete the guardian-student relationship
      const guardianStudent = await prisma.guardianStudent.findUnique({
        where: {
          guardianId_studentId: {
            guardianId: guardian.id,
            studentId: id,
          },
        },
      });

      if (!guardianStudent) {
        return reply.status(404).send({
          success: false,
          message: 'Estudiante no encontrado',
        });
      }

      await prisma.guardianStudent.delete({
        where: { id: guardianStudent.id },
      });

      return reply.send({
        success: true,
        message: 'Estudiante removido de tu lista',
      });
    } catch (error) {
      console.error('Delete student error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al eliminar estudiante',
      });
    }
  });

  /**
   * PUT /api/v1/students/:id/limit
   * Update a student's daily spending limit
   */
  app.put('/:id/limit', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { id } = request.params;
      const body = z.object({
        dailyLimit: z.number().int().min(0, 'El limite debe ser mayor o igual a 0'),
      }).parse(request.body);

      const guardian = await getGuardian(decoded.userId);
      if (!guardian) {
        return reply.status(404).send({
          success: false,
          message: 'Perfil de apoderado no encontrado',
        });
      }

      // Verify guardian has access to this student
      const guardianStudent = await prisma.guardianStudent.findUnique({
        where: {
          guardianId_studentId: {
            guardianId: guardian.id,
            studentId: id,
          },
        },
      });

      if (!guardianStudent) {
        return reply.status(404).send({
          success: false,
          message: 'Estudiante no encontrado',
        });
      }

      const updatedStudent = await prisma.student.update({
        where: { id },
        data: { dailyLimit: body.dailyLimit },
      });

      return reply.send({
        success: true,
        message: body.dailyLimit === 0
          ? 'Limite diario desactivado'
          : `Limite diario actualizado a $${body.dailyLimit.toLocaleString('es-CL')}`,
        data: {
          dailyLimit: updatedStudent.dailyLimit,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: 'Datos invalidos',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      console.error('Update limit error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al actualizar limite',
      });
    }
  });

  /**
   * GET /api/v1/students/search-by-rut/:rut
   * Search for an existing student by RUT (for linking by guardian)
   * Returns basic student info without sensitive data
   */
  app.get<{ Params: { rut: string } }>(
    '/search-by-rut/:rut',
    async (request, reply) => {
      try {
        // Verify authentication
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({
            success: false,
            message: 'Token de acceso requerido',
          });
        }

        const token = authHeader.substring(7);
        const decoded = authService.verifyAccessToken(token);

        if (!decoded) {
          return reply.status(401).send({
            success: false,
            message: 'Token invalido o expirado',
          });
        }

        // Only guardians can search for students to link
        if (decoded.role !== 'guardian') {
          return reply.status(403).send({
            success: false,
            message: 'Solo apoderados pueden buscar estudiantes para vincular',
          });
        }

        const { rut } = request.params;

        // Validate RUT format (flexible - does not check verification digit)
        if (!validateRut(rut)) {
          return reply.status(400).send({
            success: false,
            message: 'RUT invalido. Debe tener entre 7 y 9 caracteres',
          });
        }

        // Generate multiple possible formats for flexible search
        const cleanedRut = cleanRut(rut);
        const formattedRut = formatRut(rut);
        const rutWithDash = `${cleanedRut.slice(0, -1)}-${cleanedRut.slice(-1)}`; // XXXXXXXX-X

        // Search for student by RUT - try multiple formats
        const student = await prisma.student.findFirst({
          where: {
            active: true,
            OR: [
              { rut: formattedRut },    // XX.XXX.XXX-X (standard format)
              { rut: cleanedRut },       // XXXXXXXXX (no formatting)
              { rut: rutWithDash },      // XXXXXXXX-X (dash only, no dots)
            ],
          },
          include: {
            school: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        });

        if (!student) {
          return reply.status(404).send({
            success: false,
            message: 'No se encontro un estudiante con este RUT',
          });
        }

        // Get guardian to check if already linked
        const guardian = await prisma.guardian.findUnique({
          where: { userId: decoded.userId },
        });

        if (!guardian) {
          return reply.status(404).send({
            success: false,
            message: 'Apoderado no encontrado',
          });
        }

        // Check if already linked
        const existingLink = await prisma.guardianStudent.findFirst({
          where: {
            guardianId: guardian.id,
            studentId: student.id,
          },
        });

        if (existingLink) {
          return reply.status(409).send({
            success: false,
            message: 'Este estudiante ya esta vinculado a tu cuenta',
          });
        }

        // Get user email to compare with parentEmails
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { email: true },
        });

        // Check if user email matches any of the parent emails
        let isEmailMatch = false;
        if (student.parentEmails && user?.email) {
          const parentEmailsList = student.parentEmails
            .split(/[,;]/)
            .map(email => email.trim().toLowerCase())
            .filter(email => email.length > 0);

          const userEmail = user.email.trim().toLowerCase();
          isEmailMatch = parentEmailsList.includes(userEmail);
        }

        // Return student info for confirmation
        return reply.send({
          success: true,
          data: {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            rut: student.rut,
            grade: student.grade,
            section: student.section,
            photoUrl: student.photoUrl,
            school: student.school,
            isEmailMatch, // Indica si el email del usuario coincide con parentEmails
          },
        });
      } catch (error) {
        console.error('Search student by RUT error:', error);
        return reply.status(500).send({
          success: false,
          message: 'Error al buscar estudiante',
        });
      }
    }
  );

  /**
   * POST /api/v1/students/link
   * Link an existing student to the current guardian
   */
  app.post<{ Body: { studentId: string } }>(
    '/link',
    async (request, reply) => {
      try {
        // Verify authentication
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({
            success: false,
            message: 'Token de acceso requerido',
          });
        }

        const token = authHeader.substring(7);
        const decoded = authService.verifyAccessToken(token);

        if (!decoded) {
          return reply.status(401).send({
            success: false,
            message: 'Token invalido o expirado',
          });
        }

        // Only guardians can link students
        if (decoded.role !== 'guardian') {
          return reply.status(403).send({
            success: false,
            message: 'Solo apoderados pueden vincular estudiantes',
          });
        }

        const { studentId } = request.body;

        if (!studentId) {
          return reply.status(400).send({
            success: false,
            message: 'ID de estudiante requerido',
          });
        }

        // Get guardian
        const guardian = await prisma.guardian.findUnique({
          where: { userId: decoded.userId },
        });

        if (!guardian) {
          return reply.status(404).send({
            success: false,
            message: 'Apoderado no encontrado',
          });
        }

        // Check if student exists
        const student = await prisma.student.findUnique({
          where: { id: studentId },
          include: {
            school: true,
          },
        });

        if (!student || !student.active) {
          return reply.status(404).send({
            success: false,
            message: 'Estudiante no encontrado',
          });
        }

        // Check if already linked
        const existingLink = await prisma.guardianStudent.findFirst({
          where: {
            guardianId: guardian.id,
            studentId: student.id,
          },
        });

        if (existingLink) {
          return reply.status(409).send({
            success: false,
            message: 'Este estudiante ya esta vinculado a tu cuenta',
          });
        }

        // Count existing linked students for isPrimary logic
        const existingStudentCount = await prisma.guardianStudent.count({
          where: { guardianId: guardian.id },
        });

        // Create link
        const guardianStudent = await prisma.guardianStudent.create({
          data: {
            guardianId: guardian.id,
            studentId: student.id,
            isPrimary: existingStudentCount === 0, // First student is primary
          },
        });

        return reply.status(201).send({
          success: true,
          message: `${student.firstName} ${student.lastName} ha sido vinculado exitosamente`,
          data: {
            id: guardianStudent.id,
            student: {
              id: student.id,
              firstName: student.firstName,
              lastName: student.lastName,
              rut: student.rut,
              school: {
                id: student.school.id,
                name: student.school.name,
              },
            },
            isPrimary: guardianStudent.isPrimary,
          },
        });
      } catch (error) {
        console.error('Link student error:', error);
        return reply.status(500).send({
          success: false,
          message: 'Error al vincular estudiante',
        });
      }
    }
  );
}
