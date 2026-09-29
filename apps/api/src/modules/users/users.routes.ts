import {
  STAFF_ROLES,
  adminUpdateUserSchema,
  listUsersQuerySchema,
  updateMeSchema,
  type UserProfile,
} from '@civita/shared';
import { Router } from 'express';
import { Types } from 'mongoose';
import { badRequest, notFound, parse, idParam } from '../../lib/errors.js';
import { toUser, toUserSummary } from '../../lib/serialize.js';
import { authUser, requireAuth, requireRole } from '../../middleware/auth.js';
import { Comment, Issue } from '../../models/issue.model.js';
import { Session } from '../../models/session.model.js';
import { User } from '../../models/user.model.js';

export const usersRouter = Router();

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

usersRouter.patch('/me', requireAuth, async (req, res) => {
  const input = parse(updateMeSchema, req.body);
  const user = await User.findByIdAndUpdate(authUser(req).id, input, {
    returnDocument: 'after',
    runValidators: true,
  }).lean();
  if (!user) throw notFound('User');
  res.json(toUser(user));
});

/** Active authorities and admins, for the assignee picker. */
usersRouter.get('/staff', requireAuth, requireRole('authority', 'admin'), async (_req, res) => {
  const staff = await User.find({ role: { $in: STAFF_ROLES }, isActive: true })
    .select('name avatarUrl role')
    .sort({ name: 1 })
    .lean();
  res.json(staff.map((u) => toUserSummary(u)));
});

usersRouter.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { q, role, page, limit } = parse(listUsersQuerySchema, req.query);
  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);
  res.json({
    items: items.map((u) => toUser(u)),
    page,
    limit,
    total,
    hasMore: page * limit < total,
  });
});

usersRouter.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const input = parse(adminUpdateUserSchema, req.body);
  const id = idParam(req);
  if (!Types.ObjectId.isValid(id)) throw notFound('User');
  if (id === authUser(req).id) throw badRequest('You cannot change your own role or status');

  const user = await User.findByIdAndUpdate(id, input, {
    returnDocument: 'after',
    runValidators: true,
  }).lean();
  if (!user) throw notFound('User');
  if (input.isActive === false) {
    await Session.updateMany({ user: user._id, revokedAt: null }, { revokedAt: new Date() });
  }
  res.json(toUser(user));
});

usersRouter.get('/:id', async (req, res) => {
  const id = idParam(req);
  if (!Types.ObjectId.isValid(id)) throw notFound('User');
  const user = await User.findById(id).lean();
  if (!user || !user.isActive) throw notFound('User');

  const [reported, resolved, comments, upvotes] = await Promise.all([
    Issue.countDocuments({ reporter: user._id }),
    Issue.countDocuments({ reporter: user._id, status: 'resolved' }),
    Comment.countDocuments({ author: user._id, isInternal: false }),
    Issue.aggregate<{ n: number }>([
      { $match: { reporter: user._id } },
      { $group: { _id: null, n: { $sum: '$upvoteCount' } } },
    ]),
  ]);

  const profile: UserProfile = {
    ...toUserSummary(user)!,
    bio: user.bio,
    createdAt: user.createdAt.toISOString(),
    stats: { reported, resolved, comments, upvotesReceived: upvotes[0]?.n ?? 0 },
  };
  res.json(profile);
});
