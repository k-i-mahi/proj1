import { SOCKET_EVENTS, createCommentSchema, isStaff, paginationQuerySchema } from '@civita/shared';
import { Router } from 'express';
import { Types } from 'mongoose';
import { forbidden, idParam, notFound, parse } from '../../lib/errors.js';
import { emitTo, rooms } from '../../lib/realtime.js';
import { USER_SUMMARY_FIELDS, toComment } from '../../lib/serialize.js';
import { authUser, optionalAuth, requireAuth } from '../../middleware/auth.js';
import { Comment, Follow, Issue } from '../../models/issue.model.js';
import { ensureFollowing } from '../issues/issues.service.js';
import { notify } from '../notifications/notifications.service.js';

/** Mounted at /issues/:id/comments. */
export const commentsRouter = Router({ mergeParams: true });

const findIssue = async (id: string | undefined) => {
  if (!id || !Types.ObjectId.isValid(id)) throw notFound('Issue');
  const issue = await Issue.findById(id).select('title reporter');
  if (!issue) throw notFound('Issue');
  return issue;
};

commentsRouter.get('/', optionalAuth, async (req, res) => {
  const issue = await findIssue((req.params as { id?: string }).id);
  const { page, limit } = parse(paginationQuerySchema, req.query);
  const filter = {
    issue: issue._id,
    ...(isStaff(req.user?.role) ? {} : { isInternal: false }),
  };

  const [items, total] = await Promise.all([
    Comment.find(filter)
      .sort({ createdAt: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('author', USER_SUMMARY_FIELDS)
      .lean(),
    Comment.countDocuments(filter),
  ]);

  res.json({
    items: items.map((c) => toComment(c)),
    page,
    limit,
    total,
    hasMore: page * limit < total,
  });
});

commentsRouter.post('/', requireAuth, async (req, res) => {
  const user = authUser(req);
  const issue = await findIssue((req.params as { id?: string }).id);
  const input = parse(createCommentSchema, req.body);
  if (input.isInternal && !isStaff(user.role)) {
    throw forbidden('Only authorities can post internal notes');
  }

  const comment = await Comment.create({
    issue: issue._id,
    author: user.id,
    body: input.body,
    isInternal: input.isInternal,
  });
  await comment.populate('author', USER_SUMMARY_FIELDS);
  const dto = toComment(comment.toObject());
  const issueId = String(issue._id);

  if (input.isInternal) {
    emitTo(rooms.issueStaff(issueId), SOCKET_EVENTS.commentCreated, dto);
  } else {
    const updated = await Issue.findByIdAndUpdate(
      issue._id,
      { $inc: { commentCount: 1 } },
      { returnDocument: 'after', timestamps: false },
    ).select('commentCount');
    emitTo(rooms.issue(issueId), SOCKET_EVENTS.commentCreated, dto);
    emitTo(rooms.issue(issueId), SOCKET_EVENTS.issueUpdated, {
      id: issueId,
      commentCount: updated?.commentCount,
    });

    const followers = await Follow.find({ issue: issue._id }).distinct('user');
    await notify({
      recipients: followers,
      actor: user.id,
      issue: issue._id,
      type: 'issue_commented',
      message: `${dto.author.name} commented on "${issue.title}"`,
    });
    await ensureFollowing(issue._id, user.id);
  }

  res.status(201).json(dto);
});

/** Mounted at /comments. */
export const commentAdminRouter = Router();

commentAdminRouter.delete('/:commentId', requireAuth, async (req, res) => {
  const user = authUser(req);
  const commentId = idParam(req, 'commentId');
  if (!Types.ObjectId.isValid(commentId)) throw notFound('Comment');
  const comment = await Comment.findById(commentId);
  if (!comment) throw notFound('Comment');

  const isAuthor = String(comment.author) === user.id;
  if (!isAuthor && user.role !== 'admin') throw forbidden();

  await comment.deleteOne();
  const issueId = String(comment.issue);
  if (!comment.isInternal) {
    await Issue.updateOne(
      { _id: comment.issue, commentCount: { $gt: 0 } },
      { $inc: { commentCount: -1 } },
      { timestamps: false },
    );
  }
  emitTo(
    comment.isInternal ? rooms.issueStaff(issueId) : rooms.issue(issueId),
    SOCKET_EVENTS.commentDeleted,
    { id: commentId, issueId },
  );
  res.status(204).end();
});
