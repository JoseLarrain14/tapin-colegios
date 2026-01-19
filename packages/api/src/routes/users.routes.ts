import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  role: z.enum(['super_admin', 'school_admin', 'cafeteria_operator', 'guardian']).default('guardian'),
  schoolId: z.string().uuid().optional(),
});

const updateUserSchema = z.object({
  email: z.string().email('Email inválido').optional(),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').optional(),
  role: z.enum(['super_admin', 'school_admin', 'cafeteria_operator', 'guardian']).optional(),
  active: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  role: z.string().optional(),
  search: z.string().optional(),
});

export async function usersRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/users
   * List all users with pagination and filters
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = listQuerySchema.parse(request.query);
      const { page, limit, role, search } = query;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (role) {
        where.role = role;
      }

      if (search) {
        where.email = { contains: search.toLowerCase() };
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            role: true,
            emailVerified: true,
            active: true,
            createdAt: true,
            lastLogin: true,
            guardian: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            schoolAdmin: {
              select: {
                id: true,
                schoolId: true,
                school: {
                  select: {
                    name: true,
                    code: true,
                  },
                },
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: 'Parámetros inválidos',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      console.error('List users error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al listar usuarios',
      });
    }
  });

  /**
   * GET /api/v1/users/:id
   * Get user by ID
   */
  app.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          role: true,
          emailVerified: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true,
          guardian: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              rut: true,
              relationship: true,
            },
          },
          schoolAdmin: {
            select: {
              id: true,
              schoolId: true,
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
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          message: 'Usuario no encontrado',
        });
      }

      return reply.send({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('Get user error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener usuario',
      });
    }
  });

  /**
   * POST /api/v1/users
   * Create a new user
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = createUserSchema.parse(request.body);

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: body.email.toLowerCase() },
      });

      if (existingUser) {
        return reply.status(409).send({
          success: false,
          message: 'El correo ya está registrado',
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: body.email.toLowerCase(),
          passwordHash,
          role: body.role,
        },
        select: {
          id: true,
          email: true,
          role: true,
          emailVerified: true,
          active: true,
          createdAt: true,
        },
      });

      // If school_admin, create school admin relation
      if (body.role === 'school_admin' && body.schoolId) {
        await prisma.schoolAdmin.create({
          data: {
            userId: user.id,
            schoolId: body.schoolId,
          },
        });
      }

      return reply.status(201).send({
        success: true,
        message: 'Usuario creado exitosamente',
        data: user,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: 'Datos inválidos',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      console.error('Create user error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al crear usuario',
      });
    }
  });

  /**
   * PATCH /api/v1/users/:id
   * Update a user
   */
  app.patch('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const body = updateUserSchema.parse(request.body);

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        return reply.status(404).send({
          success: false,
          message: 'Usuario no encontrado',
        });
      }

      // If updating email, check if new email is available
      if (body.email && body.email.toLowerCase() !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: body.email.toLowerCase() },
        });

        if (emailExists) {
          return reply.status(409).send({
            success: false,
            message: 'El correo ya está en uso',
          });
        }
      }

      // Prepare update data
      const updateData: any = {};

      if (body.email) {
        updateData.email = body.email.toLowerCase();
      }

      if (body.password) {
        updateData.passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);
      }

      if (body.role !== undefined) {
        updateData.role = body.role;
      }

      if (body.active !== undefined) {
        updateData.active = body.active;
      }

      if (body.emailVerified !== undefined) {
        updateData.emailVerified = body.emailVerified;
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          role: true,
          emailVerified: true,
          active: true,
          updatedAt: true,
        },
      });

      return reply.send({
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: user,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: 'Datos inválidos',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      console.error('Update user error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al actualizar usuario',
      });
    }
  });

  /**
   * DELETE /api/v1/users/:id
   * Delete a user (soft delete by deactivating)
   */
  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          message: 'Usuario no encontrado',
        });
      }

      // Soft delete by deactivating
      await prisma.user.update({
        where: { id },
        data: { active: false },
      });

      return reply.send({
        success: true,
        message: 'Usuario eliminado exitosamente',
      });
    } catch (error) {
      console.error('Delete user error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al eliminar usuario',
      });
    }
  });
}
