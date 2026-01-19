/**
 * Example Usage - Authorization Middleware
 *
 * This file demonstrates how to use the authorization middleware
 * in different scenarios. This is for reference only.
 */

import { FastifyInstance } from 'fastify';
import {
  authenticate,
  requireRole,
  requireSchoolAccess,
  requireGuardian,
  requireGuardianStudentAccess,
} from './authorization.js';
import prisma from '../utils/prisma.js';

export async function exampleRoutes(app: FastifyInstance) {
  /**
   * Example 1: Public route (no authentication)
   */
  app.get('/health', async () => {
    return { status: 'ok' };
  });

  /**
   * Example 2: Authenticated route (any authenticated user)
   */
  app.get('/me', {
    preHandler: authenticate
  }, async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.userId },
    });
    return { success: true, data: user };
  });

  /**
   * Example 3: Role-based access (only super_admin)
   */
  app.get('/admin/users', {
    preHandler: [
      authenticate,
      requireRole('super_admin')
    ]
  }, async () => {
    const users = await prisma.user.findMany();
    return { success: true, data: users };
  });

  /**
   * Example 4: Multiple roles allowed
   */
  app.get('/schools', {
    preHandler: [
      authenticate,
      requireRole('super_admin', 'school_admin')
    ]
  }, async () => {
    // Both super_admin and school_admin can access this
    const schools = await prisma.school.findMany();
    return { success: true, data: schools };
  });

  /**
   * Example 5: School access verification for school_admin
   */
  app.get<{ Params: { schoolId: string } }>('/schools/:schoolId/students', {
    preHandler: [
      authenticate,
      requireRole('super_admin', 'school_admin'),
      requireSchoolAccess
    ]
  }, async (request) => {
    const { schoolId } = request.params;

    // super_admin can see any school's students
    // school_admin can only see their own school's students

    const students = await prisma.student.findMany({
      where: { schoolId },
      include: {
        wallet: true,
        guardians: {
          include: {
            guardian: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    return { success: true, data: students };
  });

  /**
   * Example 6: Guardian-only route
   */
  app.get('/guardians/profile', {
    preHandler: [
      authenticate,
      requireGuardian
    ]
  }, async (request) => {
    // Guardian is automatically attached to request
    const guardian = (request as any).guardian;

    const fullProfile = await prisma.guardian.findUnique({
      where: { id: guardian.id },
      include: {
        preferredSchool: true,
        students: {
          include: {
            student: {
              include: {
                school: true,
                wallet: true,
              },
            },
          },
        },
      },
    });

    return { success: true, data: fullProfile };
  });

  /**
   * Example 7: Guardian student access verification
   */
  app.get<{ Params: { id: string } }>('/students/:id', {
    preHandler: [
      authenticate,
      requireGuardianStudentAccess
    ]
  }, async (request) => {
    const { id } = request.params;

    // Access is already verified by middleware
    // Guardian can only see their own students

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        school: true,
        wallet: true,
        tickets: true,
      },
    });

    return { success: true, data: student };
  });

  /**
   * Example 8: Complex authorization - Update student data
   * Guardians can update their students
   * School admins can update students in their school
   * Super admins can update any student
   */
  app.put<{ Params: { id: string } }>('/students/:id', {
    preHandler: authenticate
  }, async (request, reply) => {
    const { id } = request.params;
    const updateData = request.body as any;

    // Custom authorization logic based on role
    if (request.user!.role === 'guardian') {
      // Verify guardian has access to this student
      const guardian = await prisma.guardian.findUnique({
        where: { userId: request.user!.userId },
      });

      if (!guardian) {
        return reply.status(404).send({
          success: false,
          message: 'Perfil de apoderado no encontrado',
        });
      }

      const guardianStudent = await prisma.guardianStudent.findUnique({
        where: {
          guardianId_studentId: {
            guardianId: guardian.id,
            studentId: id,
          },
        },
      });

      if (!guardianStudent) {
        return reply.status(403).send({
          success: false,
          message: 'No tienes permisos para modificar este estudiante',
        });
      }
    } else if (request.user!.role === 'school_admin') {
      // Verify student belongs to admin's school
      const student = await prisma.student.findUnique({
        where: { id },
        select: { schoolId: true },
      });

      if (!student) {
        return reply.status(404).send({
          success: false,
          message: 'Estudiante no encontrado',
        });
      }

      if (student.schoolId !== request.user!.schoolId) {
        return reply.status(403).send({
          success: false,
          message: 'No tienes permisos para modificar estudiantes de otros colegios',
        });
      }
    } else if (request.user!.role !== 'super_admin') {
      // Only super_admin, school_admin, and guardian can update students
      return reply.status(403).send({
        success: false,
        message: 'No tienes permisos para modificar estudiantes',
      });
    }

    // Update student
    const updatedStudent = await prisma.student.update({
      where: { id },
      data: updateData,
    });

    return { success: true, data: updatedStudent };
  });

  /**
   * Example 9: Mixed authorization - Different permissions per role
   */
  app.get('/reports/transactions', {
    preHandler: authenticate
  }, async (request, reply) => {
    const role = request.user!.role;
    const schoolId = request.user!.schoolId;

    let transactions;

    if (role === 'super_admin') {
      // Super admin sees all transactions
      transactions = await prisma.transaction.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
      });
    } else if (role === 'school_admin' && schoolId) {
      // School admin sees only transactions from their school
      transactions = await prisma.transaction.findMany({
        where: {
          cafeteria: {
            schoolId: schoolId,
          },
        },
        take: 100,
        orderBy: { createdAt: 'desc' },
      });
    } else if (role === 'cafeteria_operator') {
      // Cafeteria operator sees transactions they processed
      transactions = await prisma.transaction.findMany({
        where: {
          validatedBy: request.user!.userId,
        },
        take: 100,
        orderBy: { createdAt: 'desc' },
      });
    } else {
      return reply.status(403).send({
        success: false,
        message: 'No tienes permisos para ver reportes de transacciones',
      });
    }

    return { success: true, data: transactions };
  });
}
