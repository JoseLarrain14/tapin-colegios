import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import prisma from '../utils/prisma.js';
import { authService } from '../services/auth.service.js';
import { notificationService } from '../services/notification.service.js';

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
  // Ticket support
  useTickets: z.object({
    ticketType: z.string(),
    quantity: z.number().int().positive(),
  }).optional(),
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
            ticketsUsed: order.ticketsUsed ? JSON.parse(order.ticketsUsed) : null,
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
          ticketsUsed: order.ticketsUsed ? JSON.parse(order.ticketsUsed) : null,
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

      // Check if using tickets or balance
      let ticketsUsed: any = null;
      let studentTicket: any = null;

      if (body.useTickets) {
        // Using tickets - verify student has enough tickets
        studentTicket = await prisma.studentTicket.findFirst({
          where: {
            studentId: body.studentId,
            ticketType: body.useTickets.ticketType,
          },
        });

        if (!studentTicket) {
          return reply.status(400).send({
            success: false,
            message: `El estudiante no tiene tickets de tipo '${body.useTickets.ticketType}'`,
          });
        }

        if (studentTicket.quantity < body.useTickets.quantity) {
          return reply.status(400).send({
            success: false,
            message: `Tickets insuficientes. Disponibles: ${studentTicket.quantity}, Requeridos: ${body.useTickets.quantity}`,
          });
        }

        ticketsUsed = {
          ticketType: body.useTickets.ticketType,
          quantity: body.useTickets.quantity,
        };
      } else {
        // Using balance - check wallet
        const wallet = await prisma.wallet.findUnique({
          where: { studentId: body.studentId },
        });

        if (!wallet) {
          return reply.status(400).send({
            success: false,
            message: 'El estudiante no tiene una billetera activa',
          });
        }

        // Get student's school to check if negative balance is allowed
        const student = await prisma.student.findUnique({
          where: { id: body.studentId },
          include: { school: true },
        });

        // Parse school config to check allowNegativeBalance
        let allowNegativeBalance = false;
        if (student?.school?.config) {
          try {
            const schoolConfig = JSON.parse(student.school.config);
            allowNegativeBalance = schoolConfig.allowNegativeBalance === true;
          } catch {
            // If config is invalid, default to not allowing negative balance
          }
        }

        // Only check balance if school doesn't allow negative balance
        if (!allowNegativeBalance && wallet.balance < total) {
          return reply.status(400).send({
            success: false,
            message: `Saldo insuficiente. Saldo disponible: $${wallet.balance.toLocaleString('es-CL')}, Total del pedido: $${total.toLocaleString('es-CL')}`,
          });
        }
      }

      // Create order and deduct balance/tickets in a transaction
      const order = await prisma.$transaction(async (tx) => {
        // Create the order
        const newOrder = await tx.order.create({
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
            ticketsUsed: ticketsUsed ? JSON.stringify(ticketsUsed) : null,
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

        if (body.useTickets && studentTicket) {
          // Deduct tickets
          await tx.studentTicket.update({
            where: { id: studentTicket.id },
            data: {
              quantity: studentTicket.quantity - body.useTickets.quantity,
            },
          });
        } else {
          // Deduct balance from wallet
          const wallet = await tx.wallet.findUnique({
            where: { studentId: body.studentId },
          });

          await tx.wallet.update({
            where: { studentId: body.studentId },
            data: {
              balance: { decrement: total },
            },
          });

          // Create wallet log entry
          await tx.walletLog.create({
            data: {
              walletId: wallet!.id,
              type: 'purchase',
              amount: -total,
              balanceBefore: wallet!.balance,
              balanceAfter: wallet!.balance - total,
              description: `Pedido #${newOrder.id.slice(0, 8)} - ${body.items.length} item(s)`,
              referenceId: newOrder.id,
            },
          });
        }

        return newOrder;
      });

      // Send push notification to guardian about the purchase
      // Don't await to avoid delaying the response
      notificationService.sendPurchaseAlert({
        guardianId: decoded.userId,
        studentName: `${order.student.firstName} ${order.student.lastName}`,
        amount: total,
        cafeteriaName: order.cafeteria.name,
        orderId: order.id,
      }).catch(err => console.error('Failed to send purchase notification:', err));

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
          ticketsUsed: order.ticketsUsed ? JSON.parse(order.ticketsUsed) : null,
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
   * GET /api/v1/orders/export/csv
   * Export all transactions (orders and payments) as CSV
   * Query params:
   *   - studentId: Optional filter by student ID
   */
  app.get('/export/csv', async (request: FastifyRequest<{ Querystring: { studentId?: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { studentId } = request.query;

      const guardian = await getGuardian(decoded.userId);
      if (!guardian) {
        return reply.status(404).send({
          success: false,
          message: 'Perfil de apoderado no encontrado',
        });
      }

      // If studentId provided, verify guardian has access
      if (studentId) {
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
            message: 'No tienes acceso a este estudiante',
          });
        }
      }

      // Build order query with optional student filter
      const orderWhere: any = { guardianId: guardian.id };
      if (studentId) {
        orderWhere.studentId = studentId;
      }

      // Get orders for the guardian (optionally filtered by student)
      const orders = await prisma.order.findMany({
        where: orderWhere,
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

      // Build payment query with optional student filter
      const paymentWhere: any = { guardianId: guardian.id };
      if (studentId) {
        paymentWhere.studentId = studentId;
      }

      // Get payments for the guardian (optionally filtered by student)
      const payments = await prisma.payment.findMany({
        where: paymentWhere,
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

      // Combine and sort by timestamp
      interface TransactionExport {
        type: string;
        date: string;
        description: string;
        studentName: string;
        amount: number;
        status: string;
        id: string;
      }

      const transactions: TransactionExport[] = [];

      // Add orders
      orders.forEach(order => {
        const items = JSON.parse(order.items);
        const itemCount = items.length;
        transactions.push({
          type: 'Pedido',
          date: order.createdAt.toISOString(),
          description: `${itemCount} item${itemCount !== 1 ? 's' : ''} - ${order.cafeteria.name}`,
          studentName: `${order.student.firstName} ${order.student.lastName}`,
          amount: -order.total, // Negative for expenses
          status: order.status,
          id: order.id,
        });
      });

      // Add payments
      payments.forEach(payment => {
        transactions.push({
          type: 'Recarga',
          date: payment.createdAt.toISOString(),
          description: payment.rechargePackage ? `Paquete: ${payment.rechargePackage.name}` : 'Recarga de saldo',
          studentName: payment.student ? `${payment.student.firstName} ${payment.student.lastName}` : 'N/A',
          amount: payment.amount, // Positive for deposits
          status: payment.status,
          id: payment.id,
        });
      });

      // Sort by date (most recent first)
      transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Generate CSV
      const csvHeaders = ['Fecha', 'Tipo', 'Descripcion', 'Estudiante', 'Monto', 'Estado', 'ID'];
      const csvRows = transactions.map(t => {
        const formattedDate = new Date(t.date).toLocaleString('es-CL', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
        const formattedAmount = t.amount >= 0 ? `+$${t.amount.toLocaleString('es-CL')}` : `-$${Math.abs(t.amount).toLocaleString('es-CL')}`;
        return [
          formattedDate,
          t.type,
          `"${t.description.replace(/"/g, '""')}"`, // Escape quotes in CSV
          `"${t.studentName}"`,
          formattedAmount,
          t.status,
          t.id,
        ].join(',');
      });

      const csv = [csvHeaders.join(','), ...csvRows].join('\n');

      // Add BOM for Excel UTF-8 compatibility
      const csvWithBom = '\uFEFF' + csv;

      // Set headers for CSV download
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="transacciones_${new Date().toISOString().split('T')[0]}.csv"`);

      return reply.send(csvWithBom);
    } catch (error) {
      console.error('Export CSV error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al exportar transacciones',
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

      // Get student's wallet for refund
      const wallet = await prisma.wallet.findUnique({
        where: { studentId: existingOrder.studentId },
      });

      if (!wallet) {
        return reply.status(400).send({
          success: false,
          message: 'No se puede procesar el reembolso: billetera no encontrada',
        });
      }

      // Cancel order and refund balance in a transaction
      const order = await prisma.$transaction(async (tx) => {
        // Update order status
        const cancelledOrder = await tx.order.update({
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

        // Refund balance to wallet
        await tx.wallet.update({
          where: { studentId: existingOrder.studentId },
          data: {
            balance: { increment: existingOrder.total },
          },
        });

        // Create wallet log entry for refund
        await tx.walletLog.create({
          data: {
            walletId: wallet.id,
            type: 'refund',
            amount: existingOrder.total,
            balanceBefore: wallet.balance,
            balanceAfter: wallet.balance + existingOrder.total,
            description: `Reembolso pedido #${existingOrder.id.slice(0, 8)} cancelado`,
            referenceId: existingOrder.id,
          },
        });

        return cancelledOrder;
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
