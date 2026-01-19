import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../services/auth.service.js';
import prisma from '../utils/prisma.js';

/**
 * Authentication hook
 * Verifies JWT token and attaches user info to request
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
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

  // Attach user info to request
  request.user = {
    userId: decoded.userId,
    role: decoded.role,
    schoolId: decoded.schoolId,
  };
}

/**
 * Role-based authorization hook
 * Verifies that the authenticated user has one of the allowed roles
 *
 * @param allowedRoles - Array of roles that are allowed to access the route
 *
 * @example
 * app.get('/admin', { preHandler: [authenticate, requireRole('super_admin', 'school_admin')] }, handler)
 */
export function requireRole(...allowedRoles: string[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    // Ensure user is authenticated
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        message: 'No autenticado',
      });
    }

    // Check if user has one of the allowed roles
    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        success: false,
        message: 'No tienes permisos para acceder a este recurso',
        requiredRoles: allowedRoles,
        userRole: request.user.role,
      });
    }
  };
}

/**
 * School access authorization hook
 * Verifies that a school_admin can only access data for their own school
 *
 * This hook expects the school ID to be in one of these locations:
 * - request.params.schoolId
 * - request.query.schoolId
 * - request.body.schoolId
 *
 * For super_admin and cafeteria_operator roles, this check is skipped.
 *
 * @example
 * app.get('/schools/:schoolId/students', { preHandler: [authenticate, requireSchoolAccess] }, handler)
 */
export async function requireSchoolAccess(request: FastifyRequest, reply: FastifyReply) {
  // Ensure user is authenticated
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      message: 'No autenticado',
    });
  }

  const { role, schoolId: userSchoolId } = request.user;

  // Super admins can access all schools
  if (role === 'super_admin') {
    return;
  }

  // School admins can only access their own school
  if (role === 'school_admin') {
    if (!userSchoolId) {
      return reply.status(403).send({
        success: false,
        message: 'Administrador de colegio sin colegio asignado',
      });
    }

    // Extract school ID from request (params, query, or body)
    const params = request.params as Record<string, any>;
    const query = request.query as Record<string, any>;
    const body = request.body as Record<string, any> | null;

    const requestedSchoolId = params?.schoolId || query?.schoolId || body?.schoolId;

    if (!requestedSchoolId) {
      return reply.status(400).send({
        success: false,
        message: 'ID de colegio requerido',
      });
    }

    if (requestedSchoolId !== userSchoolId) {
      return reply.status(403).send({
        success: false,
        message: 'No tienes permisos para acceder a datos de este colegio',
      });
    }
  }
}

/**
 * Helper hook to ensure user is a guardian
 * Also fetches and attaches the guardian record to request
 */
export async function requireGuardian(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      message: 'No autenticado',
    });
  }

  if (request.user.role !== 'guardian') {
    return reply.status(403).send({
      success: false,
      message: 'Solo apoderados pueden acceder a este recurso',
    });
  }

  // Fetch guardian record and attach to request
  const guardian = await prisma.guardian.findUnique({
    where: { userId: request.user.userId },
  });

  if (!guardian) {
    return reply.status(404).send({
      success: false,
      message: 'Perfil de apoderado no encontrado',
    });
  }

  // Extend request with guardian info
  (request as any).guardian = guardian;
}

/**
 * Helper to verify student access for guardians
 * Ensures that the authenticated guardian has access to the requested student
 *
 * This hook expects the student ID in request.params.studentId or request.params.id
 *
 * @example
 * app.get('/students/:id', { preHandler: [authenticate, requireGuardianStudentAccess] }, handler)
 */
export async function requireGuardianStudentAccess(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      message: 'No autenticado',
    });
  }

  // Only guardians need this check
  if (request.user.role !== 'guardian') {
    return;
  }

  const guardian = await prisma.guardian.findUnique({
    where: { userId: request.user.userId },
  });

  if (!guardian) {
    return reply.status(404).send({
      success: false,
      message: 'Perfil de apoderado no encontrado',
    });
  }

  const params = request.params as Record<string, any>;
  const studentId = params?.studentId || params?.id;

  if (!studentId) {
    return reply.status(400).send({
      success: false,
      message: 'ID de estudiante requerido',
    });
  }

  // Verify guardian has access to this student
  const guardianStudent = await prisma.guardianStudent.findUnique({
    where: {
      guardianId_studentId: {
        guardianId: guardian.id,
        studentId: studentId,
      },
    },
  });

  if (!guardianStudent) {
    return reply.status(403).send({
      success: false,
      message: 'No tienes permisos para acceder a este estudiante',
    });
  }

  // Attach guardian to request for use in route handler
  (request as any).guardian = guardian;
}
