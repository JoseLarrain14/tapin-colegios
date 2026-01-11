import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import prisma from '../utils/prisma.js';
import { authService } from '../services/auth.service.js';

// Validation schemas
const updatePreferredSchoolSchema = z.object({
  schoolId: z.string().uuid('Invalid school ID'),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  rut: z.string().optional(),
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

export async function guardiansRoutes(app: FastifyInstance) {
  /**
   * PUT /api/v1/guardians/preferred-school
   * Update guardian's preferred school
   */
  app.put('/preferred-school', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const body = updatePreferredSchoolSchema.parse(request.body);

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

      // Get guardian by user ID
      const guardian = await prisma.guardian.findUnique({
        where: { userId: decoded.userId },
      });

      if (!guardian) {
        return reply.status(404).send({
          success: false,
          message: 'Perfil de apoderado no encontrado',
        });
      }

      // Update preferred school
      const updatedGuardian = await prisma.guardian.update({
        where: { id: guardian.id },
        data: { preferredSchoolId: body.schoolId },
        include: {
          preferredSchool: {
            select: {
              id: true,
              name: true,
              code: true,
              city: true,
              region: true,
            },
          },
        },
      });

      return reply.send({
        success: true,
        message: 'Colegio preferido actualizado',
        data: {
          preferredSchool: updatedGuardian.preferredSchool,
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

      console.error('Update preferred school error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al actualizar colegio preferido',
      });
    }
  });

  /**
   * GET /api/v1/guardians/profile
   * Get current guardian's profile
   */
  app.get('/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const guardian = await prisma.guardian.findUnique({
        where: { userId: decoded.userId },
        include: {
          preferredSchool: {
            select: {
              id: true,
              name: true,
              code: true,
              city: true,
              region: true,
              logoUrl: true,
            },
          },
          students: {
            include: {
              student: {
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
              },
            },
          },
        },
      });

      if (!guardian) {
        return reply.status(404).send({
          success: false,
          message: 'Perfil de apoderado no encontrado',
        });
      }

      return reply.send({
        success: true,
        data: {
          id: guardian.id,
          firstName: guardian.firstName,
          lastName: guardian.lastName,
          phone: guardian.phone,
          rut: guardian.rut,
          relationship: guardian.relationship,
          preferredSchool: guardian.preferredSchool,
          students: guardian.students.map((gs) => ({
            id: gs.student.id,
            firstName: gs.student.firstName,
            lastName: gs.student.lastName,
            rut: gs.student.rut,
            grade: gs.student.grade,
            section: gs.student.section,
            photoUrl: gs.student.photoUrl,
            school: gs.student.school,
            balance: gs.student.wallet?.balance || 0,
            isPrimary: gs.isPrimary,
          })),
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener perfil',
      });
    }
  });

  /**
   * PUT /api/v1/guardians/profile
   * Update guardian's profile
   */
  app.put('/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const body = updateProfileSchema.parse(request.body);

      const guardian = await prisma.guardian.findUnique({
        where: { userId: decoded.userId },
      });

      if (!guardian) {
        return reply.status(404).send({
          success: false,
          message: 'Perfil de apoderado no encontrado',
        });
      }

      const updatedGuardian = await prisma.guardian.update({
        where: { id: guardian.id },
        data: body,
      });

      return reply.send({
        success: true,
        message: 'Perfil actualizado',
        data: {
          id: updatedGuardian.id,
          firstName: updatedGuardian.firstName,
          lastName: updatedGuardian.lastName,
          phone: updatedGuardian.phone,
          rut: updatedGuardian.rut,
          relationship: updatedGuardian.relationship,
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

      console.error('Update profile error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al actualizar perfil',
      });
    }
  });
}
