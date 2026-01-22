import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import prisma from '../utils/prisma.js';
import { authService } from '../services/auth.service.js';
import { validateCafeteriaAccess } from './admin.routes.js';

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

// Validation schemas
const updatePatternDaySchema = z.object({
  menuItemIds: z.array(z.string()),
});

const setDateMenuSchema = z.object({
  menuItemIds: z.array(z.string()),
  note: z.string().optional(),
});

// Day names helper
const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

export async function menuPlanningRoutes(app: FastifyInstance) {
  // =========================================================================
  // WEEKLY PATTERN ENDPOINTS (US-105)
  // =========================================================================

  /**
   * GET /api/v1/menu-planning/:cafeteriaId/weekly-pattern
   * Get the weekly pattern for a cafeteria
   */
  app.get('/:cafeteriaId/weekly-pattern', async (request: FastifyRequest<{ Params: { cafeteriaId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId } = request.params;

      // Validate cafeteria access
      const result = await validateCafeteriaAccess(cafeteriaId, decoded, reply);
      if (!result) return;
      // Access validated

      // Get or create weekly pattern
      let pattern = await prisma.weeklyPattern.findUnique({
        where: { cafeteriaId },
        include: {
          days: {
            include: {
              items: {
                include: { menuItem: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
            orderBy: { dayOfWeek: 'asc' },
          },
        },
      });

      // Create empty pattern if doesn't exist
      if (!pattern) {
        pattern = await prisma.weeklyPattern.create({
          data: {
            cafeteriaId,
            active: true,
          },
          include: {
            days: {
              include: {
                items: {
                  include: { menuItem: true },
                  orderBy: { sortOrder: 'asc' },
                },
              },
              orderBy: { dayOfWeek: 'asc' },
            },
          },
        });
      }

      // Build days object (1-5)
      const daysData: any[] = [];
      for (let day = 1; day <= 5; day++) {
        const patternDay = pattern.days.find(d => d.dayOfWeek === day);
        daysData.push({
          dayOfWeek: day,
          dayName: DAY_NAMES[day],
          items: patternDay?.items.map(item => ({
            id: item.id,
            menuItemId: item.menuItemId,
            sortOrder: item.sortOrder,
            menuItem: {
              id: item.menuItem.id,
              name: item.menuItem.name,
              description: item.menuItem.description,
              price: item.menuItem.price,
              category: item.menuItem.category,
              imageUrl: item.menuItem.imageUrl,
            },
          })) || [],
        });
      }

      return reply.send({
        success: true,
        data: {
          id: pattern.id,
          cafeteriaId: pattern.cafeteriaId,
          active: pattern.active,
          days: daysData,
          createdAt: pattern.createdAt,
          updatedAt: pattern.updatedAt,
        },
      });
    } catch (error) {
      console.error('Get weekly pattern error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener patron semanal',
      });
    }
  });

  /**
   * PUT /api/v1/menu-planning/:cafeteriaId/weekly-pattern/day/:dayOfWeek
   * Update items for a specific day in the weekly pattern
   */
  app.put('/:cafeteriaId/weekly-pattern/day/:dayOfWeek', async (request: FastifyRequest<{ Params: { cafeteriaId: string; dayOfWeek: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId } = request.params;
      const dayOfWeek = parseInt(request.params.dayOfWeek);
      const body = updatePatternDaySchema.parse(request.body);

      // Validate day of week
      if (isNaN(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 5) {
        return reply.status(400).send({
          success: false,
          message: 'Dia de la semana invalido (1-5)',
        });
      }

      // Validate cafeteria access
      const result = await validateCafeteriaAccess(cafeteriaId, decoded, reply);
      if (!result) return;
      // Access validated

      // Get or create weekly pattern
      let pattern = await prisma.weeklyPattern.findUnique({
        where: { cafeteriaId },
      });

      if (!pattern) {
        pattern = await prisma.weeklyPattern.create({
          data: {
            cafeteriaId,
            active: true,
          },
        });
      }

      // Update pattern day in transaction
      await prisma.$transaction(async (tx) => {
        // Get or create pattern day
        let patternDay = await tx.weeklyPatternDay.findUnique({
          where: {
            patternId_dayOfWeek: {
              patternId: pattern!.id,
              dayOfWeek,
            },
          },
        });

        if (!patternDay) {
          patternDay = await tx.weeklyPatternDay.create({
            data: {
              patternId: pattern!.id,
              dayOfWeek,
            },
          });
        }

        // Delete existing items
        await tx.weeklyPatternItem.deleteMany({
          where: { patternDayId: patternDay.id },
        });

        // Create new items
        if (body.menuItemIds.length > 0) {
          await tx.weeklyPatternItem.createMany({
            data: body.menuItemIds.map((menuItemId, index) => ({
              patternDayId: patternDay!.id,
              menuItemId,
              sortOrder: index,
            })),
          });
        }
      });

      // Fetch updated data
      const updatedPattern = await prisma.weeklyPattern.findUnique({
        where: { cafeteriaId },
        include: {
          days: {
            where: { dayOfWeek },
            include: {
              items: {
                include: { menuItem: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
        },
      });

      const day = updatedPattern?.days[0];

      return reply.send({
        success: true,
        message: `Patron actualizado para ${DAY_NAMES[dayOfWeek]}`,
        data: {
          dayOfWeek,
          dayName: DAY_NAMES[dayOfWeek],
          items: day?.items.map(item => ({
            id: item.id,
            menuItemId: item.menuItemId,
            sortOrder: item.sortOrder,
            menuItem: {
              id: item.menuItem.id,
              name: item.menuItem.name,
              price: item.menuItem.price,
            },
          })) || [],
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

      console.error('Update pattern day error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al actualizar patron',
      });
    }
  });

  // =========================================================================
  // DAILY ASSIGNMENTS ENDPOINTS (US-106)
  // =========================================================================

  /**
   * GET /api/v1/menu-planning/:cafeteriaId/calendar
   * Get daily assignments for a date range
   */
  app.get('/:cafeteriaId/calendar', async (request: FastifyRequest<{ Params: { cafeteriaId: string }; Querystring: { from?: string; to?: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId } = request.params;
      const { from, to } = request.query;

      // Validate cafeteria access
      const result = await validateCafeteriaAccess(cafeteriaId, decoded, reply);
      if (!result) return;
      // Access validated

      // Parse dates
      const fromDate = from ? new Date(from) : new Date();
      const toDate = to ? new Date(to) : new Date(fromDate.getTime() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

      // Validate dates
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return reply.status(400).send({
          success: false,
          message: 'Fechas invalidas. Use formato YYYY-MM-DD',
        });
      }

      // Set time to start/end of day
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);

      const assignments = await prisma.dailyMenuAssignment.findMany({
        where: {
          cafeteriaId,
          date: {
            gte: fromDate,
            lte: toDate,
          },
        },
        include: {
          items: {
            include: { menuItem: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { date: 'asc' },
      });

      return reply.send({
        success: true,
        data: {
          from: fromDate.toISOString().split('T')[0],
          to: toDate.toISOString().split('T')[0],
          assignments: assignments.map(a => ({
            id: a.id,
            date: a.date.toISOString().split('T')[0],
            note: a.note,
            itemCount: a.items.length,
            items: a.items.map(item => ({
              id: item.id,
              menuItemId: item.menuItemId,
              menuItem: {
                id: item.menuItem.id,
                name: item.menuItem.name,
                price: item.menuItem.price,
                category: item.menuItem.category,
              },
            })),
          })),
          totalDays: assignments.length,
        },
      });
    } catch (error) {
      console.error('Get calendar error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener calendario',
      });
    }
  });

  /**
   * GET /api/v1/menu-planning/:cafeteriaId/date/:date
   * Get menu assignment for a specific date
   */
  app.get('/:cafeteriaId/date/:date', async (request: FastifyRequest<{ Params: { cafeteriaId: string; date: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId, date } = request.params;

      // Parse date as local time (not UTC) to avoid timezone issues
      const dateParts = date.split('-');
      if (dateParts.length !== 3) {
        return reply.status(400).send({
          success: false,
          message: 'Fecha invalida. Use formato YYYY-MM-DD',
        });
      }
      const [year, month, day] = dateParts.map(Number);
      const targetDate = new Date(year, month - 1, day); // Local timezone
      if (isNaN(targetDate.getTime())) {
        return reply.status(400).send({
          success: false,
          message: 'Fecha invalida. Use formato YYYY-MM-DD',
        });
      }

      // Validate cafeteria access
      const result = await validateCafeteriaAccess(cafeteriaId, decoded, reply);
      if (!result) return;
      // Access validated

      // Set time to start of day for comparison
      targetDate.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const assignment = await prisma.dailyMenuAssignment.findFirst({
        where: {
          cafeteriaId,
          date: {
            gte: targetDate,
            lte: endOfDay,
          },
        },
        include: {
          items: {
            include: { menuItem: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      if (!assignment) {
        return reply.status(404).send({
          success: false,
          message: 'No hay asignacion para esta fecha',
        });
      }

      const dayOfWeek = targetDate.getDay() || 7; // Convert 0 (Sunday) to 7

      return reply.send({
        success: true,
        data: {
          id: assignment.id,
          date: assignment.date.toISOString().split('T')[0],
          dayOfWeek,
          dayName: DAY_NAMES[dayOfWeek],
          note: assignment.note,
          items: assignment.items.map(item => ({
            id: item.id,
            menuItemId: item.menuItemId,
            sortOrder: item.sortOrder,
            menuItem: {
              id: item.menuItem.id,
              name: item.menuItem.name,
              description: item.menuItem.description,
              price: item.menuItem.price,
              category: item.menuItem.category,
              imageUrl: item.menuItem.imageUrl,
            },
          })),
          createdAt: assignment.createdAt,
          updatedAt: assignment.updatedAt,
        },
      });
    } catch (error) {
      console.error('Get date menu error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener menu de la fecha',
      });
    }
  });

  /**
   * PUT /api/v1/menu-planning/:cafeteriaId/date/:date
   * Set or update menu for a specific date
   */
  app.put('/:cafeteriaId/date/:date', async (request: FastifyRequest<{ Params: { cafeteriaId: string; date: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId, date } = request.params;
      const body = setDateMenuSchema.parse(request.body);

      // Parse date as local time (not UTC) to avoid timezone issues
      const dateParts = date.split('-');
      if (dateParts.length !== 3) {
        return reply.status(400).send({
          success: false,
          message: 'Fecha invalida. Use formato YYYY-MM-DD',
        });
      }
      const [year, month, day] = dateParts.map(Number);
      const targetDate = new Date(year, month - 1, day); // Local timezone
      if (isNaN(targetDate.getTime())) {
        return reply.status(400).send({
          success: false,
          message: 'Fecha invalida. Use formato YYYY-MM-DD',
        });
      }

      // Validate cafeteria access
      const result = await validateCafeteriaAccess(cafeteriaId, decoded, reply);
      if (!result) return;
      // Access validated

      // Set time to start of day
      targetDate.setHours(0, 0, 0, 0);

      // Upsert assignment in transaction
      const assignment = await prisma.$transaction(async (tx) => {
        // Find existing assignment
        const existingAssignment = await tx.dailyMenuAssignment.findFirst({
          where: {
            cafeteriaId,
            date: targetDate,
          },
        });

        let assignmentId: string;

        if (existingAssignment) {
          // Update existing
          assignmentId = existingAssignment.id;
          await tx.dailyMenuAssignment.update({
            where: { id: existingAssignment.id },
            data: { note: body.note },
          });
          // Delete existing items
          await tx.dailyMenuAssignmentItem.deleteMany({
            where: { assignmentId: existingAssignment.id },
          });
        } else {
          // Create new
          const newAssignment = await tx.dailyMenuAssignment.create({
            data: {
              cafeteriaId,
              date: targetDate,
              note: body.note,
            },
          });
          assignmentId = newAssignment.id;
        }

        // Create new items
        if (body.menuItemIds.length > 0) {
          await tx.dailyMenuAssignmentItem.createMany({
            data: body.menuItemIds.map((menuItemId, index) => ({
              assignmentId,
              menuItemId,
              sortOrder: index,
            })),
          });
        }

        return tx.dailyMenuAssignment.findUnique({
          where: { id: assignmentId },
          include: {
            items: {
              include: { menuItem: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        });
      });

      const dayOfWeek = targetDate.getDay() || 7;

      return reply.send({
        success: true,
        message: `Menu asignado para ${date}`,
        data: {
          id: assignment!.id,
          date: assignment!.date.toISOString().split('T')[0],
          dayOfWeek,
          dayName: DAY_NAMES[dayOfWeek],
          note: assignment!.note,
          items: assignment!.items.map(item => ({
            id: item.id,
            menuItemId: item.menuItemId,
            menuItem: {
              id: item.menuItem.id,
              name: item.menuItem.name,
              price: item.menuItem.price,
            },
          })),
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

      console.error('Set date menu error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al asignar menu',
      });
    }
  });

  /**
   * DELETE /api/v1/menu-planning/:cafeteriaId/date/:date
   * Remove assignment for a specific date (reverts to weekly pattern)
   */
  app.delete('/:cafeteriaId/date/:date', async (request: FastifyRequest<{ Params: { cafeteriaId: string; date: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId, date } = request.params;

      // Parse date as local time (not UTC) to avoid timezone issues
      const dateParts = date.split('-');
      if (dateParts.length !== 3) {
        return reply.status(400).send({
          success: false,
          message: 'Fecha invalida. Use formato YYYY-MM-DD',
        });
      }
      const [year, month, day] = dateParts.map(Number);
      const targetDate = new Date(year, month - 1, day); // Local timezone
      if (isNaN(targetDate.getTime())) {
        return reply.status(400).send({
          success: false,
          message: 'Fecha invalida. Use formato YYYY-MM-DD',
        });
      }

      // Validate cafeteria access
      const result = await validateCafeteriaAccess(cafeteriaId, decoded, reply);
      if (!result) return;
      // Access validated

      // Set time to start of day
      targetDate.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Find and delete assignment
      const assignment = await prisma.dailyMenuAssignment.findFirst({
        where: {
          cafeteriaId,
          date: {
            gte: targetDate,
            lte: endOfDay,
          },
        },
      });

      if (!assignment) {
        // Idempotent: if no assignment exists, consider it already cleared
        return reply.send({
          success: true,
          message: `No habia asignacion para ${date}. Se usa el patron semanal.`,
        });
      }

      await prisma.dailyMenuAssignment.delete({
        where: { id: assignment.id },
      });

      return reply.send({
        success: true,
        message: `Asignacion eliminada para ${date}. Se usara el patron semanal.`,
      });
    } catch (error) {
      console.error('Delete date menu error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al eliminar asignacion',
      });
    }
  });

  // =========================================================================
  // MENU RESOLUTION ENDPOINT (US-107)
  // =========================================================================

  /**
   * GET /api/v1/menu-planning/:cafeteriaId/resolve/:date
   * Resolve menu for a specific date with fallback logic:
   * 1. Daily assignment (if exists)
   * 2. Weekly pattern (if exists)
   * 3. Default available items (fallback)
   */
  app.get('/:cafeteriaId/resolve/:date', async (request: FastifyRequest<{ Params: { cafeteriaId: string; date: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId, date } = request.params;

      // Parse date as local time (not UTC) to avoid timezone issues
      const dateParts = date.split('-');
      if (dateParts.length !== 3) {
        return reply.status(400).send({
          success: false,
          message: 'Fecha invalida. Use formato YYYY-MM-DD',
        });
      }
      const [year, month, day] = dateParts.map(Number);
      const targetDate = new Date(year, month - 1, day); // Local timezone
      if (isNaN(targetDate.getTime())) {
        return reply.status(400).send({
          success: false,
          message: 'Fecha invalida. Use formato YYYY-MM-DD',
        });
      }

      // Validate cafeteria access (read mode allows guardians to see menu)
      const result = await validateCafeteriaAccess(cafeteriaId, decoded, reply, 'read');
      if (!result) return;

      // Fetch cafeteria with school relation for response
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

      // Set time to start of day
      targetDate.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const dayOfWeek = targetDate.getDay() || 7; // 1=Mon, ..., 7=Sun

      // 1. Try daily assignment first
      const assignment = await prisma.dailyMenuAssignment.findFirst({
        where: {
          cafeteriaId,
          date: {
            gte: targetDate,
            lte: endOfDay,
          },
        },
        include: {
          items: {
            include: { menuItem: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      if (assignment && assignment.items.length > 0) {
        return reply.send({
          success: true,
          data: {
            cafeteria: {
              id: cafeteria.id,
              name: cafeteria.name,
              schoolName: cafeteria.school.name,
            },
            date: targetDate.toISOString().split('T')[0],
            dayOfWeek,
            dayName: DAY_NAMES[dayOfWeek],
            source: 'assignment',
            note: assignment.note,
            items: assignment.items.map(item => ({
              id: item.menuItem.id,
              name: item.menuItem.name,
              description: item.menuItem.description,
              price: item.menuItem.price,
              category: item.menuItem.category,
              imageUrl: item.menuItem.imageUrl,
            })),
            totalItems: assignment.items.length,
          },
        });
      }

      // 2. Try weekly pattern
      const pattern = await prisma.weeklyPattern.findUnique({
        where: { cafeteriaId },
        include: {
          days: {
            where: { dayOfWeek },
            include: {
              items: {
                include: { menuItem: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
        },
      });

      // If weekly pattern exists and is active, use it (even if items is empty for this day)
      if (pattern && pattern.active) {
        const patternDay = pattern.days[0];
        const items = patternDay?.items || [];

        return reply.send({
          success: true,
          data: {
            cafeteria: {
              id: cafeteria.id,
              name: cafeteria.name,
              schoolName: cafeteria.school.name,
            },
            date: targetDate.toISOString().split('T')[0],
            dayOfWeek,
            dayName: DAY_NAMES[dayOfWeek],
            source: 'pattern',
            items: items.map(item => ({
              id: item.menuItem.id,
              name: item.menuItem.name,
              description: item.menuItem.description,
              price: item.menuItem.price,
              category: item.menuItem.category,
              imageUrl: item.menuItem.imageUrl,
            })),
            totalItems: items.length,
          },
        });
      }

      // 3. Fallback ONLY if no weekly pattern exists
      // This ensures that once a cafeteria sets up a weekly pattern,
      // only configured days will show items
      const menuItems = await prisma.menuItem.findMany({
        where: {
          cafeteriaId,
          available: true,
        },
      });

      const availableItems = menuItems.filter(item => {
        try {
          const days = JSON.parse(item.availableDays) as number[];
          return days.includes(dayOfWeek);
        } catch {
          return false;
        }
      });

      return reply.send({
        success: true,
        data: {
          cafeteria: {
            id: cafeteria.id,
            name: cafeteria.name,
            schoolName: cafeteria.school.name,
          },
          date: targetDate.toISOString().split('T')[0],
          dayOfWeek,
          dayName: DAY_NAMES[dayOfWeek],
          source: 'default',
          items: availableItems.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            category: item.category,
            imageUrl: item.imageUrl,
          })),
          totalItems: availableItems.length,
        },
      });
    } catch (error) {
      console.error('Resolve menu error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al resolver menu',
      });
    }
  });
}
