import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config/env.js';

const app = Fastify({
  logger: {
    level: config.nodeEnv === 'development' ? 'info' : 'warn',
    transport: config.nodeEnv === 'development'
      ? { target: 'pino-pretty' }
      : undefined,
  },
});

// Register plugins
async function registerPlugins() {
  // Security
  await app.register(helmet);
  await app.register(cors, {
    origin: config.nodeEnv === 'development' ? true : config.corsOrigins,
    credentials: true,
  });

  // JWT
  await app.register(jwt, {
    secret: config.jwtSecret,
    sign: {
      expiresIn: config.jwtExpiresIn,
    },
  });

  // Swagger documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Tap In Colegios API',
        description: 'API para la plataforma de gestion de cafeterias escolares',
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

// Start server
async function start() {
  try {
    await registerPlugins();

    await app.listen({
      port: config.port,
      host: config.host,
    });

    console.log(`
╔════════════════════════════════════════════════════════════╗
║           TAP IN COLEGIOS - API Server                      ║
╠════════════════════════════════════════════════════════════╣
║  Server:  http://${config.host}:${config.port}                        ║
║  Docs:    http://${config.host}:${config.port}/documentation          ║
║  Health:  http://${config.host}:${config.port}/health                 ║
║  Mode:    ${config.nodeEnv.padEnd(48)}║
╚════════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

export default app;
