import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './env.js';
import { controlCenterRoutes } from './routes/control-center.js';
import { importRoutes } from './routes/imports.js';

const app = Fastify({ logger: true, bodyLimit: 64 * 1024 });

await app.register(cors, {
  origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

await app.register(controlCenterRoutes, { prefix: '/api/control-center' });
await app.register(importRoutes, { prefix: '/api/control-center' });

app.setNotFoundHandler((_request, reply) => {
  reply.code(404).send({ error: 'not_found' });
});

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  reply.code(500).send({ error: 'internal_server_error' });
});

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

await app.listen({ host: env.HOST, port: env.PORT });
