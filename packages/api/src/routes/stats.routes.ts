import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../utils/prisma.js';
import { authenticate, requireRole } from '../middleware/authorization.js';

/**
 * Stats Routes
 * Dashboard statistics for super_admin and school_admin users
 */
export async function statsRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/stats/dashboard
   * Get dashboard statistics
   *
   * @roles super_admin, school_admin
   * @description Returns aggregated statistics for the dashboard.
   *              If user is school_admin, data is filtered by their schoolId.
   */
  app.get(
    '/dashboard',
    {
      preHandler: [authenticate, requireRole('super_admin', 'school_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user!;
        const isSchoolAdmin = user.role === 'school_admin';
        const userSchoolId = user.schoolId;

        // Helper function to calculate percentage change
        const calculateChange = (current: number, previous: number): string => {
          if (previous === 0) {
            return current > 0 ? '+100%' : '0%';
          }
          const change = ((current - previous) / previous) * 100;
          const sign = change >= 0 ? '+' : '';
          return `${sign}${change.toFixed(1)}%`;
        };

        // Date ranges
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        // Build filters based on user role
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        void (isSchoolAdmin && userSchoolId ? { schoolId: userSchoolId } : {}); // Reserved for future use
        // For Transaction, filter through wallet -> student -> schoolId
        const transactionSchoolFilter = isSchoolAdmin && userSchoolId
          ? {
              wallet: {
                student: {
                  schoolId: userSchoolId,
                },
              },
            }
          : {};
        // For Payment, filter through student -> schoolId
        const paymentSchoolFilter = isSchoolAdmin && userSchoolId
          ? {
              student: {
                schoolId: userSchoolId,
              },
            }
          : {};

        // 1. Active Schools (super_admin only)
        let activeSchools = { value: 0, change: '0%' };
        if (!isSchoolAdmin) {
          const [currentSchools, previousSchools] = await Promise.all([
            prisma.school.count({ where: { active: true } }),
            prisma.school.count({
              where: {
                active: true,
                createdAt: { lt: monthStart },
              },
            }),
          ]);
          activeSchools = {
            value: currentSchools,
            change: calculateChange(currentSchools, previousSchools),
          };
        } else {
          // For school admins, just show if their school is active
          const school = userSchoolId
            ? await prisma.school.findUnique({
                where: { id: userSchoolId },
                select: { active: true },
              })
            : null;
          activeSchools = {
            value: school?.active ? 1 : 0,
            change: '0%',
          };
        }

        // 2. Total Users (Guardians)
        const guardianWhereClause = isSchoolAdmin && userSchoolId
          ? {
              students: {
                some: {
                  student: {
                    schoolId: userSchoolId,
                  },
                },
              },
            }
          : {};

        const [currentUsers, previousUsers] = await Promise.all([
          prisma.guardian.count({ where: guardianWhereClause }),
          prisma.guardian.count({
            where: {
              ...guardianWhereClause,
              createdAt: { lt: monthStart },
            },
          }),
        ]);

        const totalUsers = {
          value: currentUsers,
          change: calculateChange(currentUsers, previousUsers),
        };

        // 3. Transactions Today
        const transactionWhereToday = {
          createdAt: { gte: today },
          ...transactionSchoolFilter,
        };
        const transactionWhereYesterday = {
          createdAt: { gte: yesterday, lt: today },
          ...transactionSchoolFilter,
        };

        const [todayTransactions, yesterdayTransactions] = await Promise.all([
          prisma.transaction.count({ where: transactionWhereToday }),
          prisma.transaction.count({ where: transactionWhereYesterday }),
        ]);

        const transactionsToday = {
          value: todayTransactions,
          change: calculateChange(todayTransactions, yesterdayTransactions),
        };

        // 4. Revenue This Month (completed payments)
        const paymentWhereThisMonth = {
          status: 'completed',
          createdAt: { gte: monthStart },
          ...paymentSchoolFilter,
        };
        const paymentWhereLastMonth = {
          status: 'completed',
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
          ...paymentSchoolFilter,
        };

        const [thisMonthRevenue, lastMonthRevenue] = await Promise.all([
          prisma.payment.aggregate({
            _sum: { amount: true },
            where: paymentWhereThisMonth,
          }),
          prisma.payment.aggregate({
            _sum: { amount: true },
            where: paymentWhereLastMonth,
          }),
        ]);

        const currentRevenue = thisMonthRevenue._sum.amount || 0;
        const previousRevenue = lastMonthRevenue._sum.amount || 0;

        const revenueThisMonth = {
          value: currentRevenue,
          formatted: `$${currentRevenue.toLocaleString('es-CL')}`,
          change: calculateChange(currentRevenue, previousRevenue),
        };

        // 5. Recent Activity (last 10 transactions)
        const recentTransactions = await prisma.transaction.findMany({
          take: 10,
          where: transactionSchoolFilter,
          orderBy: { createdAt: 'desc' },
          include: {
            wallet: {
              include: {
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
        });

        const recentActivity = recentTransactions.map((tx) => ({
          id: tx.id,
          description: tx.description || `${tx.type} - ${tx.cafeteria.name}`,
          amount: tx.amount,
          type: tx.type,
          student: `${tx.wallet.student.firstName} ${tx.wallet.student.lastName}`,
          cafeteria: tx.cafeteria.name,
          createdAt: tx.createdAt.toISOString(),
        }));

        return reply.send({
          success: true,
          data: {
            stats: {
              activeSchools,
              totalUsers,
              transactionsToday,
              revenueThisMonth,
            },
            recentActivity,
          },
        });
      } catch (error) {
        console.error('Dashboard stats error:', error);
        return reply.status(500).send({
          success: false,
          message: 'Error al obtener estadísticas del dashboard',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}
