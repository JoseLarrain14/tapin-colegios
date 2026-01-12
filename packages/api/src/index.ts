import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config/env.js';
import { authRoutes } from './routes/auth.routes.js';
import { schoolsRoutes } from './routes/schools.routes.js';
import { guardiansRoutes } from './routes/guardians.routes.js';
import { studentsRoutes } from './routes/students.routes.js';

const app = Fastify({
  logger: {
    level: config.nodeEnv === 'development' ? 'info' : 'warn',
  },
});

// Register plugins
async function registerPlugins() {
  // Security
  await app.register(helmet, {
    contentSecurityPolicy: false, // Disable for development
  });

  await app.register(cors, {
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Swagger documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Tap In Colegios API',
        description: 'API para la plataforma de gestión de cafeterías escolares',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${config.port}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/documentation',
  });
}

// Health check route
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// API v1 routes
app.get('/api/v1', async () => {
  return {
    message: 'Tap In Colegios API v1',
    version: '1.0.0',
    docs: '/documentation',
  };
});

// Register route modules
async function registerRoutes() {
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(schoolsRoutes, { prefix: '/api/v1/schools' });
  await app.register(guardiansRoutes, { prefix: '/api/v1/guardians' });
  await app.register(studentsRoutes, { prefix: '/api/v1/students' });
}

// Start server
async function start() {
  try {
    await registerPlugins();
    await registerRoutes();

    await app.listen({
      port: config.port,
      host: config.host,
    });

    console.log(`
╔════════════════════════════════════════════════════════════╗
║           TAP IN COLEGIOS - API Server                     ║
╠════════════════════════════════════════════════════════════╣
║  Server:  http://${config.host}:${config.port}                        ║
║  Docs:    http://${config.host}:${config.port}/documentation          ║
║  Health:  http://${config.host}:${config.port}/health                 ║
║  Mode:    ${config.nodeEnv.padEnd(47)}║
╚════════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

export default app;
