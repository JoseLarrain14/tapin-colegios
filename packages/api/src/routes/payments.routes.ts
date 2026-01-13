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
   * POST /api/v1/payments/init
   * Initialize and process a mock payment (creates payment record and deposits to wallet)
   */
  app.post('/init', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const initPaymentSchema = z.object({
        studentId: z.string().uuid('ID de estudiante invalido'),
        amount: z.number().int().positive('El monto debe ser positivo'),
        packageId: z.string().uuid().optional(),
        paymentMethod: z.enum(['credit_card', 'debit_card', 'transfer']).default('credit_card'),
        simulateFailure: z.boolean().optional().default(false), // For testing payment failures
      });

      const body = initPaymentSchema.parse(request.body);

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
        include: {
          student: {
            include: {
              school: {
                include: {
                  cafeterias: true,
                },
              },
            },
          },
        },
      });

      if (!guardianStudent) {
        return reply.status(403).send({
          success: false,
          message: 'No tienes acceso a este estudiante',
        });
      }

      // Get or validate package if provided
      let rechargePackage = null;
      if (body.packageId) {
        rechargePackage = await prisma.rechargePackage.findUnique({
          where: { id: body.packageId },
        });

        if (!rechargePackage || !rechargePackage.active) {
          return reply.status(404).send({
            success: false,
            message: 'Paquete de recarga no encontrado o inactivo',
          });
        }

        // Verify amount matches package price
        if (rechargePackage.price !== body.amount) {
          return reply.status(400).send({
            success: false,
            message: 'El monto no coincide con el precio del paquete',
          });
        }
      }

      // Get or create wallet
      let wallet = await prisma.wallet.findUnique({
        where: { studentId: body.studentId },
      });

      if (!wallet) {
        wallet = await prisma.wallet.create({
          data: {
            studentId: body.studentId,
            balance: 0,
          },
        });
      }

      // Handle simulated payment failure (for testing)
      if (body.simulateFailure) {
        // Create a failed payment record
        const failedPayment = await prisma.payment.create({
          data: {
            guardianId: guardian.id,
            studentId: body.studentId,
            walletId: wallet!.id,
            rechargePackageId: body.packageId || null,
            amount: body.amount,
            gateway: 'mock',
            status: 'failed',
            errorMessage: 'Pago rechazado por la entidad bancaria (simulacion de prueba)',
            metadata: JSON.stringify({
              paymentMethod: body.paymentMethod,
              initiatedAt: new Date().toISOString(),
              failedAt: new Date().toISOString(),
              simulatedFailure: true,
              gatewayResponse: { success: false, error: 'DECLINED', code: 'INSUFFICIENT_FUNDS' },
            }),
          },
        });

        return reply.status(400).send({
          success: false,
          message: 'El pago fue rechazado. Por favor, intenta con otro metodo de pago.',
          data: {
            payment: {
              id: failedPayment.id,
              amount: failedPayment.amount,
              status: failedPayment.status,
              gateway: failedPayment.gateway,
              errorMessage: failedPayment.errorMessage,
              createdAt: failedPayment.createdAt,
            },
          },
        });
      }

      // Process payment in a transaction (mock payment gateway)
      const result = await prisma.$transaction(async (tx) => {
        // Create payment record (pending)
        const payment = await tx.payment.create({
          data: {
            guardianId: guardian.id,
            studentId: body.studentId,
            walletId: wallet!.id,
            rechargePackageId: body.packageId || null,
            amount: body.amount,
            gateway: 'mock',
            status: 'processing',
            metadata: JSON.stringify({
              paymentMethod: body.paymentMethod,
              initiatedAt: new Date().toISOString(),
            }),
          },
        });

        // Simulate payment processing (always succeeds in mock mode)
        const gatewayTxId = `MOCK_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Update payment to completed
        const existingMetadata = payment.metadata ? JSON.parse(payment.metadata) : {};
        const completedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'completed',
            gatewayTxId,
            completedAt: new Date(),
            metadata: JSON.stringify({
              ...existingMetadata,
              completedAt: new Date().toISOString(),
              gatewayResponse: { success: true, txId: gatewayTxId },
            }),
          },
        });

        // Update wallet balance
        const balanceBefore = wallet!.balance;
        const balanceAfter = balanceBefore + body.amount;

        const updatedWallet = await tx.wallet.update({
          where: { id: wallet!.id },
          data: { balance: balanceAfter },
        });

        // Create wallet log
        const walletLog = await tx.walletLog.create({
          data: {
            walletId: wallet!.id,
            type: 'deposit',
            amount: body.amount,
            balanceBefore,
            balanceAfter,
            referenceId: completedPayment.id,
            description: rechargePackage
              ? `Recarga: ${rechargePackage.name}`
              : `Recarga de saldo: $${body.amount.toLocaleString('es-CL')}`,
          },
        });

        // If package has tickets, add them to student
        if (rechargePackage && rechargePackage.type === 'ticket' && rechargePackage.ticketCount) {
          // Check if student already has tickets of this type
          const existingTicket = await tx.studentTicket.findFirst({
            where: {
              studentId: body.studentId,
              ticketType: rechargePackage.ticketType || 'general',
            },
          });

          if (existingTicket) {
            await tx.studentTicket.update({
              where: { id: existingTicket.id },
              data: {
                quantity: existingTicket.quantity + rechargePackage.ticketCount,
              },
            });
          } else {
            await tx.studentTicket.create({
              data: {
                studentId: body.studentId,
                ticketType: rechargePackage.ticketType || 'general',
                quantity: rechargePackage.ticketCount,
              },
            });
          }
        }

        return {
          payment: completedPayment,
          wallet: updatedWallet,
          walletLog,
        };
      });

      return reply.status(201).send({
        success: true,
        message: `Pago de $${body.amount.toLocaleString('es-CL')} procesado exitosamente`,
        data: {
          payment: {
            id: result.payment.id,
            amount: result.payment.amount,
            status: result.payment.status,
            gateway: result.payment.gateway,
            gatewayTxId: result.payment.gatewayTxId,
            createdAt: result.payment.createdAt,
            completedAt: result.payment.completedAt,
          },
          wallet: {
            id: result.wallet.id,
            newBalance: result.wallet.balance,
          },
          walletLog: {
            id: result.walletLog.id,
            type: result.walletLog.type,
            amount: result.walletLog.amount,
            balanceBefore: result.walletLog.balanceBefore,
            balanceAfter: result.walletLog.balanceAfter,
            description: result.walletLog.description,
            createdAt: result.walletLog.createdAt,
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

      console.error('Payment init error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al procesar pago',
      });
    }
  });

  /**
   * GET /api/v1/payments/:id
   * Get payment details by ID
   */
  app.get('/:paymentId', async (request: FastifyRequest<{ Params: { paymentId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { paymentId } = request.params;

      const guardian = await getGuardian(decoded.userId);
      if (!guardian) {
        return reply.status(404).send({
          success: false,
          message: 'Perfil de apoderado no encontrado',
        });
      }

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
          rechargePackage: {
            select: { id: true, name: true, type: true, price: true },
          },
        },
      });

      if (!payment || payment.guardianId !== guardian.id) {
        return reply.status(404).send({
          success: false,
          message: 'Pago no encontrado',
        });
      }

      return reply.send({
        success: true,
        data: {
          id: payment.id,
          amount: payment.amount,
          gateway: payment.gateway,
          gatewayTxId: payment.gatewayTxId,
          status: payment.status,
          student: payment.student,
          package: payment.rechargePackage,
          createdAt: payment.createdAt,
          completedAt: payment.completedAt,
        },
      });
    } catch (error) {
      console.error('Get payment error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener pago',
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
