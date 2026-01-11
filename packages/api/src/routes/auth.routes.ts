import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authService } from '../services/auth.service.js';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  relationship: z.enum(['father', 'mother', 'guardian', 'other']),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export async function authRoutes(app: FastifyInstance) {
  /**
   * POST /api/v1/auth/register
   * Register a new guardian user
   */
  app.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = registerSchema.parse(request.body);
      const result = await authService.register(body);

      return reply.status(201).send({
        success: true,
        message: 'Registro exitoso',
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: 'Datos de registro inválidos',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const message = error instanceof Error ? error.message : 'Registration failed';
      const status = message.includes('already registered') ? 409 : 500;

      return reply.status(status).send({
        success: false,
        message: message === 'Email already registered' ? 'El correo ya está registrado' : message,
      });
    }
  });

  /**
   * POST /api/v1/auth/login
   * Login with email and password
   */
  app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = loginSchema.parse(request.body);
      const result = await authService.login(body);

      return reply.send({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: 'Datos de inicio de sesión inválidos',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const message = error instanceof Error ? error.message : 'Login failed';
      return reply.status(401).send({
        success: false,
        message: message === 'Invalid email or password' ? 'Correo o contraseña incorrectos' : message,
      });
    }
  });

  /**
   * POST /api/v1/auth/logout
   * Logout and revoke refresh token
   */
  app.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = refreshSchema.parse(request.body);
      await authService.logout(body.refreshToken);

      return reply.send({
        success: true,
        message: 'Sesión cerrada exitosamente',
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        message: 'Error al cerrar sesión',
      });
    }
  });

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token
   */
  app.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = refreshSchema.parse(request.body);
      const result = await authService.refreshAccessToken(body.refreshToken);

      return reply.send({
        success: true,
        message: 'Token actualizado',
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token refresh failed';
      return reply.status(401).send({
        success: false,
        message: message.includes('Invalid') ? 'Token inválido o expirado' : message,
      });
    }
  });

  /**
   * GET /api/v1/auth/me
   * Get current user info (requires authentication)
   */
  app.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get token from Authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          success: false,
          message: 'Token de acceso requerido',
        });
      }

      const token = authHeader.substring(7);
      const decoded = authService.verifyAccessToken(token);

      if (!decoded) {
        return reply.status(401).send({
          success: false,
          message: 'Token inválido o expirado',
        });
      }

      const user = await authService.getCurrentUser(decoded.userId);

      return reply.send({
        success: true,
        data: user,
      });
    } catch (error) {
      return reply.status(401).send({
        success: false,
        message: 'No autorizado',
      });
    }
  });
}
