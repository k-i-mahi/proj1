import { analyticsQuerySchema } from '@civita/shared';
import { Router } from 'express';
import { parse } from '../../lib/errors.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { getOverview, getPublicStats } from './analytics.service.js';

export const analyticsRouter = Router();

analyticsRouter.get(
  '/overview',
  requireAuth,
  requireRole('authority', 'admin'),
  async (req, res) => {
    const { days } = parse(analyticsQuerySchema, req.query);
    res.json(await getOverview(days));
  },
);

export const statsRouter = Router();

statsRouter.get('/', async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json(await getPublicStats());
});
