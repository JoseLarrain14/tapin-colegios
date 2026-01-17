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
const depositSchema = z.object({
  amount: z.number().int().positive('El monto debe ser positivo'),
  description: z.string().optional().default('Recarga de saldo'),
});

const adjustmentSchema = z.object({
  amount: z.number().int().refine((val) => val !== 0, { message: 'El monto no puede ser cero' }),
  description: z.string().min(1, 'Descripcion requerida'),
});

export async function walletsRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/wallets/:studentId
   * Get wallet details for a student
   */
  app.get('/:studentId', async (request: FastifyRequest<{ Params: { studentId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { studentId } = request.params;

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

      // Get wallet with logs
      const wallet = await prisma.wallet.findUnique({
        where: { studentId },
        include: {
          logs: {
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      });

      if (!wallet) {
        return reply.status(404).send({
          success: false,
          message: 'Billetera no encontrada',
        });
      }

      // Calculate sum of all wallet logs to verify integrity
      const logsSum = await prisma.walletLog.aggregate({
        where: { walletId: wallet.id },
        _sum: { amount: true },
      });

      return reply.send({
        success: true,
        data: {
          id: wallet.id,
          studentId: wallet.studentId,
          balance: wallet.balance,
          calculatedBalance: logsSum._sum.amount || 0,
          balanceMatches: wallet.balance === (logsSum._sum.amount || 0),
          recentLogs: wallet.logs.map(log => ({
            id: log.id,
            type: log.type,
            amount: log.amount,
            balanceBefore: log.balanceBefore,
            balanceAfter: log.balanceAfter,
            description: log.description,
            createdAt: log.createdAt,
          })),
        },
      });
    } catch (error) {
      console.error('Get wallet error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener billetera',
      });
    }
  });

  /**
   * GET /api/v1/wallets/:studentId/logs
   * Get all wallet logs for a student
   */
  app.get('/:studentId/logs', async (request: FastifyRequest<{ Params: { studentId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { studentId } = request.params;

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

      const wallet = await prisma.wallet.findUnique({
        where: { studentId },
      });

      if (!wallet) {
        return reply.status(404).send({
          success: false,
          message: 'Billetera no encontrada',
        });
      }

      const logs = await prisma.walletLog.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
      });

      const sum = logs.reduce((acc, log) => acc + log.amount, 0);

      return reply.send({
        success: true,
        data: {
          logs: logs.map(log => ({
            id: log.id,
            type: log.type,
            amount: log.amount,
            balanceBefore: log.balanceBefore,
            balanceAfter: log.balanceAfter,
            description: log.description,
            createdAt: log.createdAt,
          })),
          totalCount: logs.length,
          sumOfAmounts: sum,
          currentBalance: wallet.balance,
          balanceMatches: wallet.balance === sum,
        },
      });
    } catch (error) {
      console.error('Get wallet logs error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener historial de billetera',
      });
    }
  });

  /**
   * POST /api/v1/wallets/:studentId/deposit
   * Add balance to a student's wallet (mock payment)
   */
  app.post('/:studentId/deposit', async (request: FastifyRequest<{ Params: { studentId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { studentId } = request.params;
      const body = depositSchema.parse(request.body);

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

      // Get or create wallet
      let wallet = await prisma.wallet.findUnique({
        where: { studentId },
      });

      if (!wallet) {
        wallet = await prisma.wallet.create({
          data: {
            studentId,
            balance: 0,
          },
        });
      }

      // Perform deposit in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const balanceBefore = wallet!.balance;
        const balanceAfter = balanceBefore + body.amount;

        // Update wallet balance
        const updatedWallet = await tx.wallet.update({
          where: { id: wallet!.id },
          data: { balance: balanceAfter },
        });

        // Create wallet log
        const log = await tx.walletLog.create({
          data: {
            walletId: wallet!.id,
            type: 'deposit',
            amount: body.amount,
            balanceBefore,
            balanceAfter,
            description: body.description,
          },
        });

        return { wallet: updatedWallet, log };
      });

      return reply.status(201).send({
        success: true,
        message: `Deposito de $${body.amount.toLocaleString('es-CL')} realizado exitosamente`,
        data: {
          walletId: result.wallet.id,
          newBalance: result.wallet.balance,
          log: {
            id: result.log.id,
            type: result.log.type,
            amount: result.log.amount,
            balanceBefore: result.log.balanceBefore,
            balanceAfter: result.log.balanceAfter,
            description: result.log.description,
            createdAt: result.log.createdAt,
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

      console.error('Deposit error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al realizar deposito',
      });
    }
  });

  /**
   * POST /api/v1/wallets/:studentId/purchase
   * Deduct balance from a student's wallet (simulate purchase)
   */
  app.post('/:studentId/purchase', async (request: FastifyRequest<{ Params: { studentId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { studentId } = request.params;
      const body = z.object({
        amount: z.number().int().positive('El monto debe ser positivo'),
        description: z.string().optional().default('Compra en cafeteria'),
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

      const wallet = await prisma.wallet.findUnique({
        where: { studentId },
      });

      if (!wallet) {
        return reply.status(404).send({
          success: false,
          message: 'Billetera no encontrada',
        });
      }

      if (wallet.balance < body.amount) {
        return reply.status(400).send({
          success: false,
          message: 'Saldo insuficiente',
          data: {
            currentBalance: wallet.balance,
            requiredAmount: body.amount,
          },
        });
      }

      // Perform purchase in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore - body.amount;

        // Update wallet balance
        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: balanceAfter },
        });

        // Create wallet log with negative amount for purchase
        const log = await tx.walletLog.create({
          data: {
            walletId: wallet.id,
            type: 'purchase',
            amount: -body.amount, // Negative for purchases
            balanceBefore,
            balanceAfter,
            description: body.description,
          },
        });

        return { wallet: updatedWallet, log };
      });

      return reply.status(201).send({
        success: true,
        message: `Compra de $${body.amount.toLocaleString('es-CL')} realizada exitosamente`,
        data: {
          walletId: result.wallet.id,
          newBalance: result.wallet.balance,
          log: {
            id: result.log.id,
            type: result.log.type,
            amount: result.log.amount,
            balanceBefore: result.log.balanceBefore,
            balanceAfter: result.log.balanceAfter,
            description: result.log.description,
            createdAt: result.log.createdAt,
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

      console.error('Purchase error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al realizar compra',
      });
    }
  });

  /**
   * POST /api/v1/wallets/:studentId/adjustment
   * Make an adjustment to wallet balance (admin function, but exposed for testing)
   */
  app.post('/:studentId/adjustment', async (request: FastifyRequest<{ Params: { studentId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { studentId } = request.params;
      const body = adjustmentSchema.parse(request.body);

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

      const wallet = await prisma.wallet.findUnique({
        where: { studentId },
      });

      if (!wallet) {
        return reply.status(404).send({
          success: false,
          message: 'Billetera no encontrada',
        });
      }

      const newBalance = wallet.balance + body.amount;
      if (newBalance < 0) {
        return reply.status(400).send({
          success: false,
          message: 'El ajuste resultaria en saldo negativo',
          data: {
            currentBalance: wallet.balance,
            adjustmentAmount: body.amount,
            resultingBalance: newBalance,
          },
        });
      }

      // Perform adjustment in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore + body.amount;

        // Update wallet balance
        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: balanceAfter },
        });

        // Create wallet log
        const log = await tx.walletLog.create({
          data: {
            walletId: wallet.id,
            type: 'adjustment',
            amount: body.amount,
            balanceBefore,
            balanceAfter,
            description: body.description,
          },
        });

        return { wallet: updatedWallet, log };
      });

      return reply.status(201).send({
        success: true,
        message: `Ajuste de $${Math.abs(body.amount).toLocaleString('es-CL')} ${body.amount > 0 ? 'agregado' : 'deducido'} exitosamente`,
        data: {
          walletId: result.wallet.id,
          newBalance: result.wallet.balance,
          log: {
            id: result.log.id,
            type: result.log.type,
            amount: result.log.amount,
            balanceBefore: result.log.balanceBefore,
            balanceAfter: result.log.balanceAfter,
            description: result.log.description,
            createdAt: result.log.createdAt,
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

      console.error('Adjustment error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al realizar ajuste',
      });
    }
  });

  /**
   * GET /api/v1/wallets/:studentId/tickets
   * Get all tickets for a student
   */
  app.get('/:studentId/tickets', async (request: FastifyRequest<{ Params: { studentId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { studentId } = request.params;

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

      // Get all tickets for the student
      const tickets = await prisma.studentTicket.findMany({
        where: { studentId },
        orderBy: { ticketType: 'asc' },
      });

      return reply.send({
        success: true,
        data: {
          studentId,
          tickets: tickets.map(ticket => ({
            id: ticket.id,
            ticketType: ticket.ticketType,
            quantity: ticket.quantity,
            expiresAt: ticket.expiresAt,
            createdAt: ticket.createdAt,
            updatedAt: ticket.updatedAt,
          })),
          totalTickets: tickets.reduce((sum, t) => sum + t.quantity, 0),
        },
      });
    } catch (error) {
      console.error('Get tickets error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener tickets',
      });
    }
  });
}
