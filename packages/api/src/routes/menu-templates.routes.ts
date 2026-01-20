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

// Validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().optional(),
  color: z.string().optional(),
  active: z.boolean().optional().default(true),
  menuItemIds: z.array(z.string()).optional().default([]),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

const addItemSchema = z.object({
  menuItemId: z.string().min(1, 'menuItemId requerido'),
  sortOrder: z.number().int().optional().default(0),
});

export async function menuTemplatesRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/menu-templates/:cafeteriaId
   * List all templates for a cafeteria
   */
  app.get('/:cafeteriaId', async (request: FastifyRequest<{ Params: { cafeteriaId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId } = request.params;

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

      const templates = await prisma.menuTemplate.findMany({
        where: { cafeteriaId },
        include: {
          items: {
            include: {
              menuItem: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      });

      return reply.send({
        success: true,
        data: {
          templates: templates.map(t => ({
            id: t.id,
            name: t.name,
            description: t.description,
            color: t.color,
            active: t.active,
            itemCount: t.items.length,
            items: t.items.map(item => ({
              id: item.id,
              menuItemId: item.menuItemId,
              sortOrder: item.sortOrder,
              menuItem: {
                id: item.menuItem.id,
                name: item.menuItem.name,
                price: item.menuItem.price,
                category: item.menuItem.category,
              },
            })),
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
          })),
          totalTemplates: templates.length,
        },
      });
    } catch (error) {
      console.error('Get templates error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener templates',
      });
    }
  });

  /**
   * GET /api/v1/menu-templates/:cafeteriaId/:templateId
   * Get a specific template with its items
   */
  app.get('/:cafeteriaId/:templateId', async (request: FastifyRequest<{ Params: { cafeteriaId: string; templateId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId, templateId } = request.params;

      const template = await prisma.menuTemplate.findUnique({
        where: { id: templateId },
        include: {
          items: {
            include: {
              menuItem: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      if (!template || template.cafeteriaId !== cafeteriaId) {
        return reply.status(404).send({
          success: false,
          message: 'Template no encontrado',
        });
      }

      return reply.send({
        success: true,
        data: {
          id: template.id,
          name: template.name,
          description: template.description,
          color: template.color,
          active: template.active,
          items: template.items.map(item => ({
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
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
        },
      });
    } catch (error) {
      console.error('Get template error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener template',
      });
    }
  });

  /**
   * POST /api/v1/menu-templates/:cafeteriaId
   * Create a new template
   */
  app.post('/:cafeteriaId', async (request: FastifyRequest<{ Params: { cafeteriaId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId } = request.params;
      const body = createTemplateSchema.parse(request.body);

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

      // Create template with items in a transaction
      const template = await prisma.$transaction(async (tx) => {
        const newTemplate = await tx.menuTemplate.create({
          data: {
            cafeteriaId,
            name: body.name,
            description: body.description,
            color: body.color,
            active: body.active,
          },
        });

        // Add items if provided
        if (body.menuItemIds && body.menuItemIds.length > 0) {
          await tx.menuTemplateItem.createMany({
            data: body.menuItemIds.map((menuItemId, index) => ({
              templateId: newTemplate.id,
              menuItemId,
              sortOrder: index,
            })),
          });
        }

        return tx.menuTemplate.findUnique({
          where: { id: newTemplate.id },
          include: {
            items: {
              include: { menuItem: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        });
      });

      return reply.status(201).send({
        success: true,
        message: 'Template creado exitosamente',
        data: {
          id: template!.id,
          name: template!.name,
          description: template!.description,
          color: template!.color,
          active: template!.active,
          items: template!.items.map(item => ({
            id: item.id,
            menuItemId: item.menuItemId,
            menuItem: {
              id: item.menuItem.id,
              name: item.menuItem.name,
              price: item.menuItem.price,
            },
          })),
          createdAt: template!.createdAt,
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

      console.error('Create template error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al crear template',
      });
    }
  });

  /**
   * PUT /api/v1/menu-templates/:cafeteriaId/:templateId
   * Update a template
   */
  app.put('/:cafeteriaId/:templateId', async (request: FastifyRequest<{ Params: { cafeteriaId: string; templateId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId, templateId } = request.params;
      const body = updateTemplateSchema.parse(request.body);

      // Check template exists
      const existingTemplate = await prisma.menuTemplate.findUnique({
        where: { id: templateId },
      });

      if (!existingTemplate || existingTemplate.cafeteriaId !== cafeteriaId) {
        return reply.status(404).send({
          success: false,
          message: 'Template no encontrado',
        });
      }

      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.color !== undefined) updateData.color = body.color;
      if (body.active !== undefined) updateData.active = body.active;

      const template = await prisma.menuTemplate.update({
        where: { id: templateId },
        data: updateData,
        include: {
          items: {
            include: { menuItem: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      return reply.send({
        success: true,
        message: 'Template actualizado exitosamente',
        data: {
          id: template.id,
          name: template.name,
          description: template.description,
          color: template.color,
          active: template.active,
          items: template.items.map(item => ({
            id: item.id,
            menuItemId: item.menuItemId,
            menuItem: {
              id: item.menuItem.id,
              name: item.menuItem.name,
              price: item.menuItem.price,
            },
          })),
          updatedAt: template.updatedAt,
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

      console.error('Update template error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al actualizar template',
      });
    }
  });

  /**
   * DELETE /api/v1/menu-templates/:cafeteriaId/:templateId
   * Delete a template
   */
  app.delete('/:cafeteriaId/:templateId', async (request: FastifyRequest<{ Params: { cafeteriaId: string; templateId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId, templateId } = request.params;

      // Check template exists
      const existingTemplate = await prisma.menuTemplate.findUnique({
        where: { id: templateId },
      });

      if (!existingTemplate || existingTemplate.cafeteriaId !== cafeteriaId) {
        return reply.status(404).send({
          success: false,
          message: 'Template no encontrado',
        });
      }

      await prisma.menuTemplate.delete({
        where: { id: templateId },
      });

      return reply.send({
        success: true,
        message: 'Template eliminado exitosamente',
      });
    } catch (error) {
      console.error('Delete template error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al eliminar template',
      });
    }
  });

  /**
   * POST /api/v1/menu-templates/:cafeteriaId/:templateId/items
   * Add an item to a template
   */
  app.post('/:cafeteriaId/:templateId/items', async (request: FastifyRequest<{ Params: { cafeteriaId: string; templateId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId, templateId } = request.params;
      const body = addItemSchema.parse(request.body);

      // Check template exists
      const template = await prisma.menuTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template || template.cafeteriaId !== cafeteriaId) {
        return reply.status(404).send({
          success: false,
          message: 'Template no encontrado',
        });
      }

      // Check menu item exists and belongs to same cafeteria
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: body.menuItemId },
      });

      if (!menuItem || menuItem.cafeteriaId !== cafeteriaId) {
        return reply.status(404).send({
          success: false,
          message: 'Item de menu no encontrado',
        });
      }

      // Check if item already in template
      const existingItem = await prisma.menuTemplateItem.findUnique({
        where: {
          templateId_menuItemId: {
            templateId,
            menuItemId: body.menuItemId,
          },
        },
      });

      if (existingItem) {
        return reply.status(400).send({
          success: false,
          message: 'El item ya esta en el template',
        });
      }

      const templateItem = await prisma.menuTemplateItem.create({
        data: {
          templateId,
          menuItemId: body.menuItemId,
          sortOrder: body.sortOrder,
        },
        include: {
          menuItem: true,
        },
      });

      return reply.status(201).send({
        success: true,
        message: 'Item agregado al template',
        data: {
          id: templateItem.id,
          menuItemId: templateItem.menuItemId,
          sortOrder: templateItem.sortOrder,
          menuItem: {
            id: templateItem.menuItem.id,
            name: templateItem.menuItem.name,
            price: templateItem.menuItem.price,
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

      console.error('Add template item error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al agregar item al template',
      });
    }
  });

  /**
   * DELETE /api/v1/menu-templates/:cafeteriaId/:templateId/items/:itemId
   * Remove an item from a template
   */
  app.delete('/:cafeteriaId/:templateId/items/:itemId', async (request: FastifyRequest<{ Params: { cafeteriaId: string; templateId: string; itemId: string } }>, reply: FastifyReply) => {
    try {
      const decoded = await verifyAuth(request, reply);
      if (!decoded) return;

      const { cafeteriaId, templateId, itemId } = request.params;

      // Check template exists
      const template = await prisma.menuTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template || template.cafeteriaId !== cafeteriaId) {
        return reply.status(404).send({
          success: false,
          message: 'Template no encontrado',
        });
      }

      // Check template item exists
      const templateItem = await prisma.menuTemplateItem.findUnique({
        where: { id: itemId },
      });

      if (!templateItem || templateItem.templateId !== templateId) {
        return reply.status(404).send({
          success: false,
          message: 'Item no encontrado en el template',
        });
      }

      await prisma.menuTemplateItem.delete({
        where: { id: itemId },
      });

      return reply.send({
        success: true,
        message: 'Item removido del template',
      });
    } catch (error) {
      console.error('Remove template item error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al remover item del template',
      });
    }
  });
}
