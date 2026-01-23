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
const listTransactionsSchema = z.object({
  schoolId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export async function transactionsRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/transactions
   * List transactions with pagination and filters
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = listTransactionsSchema.parse(request.query);

      const { schoolId, userId, startDate, endDate, page, limit } = query;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      // Filter by school (through wallet -> student -> school)
      if (schoolId) {
        where.wallet = {
          student: {
            schoolId,
          },
        };
      }

      // Filter by user (through wallet -> student)
      if (userId) {
        where.wallet = {
          student: {
            guardians: {
              some: {
                guardian: {
                  userId,
                },
              },
            },
          },
        };
      }

      // Filter by date range
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate);
        }
      }

      // Execute query with pagination
      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          select: {
            id: true,
            type: true,
            amount: true,
            description: true,
            items: true,
            ticketsUsed: true,
            validationMethod: true,
            source: true,
            createdAt: true,
            wallet: {
              select: {
                id: true,
                student: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    rut: true,
                    grade: true,
                    section: true,
                    photoUrl: true,
                    school: {
                      select: {
                        id: true,
                        name: true,
                        code: true,
                      },
                    },
                  },
                },
              },
            },
            cafeteria: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
            validator: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.transaction.count({ where }),
      ]);

      // Format response
      const formattedTransactions = transactions.map((tx) => {
        let items = null;
        let ticketsUsed = null;
        try {
          items = tx.items ? JSON.parse(tx.items) : null;
        } catch (e) {
          console.error('Error parsing transaction items:', e);
        }
        try {
          ticketsUsed = tx.ticketsUsed ? JSON.parse(tx.ticketsUsed) : null;
        } catch (e) {
          console.error('Error parsing tickets used:', e);
        }
        return {
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          items,
          ticketsUsed,
          validationMethod: tx.validationMethod,
          source: tx.source,
          createdAt: tx.createdAt,
          student: {
            id: tx.wallet.student.id,
            firstName: tx.wallet.student.firstName,
            lastName: tx.wallet.student.lastName,
            fullName: `${tx.wallet.student.firstName} ${tx.wallet.student.lastName}`,
            rut: tx.wallet.student.rut,
            grade: tx.wallet.student.grade,
            section: tx.wallet.student.section,
            photoUrl: tx.wallet.student.photoUrl,
            school: tx.wallet.student.school,
          },
          cafeteria: tx.cafeteria,
          validator: tx.validator,
        };
      });

      const totalPages = Math.ceil(total / limit);

      return reply.send({
        success: true,
        data: {
          transactions: formattedTransactions,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasMore: page < totalPages,
          },
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: 'Parametros de busqueda invalidos',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      console.error('List transactions error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al listar transacciones',
      });
    }
  });

  /**
   * GET /api/v1/transactions/:id
   * Get transaction by ID with full details
   */
  app.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;

      const transaction = await prisma.transaction.findUnique({
        where: { id },
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          items: true,
          ticketsUsed: true,
          validationMethod: true,
          source: true,
          createdAt: true,
          wallet: {
            select: {
              id: true,
              balance: true,
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  rut: true,
                  grade: true,
                  section: true,
                  photoUrl: true,
                  dailyLimit: true,
                  school: {
                    select: {
                      id: true,
                      name: true,
                      code: true,
                      city: true,
                      region: true,
                      logoUrl: true,
                    },
                  },
                  guardians: {
                    select: {
                      guardian: {
                        select: {
                          id: true,
                          firstName: true,
                          lastName: true,
                          phone: true,
                          relationship: true,
                          user: {
                            select: {
                              email: true,
                            },
                          },
                        },
                      },
                      isPrimary: true,
                    },
                  },
                },
              },
            },
          },
          cafeteria: {
            select: {
              id: true,
              name: true,
              description: true,
              config: true,
              school: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
          validator: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (!transaction) {
        return reply.status(404).send({
          success: false,
          message: 'Transaccion no encontrada',
        });
      }

      // Format response with parsed JSON fields
      const formattedTransaction = {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        items: transaction.items ? JSON.parse(transaction.items) : null,
        ticketsUsed: transaction.ticketsUsed ? JSON.parse(transaction.ticketsUsed) : null,
        validationMethod: transaction.validationMethod,
        source: transaction.source,
        createdAt: transaction.createdAt,
        wallet: {
          id: transaction.wallet.id,
          currentBalance: transaction.wallet.balance,
        },
        student: {
          id: transaction.wallet.student.id,
          firstName: transaction.wallet.student.firstName,
          lastName: transaction.wallet.student.lastName,
          fullName: `${transaction.wallet.student.firstName} ${transaction.wallet.student.lastName}`,
          rut: transaction.wallet.student.rut,
          grade: transaction.wallet.student.grade,
          section: transaction.wallet.student.section,
          photoUrl: transaction.wallet.student.photoUrl,
          dailyLimit: transaction.wallet.student.dailyLimit,
          school: transaction.wallet.student.school,
          guardians: transaction.wallet.student.guardians.map((gs) => ({
            ...gs.guardian,
            email: gs.guardian.user.email,
            isPrimary: gs.isPrimary,
          })),
        },
        cafeteria: {
          ...transaction.cafeteria,
          config: transaction.cafeteria.config ? JSON.parse(transaction.cafeteria.config) : null,
        },
        validator: transaction.validator,
      };

      return reply.send({
        success: true,
        data: formattedTransaction,
      });
    } catch (error) {
      console.error('Get transaction error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener transaccion',
      });
    }
  });

  /**
   * GET /api/v1/transactions/my-consumptions
   * Get ticket consumptions for the guardian's students (used from mobile app)
   */
  app.get('/my-consumptions', async (request: FastifyRequest, reply: FastifyReply) => {
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

      // Get all students linked to this guardian
      const guardianStudents = await prisma.guardianStudent.findMany({
        where: { guardianId: guardian.id },
        select: { studentId: true },
      });

      const studentIds = guardianStudents.map(gs => gs.studentId);

      if (studentIds.length === 0) {
        return reply.send({
          success: true,
          data: {
            consumptions: [],
            totalConsumptions: 0,
          },
        });
      }

      // Get all transactions where ticketsUsed is NOT NULL for these students
      const transactions = await prisma.transaction.findMany({
        where: {
          ticketsUsed: { not: null },
          wallet: {
            studentId: { in: studentIds },
          },
        },
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          ticketsUsed: true,
          validationMethod: true,
          source: true,
          createdAt: true,
          wallet: {
            select: {
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          cafeteria: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Format response
      const consumptions = transactions.map(tx => {
        let ticketsUsed = null;
        try {
          ticketsUsed = tx.ticketsUsed ? JSON.parse(tx.ticketsUsed) : null;
        } catch (e) {
          console.error('Error parsing tickets used:', e);
        }

        // Extract ticket info for display
        const ticketInfo = Array.isArray(ticketsUsed) ? ticketsUsed[0] : ticketsUsed;
        const ticketType = ticketInfo?.type || 'almuerzo';
        const ticketQuantity = ticketInfo?.quantity || 1;

        return {
          id: tx.id,
          type: 'ticket_consumption',
          ticketsUsed,
          ticketType,
          ticketQuantity,
          description: tx.description,
          validationMethod: tx.validationMethod,
          source: tx.source,
          createdAt: tx.createdAt,
          student: {
            id: tx.wallet.student.id,
            firstName: tx.wallet.student.firstName,
            lastName: tx.wallet.student.lastName,
          },
          cafeteria: tx.cafeteria,
        };
      });

      return reply.send({
        success: true,
        data: {
          consumptions,
          totalConsumptions: consumptions.length,
        },
      });
    } catch (error) {
      console.error('Get my consumptions error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener consumos de tickets',
      });
    }
  });
}
