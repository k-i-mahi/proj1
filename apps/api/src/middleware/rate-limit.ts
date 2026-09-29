import { rateLimit, type Options } from 'express-rate-limit';
import { env } from '../config/env.js';

const make = (options: Partial<Options>) =>
  rateLimit({
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => env.isTest,
    handler: (_req, res, _next, opts) => {
      res.status(opts.statusCode).json({
        error: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down' },
      });
    },
    ...options,
  });

/** General API budget per IP. */
export const apiLimiter = make({ windowMs: 60_000, limit: env.isProd ? 300 : 5000 });

/** Login, registration and password flows, to slow down credential stuffing. */
// Relaxed outside production so local development and E2E runs don't lock themselves out.
export const authLimiter = make({ windowMs: 15 * 60_000, limit: env.isProd ? 30 : 1000 });

export const uploadLimiter = make({ windowMs: 60 * 60_000, limit: 60 });
