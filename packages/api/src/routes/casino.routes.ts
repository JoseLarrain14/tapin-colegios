import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/authorization.js';
import prisma from '../utils/prisma.js';

// =============================================================================
// Validation Schemas
// =============================================================================

const validateOrderSchema = z.object({
  orderId: z.string().uuid('ID de pedido invalido'),
});

const consumeTicketSchema = z.object({
  studentId: z.string().uuid('ID de estudiante invalido'),
  ticketType: z.string().optional().default('almuerzo'),
  quantity: z.number().int().positive().optional().default(1),
});

const directPurchaseSchema = z.object({
  studentRut: z.string().min(1, 'RUT del estudiante requerido'),
  cafeteriaId: z.string().min(1, 'ID de cafeteria requerido'),
  items: z.array(
    z.object({
      name: z.string().min(1, 'Nombre del item requerido'),
      price: z.number().int().positive('El precio debe ser positivo'),
      quantity: z.number().int().positive('La cantidad debe ser positiva'),
    })
  ).min(1, 'Debe incluir al menos un item'),
  validationMethod: z.enum(['fingerprint', 'rut_search', 'qr_code'], {
    errorMap: () => ({ message: 'Metodo de validacion invalido' }),
  }),
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize RUT by removing dots and hyphens
 */
function normalizeRut(rut: string): string {
  return rut.replace(/[.-]/g, '').toLowerCase();
}

// =============================================================================
// Routes
// =============================================================================

export async function casinoRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/casino/pending-orders
   * Get pending orders for cafeteria operators
   *
   * Roles: cafeteria_operator, school_admin
   */
  app.get(
    '/pending-orders',
    {
      preHandler: [authenticate, requireRole('cafeteria_operator', 'school_admin')],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const orders = await prisma.order.findMany({
          where: {
            status: {
              in: ['pending', 'confirmed', 'preparing', 'ready'],
            },
            pickupDate: {
              gte: today,
            },
          },
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                rut: true,
                photoUrl: true,
              },
            },
            cafeteria: {
              select: {
                id: true,
                name: true,
                schoolId: true,
              },
            },
          },
          orderBy: [
            { pickupDate: 'asc' },
            { createdAt: 'asc' },
          ],
        });

        return reply.send({
          success: true,
          data: {
            orders: orders.map((order) => ({
              id: order.id,
              status: order.status,
              pickupDate: order.pickupDate,
              pickupTime: order.pickupTime,
              total: order.total,
              items: order.items ? JSON.parse(order.items) : [],
              ticketsUsed: order.ticketsUsed ? JSON.parse(order.ticketsUsed) : null,
              comments: order.comments,
              student: order.student,
              cafeteria: order.cafeteria,
              createdAt: order.createdAt,
            })),
            totalOrders: orders.length,
          },
        });
      } catch (error) {
        console.error('Get pending orders error:', error);
        return reply.status(500).send({
          success: false,
          message: 'Error al obtener pedidos pendientes',
        });
      }
    }
  );

  /**
   * POST /api/v1/casino/validate-order
   * Validate and complete an order
   *
   * Roles: cafeteria_operator, school_admin
   *
   * Actions:
   * 1. Update Order.status = 'delivered'
   * 2. Create Transaction with source: 'app' and validationMethod: 'app_order'
   */
  app.post(
    '/validate-order',
    {
      preHandler: [authenticate, requireRole('cafeteria_operator', 'school_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = validateOrderSchema.parse(request.body);
        const { orderId } = body;
        const userId = request.user!.userId;

        // Find the order
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            student: {
              include: {
                wallet: true,
              },
            },
          },
        });

        if (!order) {
          return reply.status(404).send({
            success: false,
            message: 'Pedido no encontrado',
          });
        }

        // Check if order is already delivered
        if (order.status === 'delivered') {
          return reply.status(400).send({
            success: false,
            message: 'Este pedido ya fue entregado',
          });
        }

        // Check if order is cancelled
        if (order.status === 'cancelled') {
          return reply.status(400).send({
            success: false,
            message: 'Este pedido fue cancelado',
          });
        }

        // Get or create wallet for student
        let wallet = order.student.wallet;
        if (!wallet) {
          wallet = await prisma.wallet.create({
            data: {
              studentId: order.studentId,
              balance: 0,
            },
          });
        }

        // Process order validation in a transaction
        const result = await prisma.$transaction(async (tx) => {
          // Update order status to delivered
          const updatedOrder = await tx.order.update({
            where: { id: orderId },
            data: {
              status: 'delivered',
              updatedAt: new Date(),
            },
          });

          // Create transaction record
          const transaction = await tx.transaction.create({
            data: {
              walletId: wallet!.id,
              cafeteriaId: order.cafeteriaId,
              type: 'purchase',
              amount: order.total,
              description: `Pedido validado - ${JSON.parse(order.items).length} items`,
              items: order.items,
              ticketsUsed: order.ticketsUsed,
              source: 'app',
              validationMethod: 'app_order',
              validatedBy: userId,
            },
          });

          return {
            order: updatedOrder,
            transaction,
          };
        });

        return reply.send({
          success: true,
          message: 'Pedido validado y entregado exitosamente',
          data: {
            order: {
              id: result.order.id,
              status: result.order.status,
              total: result.order.total,
              updatedAt: result.order.updatedAt,
            },
            transaction: {
              id: result.transaction.id,
              type: result.transaction.type,
              amount: result.transaction.amount,
              source: result.transaction.source,
              validationMethod: result.transaction.validationMethod,
              createdAt: result.transaction.createdAt,
            },
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

        console.error('Validate order error:', error);
        return reply.status(500).send({
          success: false,
          message: 'Error al validar pedido',
        });
      }
    }
  );

  /**
   * POST /api/v1/casino/direct-purchase
   * Process a direct purchase at the cafeteria (without pre-order)
   *
   * Roles: cafeteria_operator, school_admin
   *
   * Actions:
   * 1. Find student by RUT
   * 2. Verify sufficient balance
   * 3. Deduct from Wallet
   * 4. Create WalletLog (type: 'purchase')
   * 5. Create Transaction with source: 'casino'
   */
  app.post(
    '/direct-purchase',
    {
      preHandler: [authenticate, requireRole('cafeteria_operator', 'school_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = directPurchaseSchema.parse(request.body);
        const { studentRut, cafeteriaId, items, validationMethod } = body;
        const userId = request.user!.userId;

        // Normalize and find student by RUT (try multiple formats)
        const normalizedRut = normalizeRut(studentRut);
        const rutWithHyphen = studentRut.replace(/\./g, ''); // Remove only dots
        const student = await prisma.student.findFirst({
          where: {
            OR: [
              { rut: normalizedRut },
              { rut: rutWithHyphen },
              { rut: studentRut },
            ],
            active: true,
          },
          include: {
            wallet: true,
            school: true,
          },
        });

        if (!student) {
          return reply.status(404).send({
            success: false,
            message: 'Estudiante no encontrado o inactivo',
          });
        }

        // Verify cafeteria exists and belongs to student's school
        const cafeteria = await prisma.cafeteria.findUnique({
          where: { id: cafeteriaId },
        });

        if (!cafeteria) {
          return reply.status(404).send({
            success: false,
            message: 'Cafeteria no encontrada',
          });
        }

        if (cafeteria.schoolId !== student.schoolId) {
          return reply.status(400).send({
            success: false,
            message: 'La cafeteria no pertenece al colegio del estudiante',
          });
        }

        // Calculate total amount
        const totalAmount = items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );

        if (totalAmount <= 0) {
          return reply.status(400).send({
            success: false,
            message: 'El monto total debe ser mayor a cero',
          });
        }

        // Get or create wallet
        let wallet = student.wallet;
        if (!wallet) {
          wallet = await prisma.wallet.create({
            data: {
              studentId: student.id,
              balance: 0,
            },
          });
        }

        // Verify sufficient balance
        if (wallet.balance < totalAmount) {
          return reply.status(400).send({
            success: false,
            message: 'Saldo insuficiente',
            data: {
              requiredAmount: totalAmount,
              currentBalance: wallet.balance,
              deficit: totalAmount - wallet.balance,
            },
          });
        }

        // Process purchase in a transaction
        const result = await prisma.$transaction(async (tx) => {
          const balanceBefore = wallet!.balance;
          const balanceAfter = balanceBefore - totalAmount;

          // Update wallet balance
          const updatedWallet = await tx.wallet.update({
            where: { id: wallet!.id },
            data: { balance: balanceAfter },
          });

          // Create wallet log
          const walletLog = await tx.walletLog.create({
            data: {
              walletId: wallet!.id,
              type: 'purchase',
              amount: totalAmount,
              balanceBefore,
              balanceAfter,
              description: `Compra directa - ${items.length} items`,
            },
          });

          // Create transaction record
          const transaction = await tx.transaction.create({
            data: {
              walletId: wallet!.id,
              cafeteriaId,
              type: 'purchase',
              amount: totalAmount,
              description: `Compra directa - ${items.length} items`,
              items: JSON.stringify(items),
              source: 'casino',
              validationMethod,
              validatedBy: userId,
            },
          });

          return {
            wallet: updatedWallet,
            walletLog,
            transaction,
          };
        });

        return reply.status(201).send({
          success: true,
          message: `Compra de $${totalAmount.toLocaleString('es-CL')} procesada exitosamente`,
          data: {
            transaction: {
              id: result.transaction.id,
              type: result.transaction.type,
              amount: result.transaction.amount,
              items: JSON.parse(result.transaction.items!),
              source: result.transaction.source,
              validationMethod: result.transaction.validationMethod,
              createdAt: result.transaction.createdAt,
            },
            wallet: {
              id: result.wallet.id,
              previousBalance: result.walletLog.balanceBefore,
              newBalance: result.wallet.balance,
              amountDeducted: totalAmount,
            },
            student: {
              id: student.id,
              firstName: student.firstName,
              lastName: student.lastName,
              rut: student.rut,
            },
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

        console.error('Direct purchase error:', error);
        return reply.status(500).send({
          success: false,
          message: 'Error al procesar compra directa',
        });
      }
    }
  );

  /**
   * GET /api/v1/casino/student/:rut
   * Get student information by RUT for cafeteria operators
   *
   * Roles: cafeteria_operator, school_admin
   *
   * Returns student info including balance and tickets
   */
  app.get<{
    Params: { rut: string };
  }>(
    '/student/:rut',
    {
      preHandler: [authenticate, requireRole('cafeteria_operator', 'school_admin')],
    },
    async (request, reply) => {
      try {
        const { rut } = request.params;

        // Normalize RUT (remove dots, keep hyphen for comparison)
        const normalizedRut = normalizeRut(rut);
        // Also try with original format in case DB has different format
        const rutWithHyphen = rut.replace(/\./g, ''); // Remove only dots

        // Find student (try both normalized and with hyphen)
        const student = await prisma.student.findFirst({
          where: {
            OR: [
              { rut: normalizedRut },
              { rut: rutWithHyphen },
              { rut: rut }, // Original input
            ],
            active: true,
          },
          include: {
            school: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            wallet: true,
            tickets: true,
          },
        });

        if (!student) {
          return reply.status(404).send({
            success: false,
            message: 'Estudiante no encontrado',
          });
        }

        // Calculate total tickets
        const totalTickets = student.tickets.reduce(
          (sum, ticket) => sum + ticket.quantity,
          0
        );

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
            balance: student.wallet?.balance || 0,
            tickets: student.tickets.map((ticket) => ({
              ticketType: ticket.ticketType,
              quantity: ticket.quantity,
              expiresAt: ticket.expiresAt,
            })),
            totalTickets,
          },
        });
      } catch (error) {
        console.error('Get student by RUT error:', error);
        return reply.status(500).send({
          success: false,
          message: 'Error al obtener informacion del estudiante',
        });
      }
    }
  );

  /**
   * POST /api/v1/casino/consume
   * Consume a ticket for a student (mark consumption in POS)
   *
   * Roles: cafeteria_operator, school_admin
   *
   * Actions:
   * 1. Find student and verify tickets
   * 2. Decrement ticket quantity
   * 3. Create Transaction record
   */
  app.post(
    '/consume',
    {
      preHandler: [authenticate, requireRole('cafeteria_operator', 'school_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = consumeTicketSchema.parse(request.body);
        const userId = request.user!.userId;

        // Get the student with their tickets
        const student = await prisma.student.findUnique({
          where: { id: body.studentId },
          include: {
            school: {
              include: {
                cafeterias: {
                  where: { active: true },
                  take: 1,
                },
              },
            },
            tickets: true,
            wallet: true,
          },
        });

        if (!student) {
          return reply.status(404).send({
            success: false,
            message: 'Estudiante no encontrado',
          });
        }

        // Find the ticket of the requested type
        const ticket = student.tickets.find(t => t.ticketType === body.ticketType);

        if (!ticket || ticket.quantity < body.quantity) {
          return reply.status(400).send({
            success: false,
            message: `El estudiante no tiene suficientes tickets de tipo "${body.ticketType}". Disponibles: ${ticket?.quantity || 0}`,
          });
        }

        // Get cafeteria for transaction
        const cafeteria = student.school.cafeterias[0];
        if (!cafeteria) {
          return reply.status(400).send({
            success: false,
            message: 'No hay cafeteria configurada para este colegio',
          });
        }

        // Ensure wallet exists (for transaction reference only - balance not affected)
        let wallet = student.wallet;
        if (!wallet) {
          wallet = await prisma.wallet.create({
            data: {
              studentId: student.id,
              balance: 0,
            },
          });
        }

        // Process consumption in a transaction (NO balance changes, only ticket decrement)
        const result = await prisma.$transaction(async (tx) => {
          // Decrement ticket quantity only
          const updatedTicket = await tx.studentTicket.update({
            where: { id: ticket.id },
            data: {
              quantity: ticket.quantity - body.quantity,
            },
          });

          // Create transaction record (amount: 0 because tickets have no monetary value now)
          const transaction = await tx.transaction.create({
            data: {
              walletId: wallet!.id,
              cafeteriaId: cafeteria.id,
              type: 'purchase',
              amount: 0, // Tickets no longer have monetary value
              description: `Se resto ${body.quantity} ticket(s) de ${body.ticketType} - ${student.firstName} comio`,
              ticketsUsed: JSON.stringify([{ type: body.ticketType, quantity: body.quantity }]),
              validatedBy: userId,
              validationMethod: 'rut_search',
              source: 'casino',
            },
          });

          return { updatedTicket, transaction };
        });

        // Get updated tickets for response
        const updatedTickets = await prisma.studentTicket.findMany({
          where: { studentId: student.id },
        });

        const ticketsMap = updatedTickets.reduce((acc, t) => {
          acc[t.ticketType] = t.quantity;
          return acc;
        }, {} as Record<string, number>);

        const totalTickets = updatedTickets.reduce((sum, t) => sum + t.quantity, 0);

        return reply.status(201).send({
          success: true,
          message: `Se resto ${body.quantity} ticket(s) de ${body.ticketType} - ${student.firstName} comio`,
          data: {
            student: {
              id: student.id,
              firstName: student.firstName,
              lastName: student.lastName,
              fullName: `${student.firstName} ${student.lastName}`,
              rut: student.rut,
            },
            consumption: {
              ticketType: body.ticketType,
              quantity: body.quantity,
              transactionId: result.transaction.id,
              timestamp: result.transaction.createdAt,
            },
            remainingTickets: {
              [body.ticketType]: result.updatedTicket.quantity,
              total: totalTickets,
              all: ticketsMap,
            },
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

        console.error('Consume ticket error:', error);
        return reply.status(500).send({
          success: false,
          message: 'Error al registrar consumo',
        });
      }
    }
  );

  /**
   * GET /api/v1/casino/consumptions
   * Get today's consumptions for the operator's school/cafeteria
   *
   * Roles: cafeteria_operator, school_admin
   */
  app.get(
    '/consumptions',
    {
      preHandler: [authenticate, requireRole('cafeteria_operator', 'school_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user!;

        // Get school ID from SchoolAdmin if school_admin
        let schoolId: string | null = null;
        if (user.role === 'school_admin') {
          const schoolAdmin = await prisma.schoolAdmin.findUnique({
            where: { userId: user.userId },
            select: { schoolId: true },
          });
          schoolId = schoolAdmin?.schoolId || null;
        }

        if (!schoolId) {
          return reply.status(403).send({
            success: false,
            message: 'No tienes un colegio asignado',
          });
        }

        // Get cafeteria for this school
        const cafeteria = await prisma.cafeteria.findFirst({
          where: { schoolId, active: true },
        });

        if (!cafeteria) {
          return reply.status(404).send({
            success: false,
            message: 'No hay cafeteria configurada',
          });
        }

        // Get today's start
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get today's ticket consumptions
        const transactions = await prisma.transaction.findMany({
          where: {
            cafeteriaId: cafeteria.id,
            type: 'purchase',
            ticketsUsed: { not: null },
            createdAt: { gte: today },
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
                    section: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        const consumptions = transactions.map(tx => ({
          id: tx.id,
          student: tx.wallet.student ? {
            id: tx.wallet.student.id,
            fullName: `${tx.wallet.student.firstName} ${tx.wallet.student.lastName}`,
            rut: tx.wallet.student.rut,
            grade: tx.wallet.student.grade,
            section: tx.wallet.student.section,
          } : null,
          ticketsUsed: tx.ticketsUsed ? JSON.parse(tx.ticketsUsed) : [],
          description: tx.description,
          createdAt: tx.createdAt,
        }));

        return reply.send({
          success: true,
          data: {
            date: today.toISOString().split('T')[0],
            totalConsumptions: consumptions.length,
            consumptions,
          },
        });
      } catch (error) {
        console.error('Get consumptions error:', error);
        return reply.status(500).send({
          success: false,
          message: 'Error al obtener consumos',
        });
      }
    }
  );
}
