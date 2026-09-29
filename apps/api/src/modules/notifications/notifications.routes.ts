import { paginationQuerySchema } from '@civita/shared';
import { Router } from 'express';
import { Types } from 'mongoose';
import { notFound, parse } from '../../lib/errors.js';
import { USER_SUMMARY_FIELDS, toNotification } from '../../lib/serialize.js';
import { authUser, requireAuth } from '../../middleware/auth.js';
import { Notification } from '../../models/notification.model.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req, res) => {
  const { page, limit } = parse(paginationQuerySchema, req.query);
  const filter = {
    recipient: authUser(req).id,
    ...(req.query.unread === 'true' ? { readAt: null } : {}),
  };
  const [items, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('actor', USER_SUMMARY_FIELDS)
      .populate('issue', 'title')
      .lean(),
    Notification.countDocuments(filter),
  ]);
  res.json({
    items: items.map((n) => toNotification(n)),
    page,
    limit,
    total,
    hasMore: page * limit < total,
  });
});

notificationsRouter.get('/unread-count', async (req, res) => {
  const count = await Notification.countDocuments({ recipient: authUser(req).id, readAt: null });
  res.json({ count });
});

notificationsRouter.patch('/read-all', async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: authUser(req).id, readAt: null },
    { readAt: new Date() },
  );
  res.json({ updated: result.modifiedCount });
});

notificationsRouter.patch('/:id/read', async (req, res) => {
  const id = req.params.id!;
  if (!Types.ObjectId.isValid(id)) throw notFound('Notification');
  const n = await Notification.findOneAndUpdate(
    { _id: id, recipient: authUser(req).id },
    { $set: { readAt: new Date() } },
    { returnDocument: 'after' },
  )
    .populate('actor', USER_SUMMARY_FIELDS)
    .populate('issue', 'title')
    .lean();
  if (!n) throw notFound('Notification');
  res.json(toNotification(n));
});
