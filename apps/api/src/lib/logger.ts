import { createRequire } from 'node:module';
import { pino } from 'pino';
import { env } from '../config/env.js';

/** pino-pretty is a dev dependency; fall back to JSON logs when it isn't installed. */
const prettyAvailable = (() => {
  try {
    createRequire(import.meta.url).resolve('pino-pretty');
    return true;
  } catch {
    return false;
  }
})();

export const logger = pino({
  level: env.LOG_LEVEL ?? (env.isTest ? 'silent' : env.isProd ? 'info' : 'debug'),
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    censor: '[redacted]',
  },
  ...(env.isProd || env.isTest || !prettyAvailable
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }),
});
