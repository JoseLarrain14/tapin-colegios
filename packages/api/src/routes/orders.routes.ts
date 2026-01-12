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

// Valid order statuses
const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'] as const;

// Validation schemas
const createOrderSchema = z.object({
  studentId: z.string().uuid('ID de estudiante invalido'),
  cafeteriaId: z.string().uuid('ID de cafeteria invalido'),
  pickupDate: z.string().transform(val => new Date(val)),
  pickupTime: z.string().optional(),
  items: z.array(z.object({
    menuItemId: z.string().uuid(),
    name: z.string(),
    price: z.number().int().positive(),
    quantity: z.number().int().positive(),
  })),
  comments: z.string().optional(),
});

const updateOrderSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  comments: z.string().optional(),
});

export async function ordersRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/orders
   * Get all orders for the guardian
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

      const orders = await prisma.order.findMany({
        where: { guardianId: guardian.id },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
          cafeteria: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        success: true,
        data: {
          orders: orders.map(order => ({
            id: order.id,
            student: order.student,
            cafeteria: order.cafeteria,
            status: order.status,
            pickupDate: order.pickupDate,
            pickupTime: order.pickupTime,
            items: JSON.parse(order.items),
            total: order.total,
            comments: order.comments,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
          })),
          totalOrders: orders.length,
        },
      });
    } catch (error) {
      console.error('Get orders error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener pedidos',
      });
    }
  });

  /**
   * GET /api/v1/orders/:id
   * Get a specific order
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

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
          cafeteria: {
            select: { id: true, name: true },
          },
        },
      });

      if (!order || order.guardianId !== guardian.id) {
        return reply.status(404).send({
          success: false,
          message: 'Pedido no encontrado',
        });
      }

      return reply.send({
        success: true,
        data: {
          id: order.id,
          student: order.student,
          cafeteria: order.cafeteria,
          status: order.status,
          pickupDate: order.pickupDate,
          pickupTime: order.pickupTime,
          items: JSON.parse(order.items),
          total: order.total,
          comments: order.comments,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        },
      });
    } catch (error) {
      console.error('Get order error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener pedido',
      });
    }
  });

  /**
   * POST /api/v1/orders
   * Create a new order
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const body = createOrderSchema.parse(request.body);

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
            studentId: body.studentId,
          },
        },
      });

      if (!guardianStudent) {
        return reply.status(403).send({
          success: false,
          message: 'No tienes acceso a este estudiante',
        });
      }

      // Verify cafeteria exists
      const cafeteria = await prisma.cafeteria.findUnique({
        where: { id: body.cafeteriaId },
      });

      if (!cafeteria) {
        return reply.status(404).send({
          success: false,
          message: 'Cafeteria no encontrada',
        });
      }

      // Calculate total
      const total = body.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const order = await prisma.order.create({
        data: {
          guardianId: guardian.id,
          studentId: body.studentId,
          cafeteriaId: body.cafeteriaId,
          pickupDate: body.pickupDate,
          pickupTime: body.pickupTime,
          items: JSON.stringify(body.items),
          total,
          comments: body.comments,
          status: 'pending',
        },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
          cafeteria: {
            select: { id: true, name: true },
          },
        },
      });

      return reply.status(201).send({
        success: true,
        message: 'Pedido creado exitosamente',
        data: {
          id: order.id,
          student: order.student,
          cafeteria: order.cafeteria,
          status: order.status,
          pickupDate: order.pickupDate,
          pickupTime: order.pickupTime,
          items: JSON.parse(order.items),
          total: order.total,
          comments: order.comments,
          createdAt: order.createdAt,
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

      console.error('Create order error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al crear pedido',
      });
    }
  });

  /**
   * PUT /api/v1/orders/:id
   * Update an order (status, comments)
   */
  app.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { id } = request.params;
      const body = updateOrderSchema.parse(request.body);

      const guardian = await getGuardian(decoded.userId);
      if (!guardian) {
        return reply.status(404).send({
          success: false,
          message: 'Perfil de apoderado no encontrado',
        });
      }

      // Check order exists and belongs to guardian
      const existingOrder = await prisma.order.findUnique({
        where: { id },
      });

      if (!existingOrder || existingOrder.guardianId !== guardian.id) {
        return reply.status(404).send({
          success: false,
          message: 'Pedido no encontrado',
        });
      }

      const updateData: any = {};
      if (body.status !== undefined) updateData.status = body.status;
      if (body.comments !== undefined) updateData.comments = body.comments;

      const order = await prisma.order.update({
        where: { id },
        data: updateData,
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
          cafeteria: {
            select: { id: true, name: true },
          },
        },
      });

      return reply.send({
        success: true,
        message: 'Pedido actualizado exitosamente',
        data: {
          id: order.id,
          student: order.student,
          cafeteria: order.cafeteria,
          status: order.status,
          pickupDate: order.pickupDate,
          pickupTime: order.pickupTime,
          items: JSON.parse(order.items),
          total: order.total,
          comments: order.comments,
          updatedAt: order.updatedAt,
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

      console.error('Update order error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al actualizar pedido',
      });
    }
  });

  /**
   * PUT /api/v1/orders/:id/cancel
   * Cancel an order
   */
  app.put('/:id/cancel', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
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

      // Check order exists and belongs to guardian
      const existingOrder = await prisma.order.findUnique({
        where: { id },
      });

      if (!existingOrder || existingOrder.guardianId !== guardian.id) {
        return reply.status(404).send({
          success: false,
          message: 'Pedido no encontrado',
        });
      }

      // Check if order can be cancelled
      if (['delivered', 'cancelled'].includes(existingOrder.status)) {
        return reply.status(400).send({
          success: false,
          message: `No se puede cancelar un pedido con estado '${existingOrder.status}'`,
        });
      }

      const order = await prisma.order.update({
        where: { id },
        data: { status: 'cancelled' },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
          cafeteria: {
            select: { id: true, name: true },
          },
        },
      });

      return reply.send({
        success: true,
        message: 'Pedido cancelado exitosamente',
        data: {
          id: order.id,
          status: order.status,
          student: order.student,
          cafeteria: order.cafeteria,
          updatedAt: order.updatedAt,
        },
      });
    } catch (error) {
      console.error('Cancel order error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al cancelar pedido',
      });
    }
  });
}
