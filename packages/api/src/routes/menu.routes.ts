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
const createMenuItemSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().optional(),
  price: z.number().int().positive('El precio debe ser positivo'),
  category: z.string().optional(),
  imageUrl: z.string().url().optional().nullable(),
  available: z.boolean().optional().default(true),
  availableDays: z.array(z.number().int().min(1).max(7)).optional().default([1, 2, 3, 4, 5]),
});

const updateMenuItemSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  price: z.number().int().positive().optional(),
  category: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  available: z.boolean().optional(),
  availableDays: z.array(z.number().int().min(1).max(7)).optional(),
});

export async function menuRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/menu/:cafeteriaId
   * Get all menu items for a cafeteria
   */
  app.get('/:cafeteriaId', async (request: FastifyRequest<{ Params: { cafeteriaId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId } = request.params;

      // Validate cafeteria access
      const result = await validateCafeteriaAccess(cafeteriaId, decoded, reply);
      if (!result) return;
      const { cafeteria } = result;

      const menuItems = await prisma.menuItem.findMany({
        where: { cafeteriaId },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' },
        ],
      });

      return reply.send({
        success: true,
        data: {
          cafeteria: {
            id: cafeteria.id,
            name: cafeteria.name,
            schoolName: cafeteria.school.name,
          },
          items: menuItems.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            category: item.category,
            imageUrl: item.imageUrl,
            available: item.available,
            availableDays: JSON.parse(item.availableDays),
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          })),
          totalItems: menuItems.length,
        },
      });
    } catch (error) {
      console.error('Get menu error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener menu',
      });
    }
  });

  /**
   * GET /api/v1/menu/:cafeteriaId/day/:dayOfWeek
   * Get menu items available on a specific day
   * Query params: timeSlot (breakfast, lunch, snack) - optional filter
   */
  app.get('/:cafeteriaId/day/:dayOfWeek', async (request: FastifyRequest<{ Params: { cafeteriaId: string; dayOfWeek: string }; Querystring: { timeSlot?: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId, dayOfWeek } = request.params;
      const { timeSlot } = request.query as { timeSlot?: string };
      const day = parseInt(dayOfWeek);

      if (isNaN(day) || day < 1 || day > 7) {
        return reply.status(400).send({
          success: false,
          message: 'Dia de la semana invalido (1-7)',
        });
      }

      // Validate time slot if provided
      const validTimeSlots = ['breakfast', 'lunch', 'snack'];
      if (timeSlot && !validTimeSlots.includes(timeSlot)) {
        return reply.status(400).send({
          success: false,
          message: 'Horario invalido. Use: breakfast, lunch, o snack',
        });
      }

      // Validate cafeteria access
      const result = await validateCafeteriaAccess(cafeteriaId, decoded, reply);
      if (!result) return;
      const { cafeteria } = result;

      const allMenuItems = await prisma.menuItem.findMany({
        where: {
          cafeteriaId,
          available: true,
        },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' },
        ],
      });

      // Filter by available days and time slot
      const availableItems = allMenuItems.filter(item => {
        const days = JSON.parse(item.availableDays) as number[];
        if (!days.includes(day)) return false;

        // If time slot is specified, also filter by it
        if (timeSlot) {
          try {
            const timeSlots = JSON.parse((item as any).availableTimeSlots || '["breakfast","lunch","snack"]') as string[];
            return timeSlots.includes(timeSlot);
          } catch {
            // If parsing fails, include the item (backward compatibility)
            return true;
          }
        }

        return true;
      });

      const dayNames = ['', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
      const timeSlotLabels: Record<string, string> = {
        breakfast: 'Desayuno (7:00-9:00)',
        lunch: 'Almuerzo (12:00-14:00)',
        snack: 'Once (15:00-17:00)',
      };

      return reply.send({
        success: true,
        data: {
          cafeteria: {
            id: cafeteria.id,
            name: cafeteria.name,
            schoolName: cafeteria.school.name,
          },
          dayOfWeek: day,
          dayName: dayNames[day],
          timeSlot: timeSlot || null,
          timeSlotLabel: timeSlot ? timeSlotLabels[timeSlot] : null,
          availableTimeSlots: validTimeSlots.map(slot => ({
            value: slot,
            label: timeSlotLabels[slot],
          })),
          items: availableItems.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            category: item.category,
            imageUrl: item.imageUrl,
            available: item.available,
            availableDays: JSON.parse(item.availableDays),
            availableTimeSlots: (() => {
              try {
                return JSON.parse((item as any).availableTimeSlots || '["breakfast","lunch","snack"]');
              } catch {
                return ['breakfast', 'lunch', 'snack'];
              }
            })(),
          })),
          totalItems: availableItems.length,
        },
      });
    } catch (error) {
      console.error('Get menu by day error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener menu por dia',
      });
    }
  });

  /**
   * POST /api/v1/menu/:cafeteriaId
   * Create a new menu item (for testing purposes)
   */
  app.post('/:cafeteriaId', async (request: FastifyRequest<{ Params: { cafeteriaId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId } = request.params;
      const body = createMenuItemSchema.parse(request.body);

      // Validate cafeteria access
      const result = await validateCafeteriaAccess(cafeteriaId, decoded, reply);
      if (!result) return;

      const menuItem = await prisma.menuItem.create({
        data: {
          cafeteriaId,
          name: body.name,
          description: body.description,
          price: body.price,
          category: body.category,
          imageUrl: body.imageUrl,
          available: body.available,
          availableDays: JSON.stringify(body.availableDays),
        },
      });

      return reply.status(201).send({
        success: true,
        message: 'Item de menu creado exitosamente',
        data: {
          id: menuItem.id,
          name: menuItem.name,
          description: menuItem.description,
          price: menuItem.price,
          category: menuItem.category,
          imageUrl: menuItem.imageUrl,
          available: menuItem.available,
          availableDays: JSON.parse(menuItem.availableDays),
          createdAt: menuItem.createdAt,
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

      console.error('Create menu item error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al crear item de menu',
      });
    }
  });

  /**
   * PUT /api/v1/menu/:cafeteriaId/:itemId
   * Update a menu item
   */
  app.put('/:cafeteriaId/:itemId', async (request: FastifyRequest<{ Params: { cafeteriaId: string; itemId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId, itemId } = request.params;
      const body = updateMenuItemSchema.parse(request.body);

      // Validate cafeteria access
      const result = await validateCafeteriaAccess(cafeteriaId, decoded, reply);
      if (!result) return;

      // Check item exists and belongs to cafeteria
      const existingItem = await prisma.menuItem.findUnique({
        where: { id: itemId },
      });

      if (!existingItem || existingItem.cafeteriaId !== cafeteriaId) {
        return reply.status(404).send({
          success: false,
          message: 'Item de menu no encontrado',
        });
      }

      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.price !== undefined) updateData.price = body.price;
      if (body.category !== undefined) updateData.category = body.category;
      if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
      if (body.available !== undefined) updateData.available = body.available;
      if (body.availableDays !== undefined) updateData.availableDays = JSON.stringify(body.availableDays);

      const menuItem = await prisma.menuItem.update({
        where: { id: itemId },
        data: updateData,
      });

      return reply.send({
        success: true,
        message: 'Item de menu actualizado exitosamente',
        data: {
          id: menuItem.id,
          name: menuItem.name,
          description: menuItem.description,
          price: menuItem.price,
          category: menuItem.category,
          imageUrl: menuItem.imageUrl,
          available: menuItem.available,
          availableDays: JSON.parse(menuItem.availableDays),
          updatedAt: menuItem.updatedAt,
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

      console.error('Update menu item error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al actualizar item de menu',
      });
    }
  });

  /**
   * DELETE /api/v1/menu/:cafeteriaId/:itemId
   * Delete a menu item
   */
  app.delete('/:cafeteriaId/:itemId', async (request: FastifyRequest<{ Params: { cafeteriaId: string; itemId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId, itemId } = request.params;

      // Validate cafeteria access
      const result = await validateCafeteriaAccess(cafeteriaId, decoded, reply);
      if (!result) return;

      // Check item exists and belongs to cafeteria
      const existingItem = await prisma.menuItem.findUnique({
        where: { id: itemId },
      });

      if (!existingItem || existingItem.cafeteriaId !== cafeteriaId) {
        return reply.status(404).send({
          success: false,
          message: 'Item de menu no encontrado',
        });
      }

      await prisma.menuItem.delete({
        where: { id: itemId },
      });

      return reply.send({
        success: true,
        message: 'Item de menu eliminado exitosamente',
      });
    } catch (error) {
      console.error('Delete menu item error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al eliminar item de menu',
      });
    }
  });
}
