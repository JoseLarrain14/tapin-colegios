import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import prisma from '../utils/prisma.js';
import { authService } from '../services/auth.service.js';

// Validation schemas
const registerTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  platform: z.enum(['ios', 'android', 'web']),
});

const deleteTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// Helper to verify auth and get user ID
async function verifyAuth(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
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

  return decoded.userId;
}

export async function notificationsRoutes(app: FastifyInstance) {

  /**
   * POST /api/v1/notifications/token
   * Register push notification token
   */
  app.post('/token', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = await verifyAuth(request, reply);
      if (!userId) return; // Response already sent

      const body = registerTokenSchema.parse(request.body);

      // Check if token already exists for this user
      const existingToken = await prisma.pushToken.findFirst({
        where: {
          userId,
          token: body.token,
        },
      });

      if (existingToken) {
        // Update existing token (reactivate if inactive)
        await prisma.pushToken.update({
          where: { id: existingToken.id },
          data: {
            active: true,
            platform: body.platform,
            updatedAt: new Date(),
          },
        });

        return reply.send({
          success: true,
          message: 'Token actualizado exitosamente',
          data: { tokenId: existingToken.id },
        });
      }

      // Deactivate old tokens for this user on same platform
      await prisma.pushToken.updateMany({
        where: {
          userId,
          platform: body.platform,
        },
        data: { active: false },
      });

      // Create new token
      const pushToken = await prisma.pushToken.create({
        data: {
          userId,
          token: body.token,
          platform: body.platform,
        },
      });

      return reply.status(201).send({
        success: true,
        message: 'Token registrado exitosamente',
        data: { tokenId: pushToken.id },
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

      console.error('Error registering push token:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al registrar token',
      });
    }
  });

  /**
   * DELETE /api/v1/notifications/token
   * Remove push notification token
   */
  app.delete('/token', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = await verifyAuth(request, reply);
      if (!userId) return;

      const body = deleteTokenSchema.parse(request.body);

      await prisma.pushToken.updateMany({
        where: {
          userId,
          token: body.token,
        },
        data: { active: false },
      });

      return reply.send({
        success: true,
        message: 'Token eliminado exitosamente',
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

      console.error('Error deleting push token:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al eliminar token',
      });
    }
  });

  /**
   * GET /api/v1/notifications
   * Get user notifications
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = await verifyAuth(request, reply);
      if (!userId) return;

      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return reply.send({
        success: true,
        data: notifications.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          data: n.data ? JSON.parse(n.data) : null,
          read: n.read,
          createdAt: n.createdAt,
        })),
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener notificaciones',
      });
    }
  });

  /**
   * PUT /api/v1/notifications/:id/read
   * Mark notification as read
   */
  app.put('/:id/read', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = await verifyAuth(request, reply);
      if (!userId) return;

      const { id } = request.params as { id: string };

      const notification = await prisma.notification.findFirst({
        where: { id, userId },
      });

      if (!notification) {
        return reply.status(404).send({
          success: false,
          message: 'Notificacion no encontrada',
        });
      }

      await prisma.notification.update({
        where: { id },
        data: { read: true },
      });

      return reply.send({
        success: true,
        message: 'Notificacion marcada como leida',
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al actualizar notificacion',
      });
    }
  });

  /**
   * PUT /api/v1/notifications/read-all
   * Mark all notifications as read
   */
  app.put('/read-all', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = await verifyAuth(request, reply);
      if (!userId) return;

      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });

      return reply.send({
        success: true,
        message: 'Todas las notificaciones marcadas como leidas',
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al actualizar notificaciones',
      });
    }
  });
}
