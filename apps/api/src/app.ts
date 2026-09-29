import { randomUUID } from 'node:crypto';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { buildOpenApi } from './docs/openapi.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { apiLimiter } from './middleware/rate-limit.js';
import { analyticsRouter, statsRouter } from './modules/analytics/analytics.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { commentAdminRouter } from './modules/comments/comments.routes.js';
import { geoRouter } from './modules/geo/geo.routes.js';
import { issuesRouter } from './modules/issues/issues.routes.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import { UPLOAD_DIR, uploadsRouter } from './modules/uploads/uploads.routes.js';
import { usersRouter } from './modules/users/users.routes.js';

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id = typeof incoming === 'string' && incoming.length <= 100 ? incoming : randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url === '/health' },
      serializers: {
        req: (req: { id: unknown; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      customLogLevel: (_req, res, err) =>
        err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
    }),
  );

  app.use(
    helmet({
      // Uploaded images are embedded by the web app on another origin.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || env.webOrigins.includes(origin)),
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({
      status: dbUp ? 'ok' : 'degraded',
      db: dbUp ? 'up' : 'down',
      uptime: Math.round(process.uptime()),
    });
  });

  app.use(
    '/uploads',
    express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true, fallthrough: false }),
  );

  const openApi = buildOpenApi(env.API_PUBLIC_URL);
  app.get('/api/openapi.json', (_req, res) => res.json(openApi));
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApi, { customSiteTitle: 'Civita API docs' }),
  );

  const v1 = Router();
  v1.use(apiLimiter);
  v1.use('/auth', authRouter);
  v1.use('/issues', issuesRouter);
  v1.use('/comments', commentAdminRouter);
  v1.use('/categories', categoriesRouter);
  v1.use('/users', usersRouter);
  v1.use('/notifications', notificationsRouter);
  v1.use('/analytics', analyticsRouter);
  v1.use('/stats', statsRouter);
  v1.use('/uploads', uploadsRouter);
  v1.use('/geo', geoRouter);
  app.use('/api/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
