import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Validation schemas
const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
});

export async function schoolsRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/schools/search
   * Search for schools by name or code
   */
  app.get('/search', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = searchSchema.parse(request.query);
      const searchTerm = query.q.toLowerCase();

      const schools = await prisma.school.findMany({
        where: {
          active: true,
          OR: [
            { name: { contains: searchTerm } },
            { code: { contains: searchTerm } },
            { city: { contains: searchTerm } },
          ],
        },
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          city: true,
          region: true,
          logoUrl: true,
        },
        take: 10,
        orderBy: { name: 'asc' },
      });

      return reply.send({
        success: true,
        data: schools,
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

      console.error('School search error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al buscar colegios',
      });
    }
  });

  /**
   * GET /api/v1/schools/:code
   * Get school by code
   */
  app.get('/:code', async (request: FastifyRequest<{ Params: { code: string } }>, reply: FastifyReply) => {
    try {
      const { code } = request.params;

      const school = await prisma.school.findUnique({
        where: { code },
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          city: true,
          region: true,
          phone: true,
          email: true,
          logoUrl: true,
          config: true,
        },
      });

      if (!school) {
        return reply.status(404).send({
          success: false,
          message: 'Colegio no encontrado',
        });
      }

      return reply.send({
        success: true,
        data: school,
      });
    } catch (error) {
      console.error('Get school error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener el colegio',
      });
    }
  });

  /**
   * GET /api/v1/schools
   * List all active schools
   */
  app.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const schools = await prisma.school.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          region: true,
          logoUrl: true,
        },
        orderBy: { name: 'asc' },
      });

      return reply.send({
        success: true,
        data: schools,
      });
    } catch (error) {
      console.error('List schools error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al listar colegios',
      });
    }
  });

  /**
   * GET /api/v1/schools/:id/cafeterias
   * Get all cafeterias for a school
   */
  app.get('/:id/cafeterias', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;

      const school = await prisma.school.findUnique({
        where: { id },
        include: {
          cafeterias: {
            where: { active: true },
            select: {
              id: true,
              name: true,
              description: true,
              config: true,
            },
          },
        },
      });

      if (!school) {
        return reply.status(404).send({
          success: false,
          message: 'Colegio no encontrado',
        });
      }

      return reply.send({
        success: true,
        data: {
          school: {
            id: school.id,
            name: school.name,
          },
          cafeterias: school.cafeterias,
        },
      });
    } catch (error) {
      console.error('Get school cafeterias error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener cafeterias del colegio',
      });
    }
  });

  /**
   * PUT /api/v1/schools/:id/config
   * Update school config (for testing negative balance feature)
   */
  app.put('/:id/config', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const body = z.object({
        allowNegativeBalance: z.boolean().optional(),
        businessModel: z.enum(['tickets_only', 'balance_only', 'mixed']).optional(),
      }).parse(request.body);

      const school = await prisma.school.findUnique({
        where: { id },
      });

      if (!school) {
        return reply.status(404).send({
          success: false,
          message: 'Colegio no encontrado',
        });
      }

      // Parse existing config and merge with new values
      let existingConfig = {};
      try {
        existingConfig = JSON.parse(school.config || '{}');
      } catch {
        existingConfig = {};
      }

      const updatedConfig = {
        ...existingConfig,
        ...(body.allowNegativeBalance !== undefined && { allowNegativeBalance: body.allowNegativeBalance }),
        ...(body.businessModel !== undefined && { businessModel: body.businessModel }),
      };

      const updatedSchool = await prisma.school.update({
        where: { id },
        data: {
          config: JSON.stringify(updatedConfig),
        },
      });

      return reply.send({
        success: true,
        message: 'Configuracion del colegio actualizada',
        data: {
          id: updatedSchool.id,
          name: updatedSchool.name,
          config: JSON.parse(updatedSchool.config),
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

      console.error('Update school config error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al actualizar configuracion del colegio',
      });
    }
  });

  /**
   * POST /api/v1/schools/:id/cafeterias
   * Create a cafeteria for a school (for testing)
   */
  app.post('/:id/cafeterias', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const body = z.object({
        name: z.string().min(1, 'Nombre requerido'),
        description: z.string().optional(),
      }).parse(request.body);

      const school = await prisma.school.findUnique({
        where: { id },
      });

      if (!school) {
        return reply.status(404).send({
          success: false,
          message: 'Colegio no encontrado',
        });
      }

      const cafeteria = await prisma.cafeteria.create({
        data: {
          schoolId: id,
          name: body.name,
          description: body.description,
        },
      });

      return reply.status(201).send({
        success: true,
        message: 'Cafeteria creada exitosamente',
        data: {
          id: cafeteria.id,
          name: cafeteria.name,
          description: cafeteria.description,
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

      console.error('Create cafeteria error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al crear cafeteria',
      });
    }
  });
}
