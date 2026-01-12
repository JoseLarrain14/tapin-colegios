import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import prisma from '../utils/prisma.js';
import { authService } from '../services/auth.service.js';

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

// Validation schemas
const createPackageSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().optional(),
  price: z.number().int().positive('El precio debe ser positivo'),
  type: z.enum(['ticket', 'balance']),
  ticketCount: z.number().int().positive().optional().nullable(),
  ticketType: z.string().optional().nullable(),
});

const updatePackageSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  price: z.number().int().positive().optional(),
  type: z.enum(['ticket', 'balance']).optional(),
  ticketCount: z.number().int().positive().optional().nullable(),
  ticketType: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export async function paymentsRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/payments/packages/:cafeteriaId
   * Get all recharge packages for a cafeteria
   */
  app.get('/packages/:cafeteriaId', async (request: FastifyRequest<{ Params: { cafeteriaId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId } = request.params;

      // Check cafeteria exists
      const cafeteria = await prisma.cafeteria.findUnique({
        where: { id: cafeteriaId },
        include: { school: true },
      });

      if (!cafeteria) {
        return reply.status(404).send({
          success: false,
          message: 'Cafeteria no encontrada',
        });
      }

      const packages = await prisma.rechargePackage.findMany({
        where: {
          cafeteriaId,
          active: true,
        },
        orderBy: { price: 'asc' },
      });

      return reply.send({
        success: true,
        data: {
          cafeteria: {
            id: cafeteria.id,
            name: cafeteria.name,
            schoolName: cafeteria.school.name,
          },
          packages: packages.map(pkg => ({
            id: pkg.id,
            name: pkg.name,
            description: pkg.description,
            price: pkg.price,
            type: pkg.type,
            ticketCount: pkg.ticketCount,
            ticketType: pkg.ticketType,
            createdAt: pkg.createdAt,
          })),
          totalPackages: packages.length,
        },
      });
    } catch (error) {
      console.error('Get packages error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener paquetes de recarga',
      });
    }
  });

  /**
   * POST /api/v1/payments/packages/:cafeteriaId
   * Create a new recharge package (for testing)
   */
  app.post('/packages/:cafeteriaId', async (request: FastifyRequest<{ Params: { cafeteriaId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId } = request.params;
      const body = createPackageSchema.parse(request.body);

      // Check cafeteria exists
      const cafeteria = await prisma.cafeteria.findUnique({
        where: { id: cafeteriaId },
      });

      if (!cafeteria) {
        return reply.status(404).send({
          success: false,
          message: 'Cafeteria no encontrada',
        });
      }

      // Validate ticket-specific fields
      if (body.type === 'ticket' && !body.ticketCount) {
        return reply.status(400).send({
          success: false,
          message: 'ticketCount es requerido para paquetes tipo ticket',
        });
      }

      const pkg = await prisma.rechargePackage.create({
        data: {
          cafeteriaId,
          name: body.name,
          description: body.description,
          price: body.price,
          type: body.type,
          ticketCount: body.ticketCount,
          ticketType: body.ticketType,
        },
      });

      return reply.status(201).send({
        success: true,
        message: 'Paquete de recarga creado exitosamente',
        data: {
          id: pkg.id,
          name: pkg.name,
          description: pkg.description,
          price: pkg.price,
          type: pkg.type,
          ticketCount: pkg.ticketCount,
          ticketType: pkg.ticketType,
          createdAt: pkg.createdAt,
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

      console.error('Create package error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al crear paquete de recarga',
      });
    }
  });

  /**
   * PUT /api/v1/payments/packages/:cafeteriaId/:packageId
   * Update a recharge package
   */
  app.put('/packages/:cafeteriaId/:packageId', async (request: FastifyRequest<{ Params: { cafeteriaId: string; packageId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId, packageId } = request.params;
      const body = updatePackageSchema.parse(request.body);

      // Check package exists and belongs to cafeteria
      const existingPkg = await prisma.rechargePackage.findUnique({
        where: { id: packageId },
      });

      if (!existingPkg || existingPkg.cafeteriaId !== cafeteriaId) {
        return reply.status(404).send({
          success: false,
          message: 'Paquete de recarga no encontrado',
        });
      }

      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.price !== undefined) updateData.price = body.price;
      if (body.type !== undefined) updateData.type = body.type;
      if (body.ticketCount !== undefined) updateData.ticketCount = body.ticketCount;
      if (body.ticketType !== undefined) updateData.ticketType = body.ticketType;
      if (body.active !== undefined) updateData.active = body.active;

      const pkg = await prisma.rechargePackage.update({
        where: { id: packageId },
        data: updateData,
      });

      return reply.send({
        success: true,
        message: 'Paquete de recarga actualizado exitosamente',
        data: {
          id: pkg.id,
          name: pkg.name,
          description: pkg.description,
          price: pkg.price,
          type: pkg.type,
          ticketCount: pkg.ticketCount,
          ticketType: pkg.ticketType,
          active: pkg.active,
          updatedAt: pkg.updatedAt,
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

      console.error('Update package error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al actualizar paquete de recarga',
      });
    }
  });

  /**
   * DELETE /api/v1/payments/packages/:cafeteriaId/:packageId
   * Delete a recharge package
   */
  app.delete('/packages/:cafeteriaId/:packageId', async (request: FastifyRequest<{ Params: { cafeteriaId: string; packageId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId, packageId } = request.params;

      // Check package exists and belongs to cafeteria
      const existingPkg = await prisma.rechargePackage.findUnique({
        where: { id: packageId },
      });

      if (!existingPkg || existingPkg.cafeteriaId !== cafeteriaId) {
        return reply.status(404).send({
          success: false,
          message: 'Paquete de recarga no encontrado',
        });
      }

      await prisma.rechargePackage.delete({
        where: { id: packageId },
      });

      return reply.send({
        success: true,
        message: 'Paquete de recarga eliminado exitosamente',
      });
    } catch (error) {
      console.error('Delete package error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al eliminar paquete de recarga',
      });
    }
  });

  /**
   * GET /api/v1/payments
   * Get payment history for the guardian
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

      const payments = await prisma.payment.findMany({
        where: { guardianId: guardian.id },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
          rechargePackage: {
            select: { id: true, name: true, type: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        success: true,
        data: {
          payments: payments.map(payment => ({
            id: payment.id,
            amount: payment.amount,
            gateway: payment.gateway,
            status: payment.status,
            student: payment.student,
            package: payment.rechargePackage,
            createdAt: payment.createdAt,
            completedAt: payment.completedAt,
          })),
          totalPayments: payments.length,
        },
      });
    } catch (error) {
      console.error('Get payments error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener historial de pagos',
      });
    }
  });
}
