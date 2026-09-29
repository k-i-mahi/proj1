import {
  createIssueSchema,
  listIssuesQuerySchema,
  mapIssuesQuerySchema,
  triageIssueSchema,
  updateIssueSchema,
} from '@civita/shared';
import { Router } from 'express';
import { parse, idParam } from '../../lib/errors.js';
import { authUser, optionalAuth, requireAuth, requireRole } from '../../middleware/auth.js';
import { commentsRouter } from '../comments/comments.routes.js';
import * as issues from './issues.service.js';

export const issuesRouter = Router();

issuesRouter.get('/', optionalAuth, async (req, res) => {
  res.json(await issues.listIssues(parse(listIssuesQuerySchema, req.query), req.user));
});

issuesRouter.get('/map', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=15');
  res.json(await issues.mapIssues(parse(mapIssuesQuerySchema, req.query)));
});

issuesRouter.post('/', requireAuth, async (req, res) => {
  const input = parse(createIssueSchema, req.body);
  res.status(201).json(await issues.createIssue(input, authUser(req)));
});

issuesRouter.get('/:id', optionalAuth, async (req, res) => {
  res.json(await issues.getIssue(idParam(req), req.user));
});

issuesRouter.patch('/:id', requireAuth, async (req, res) => {
  const input = parse(updateIssueSchema, req.body);
  res.json(await issues.updateIssue(idParam(req), input, authUser(req)));
});

issuesRouter.delete('/:id', requireAuth, async (req, res) => {
  await issues.deleteIssue(idParam(req), authUser(req));
  res.status(204).end();
});

issuesRouter.patch(
  '/:id/triage',
  requireAuth,
  requireRole('authority', 'admin'),
  async (req, res) => {
    const input = parse(triageIssueSchema, req.body);
    res.json(await issues.triageIssue(idParam(req), input, authUser(req)));
  },
);

issuesRouter.put('/:id/vote', requireAuth, async (req, res) => {
  res.json(await issues.setVote(idParam(req), authUser(req), true));
});

issuesRouter.delete('/:id/vote', requireAuth, async (req, res) => {
  res.json(await issues.setVote(idParam(req), authUser(req), false));
});

issuesRouter.put('/:id/follow', requireAuth, async (req, res) => {
  res.json(await issues.setFollow(idParam(req), authUser(req), true));
});

issuesRouter.delete('/:id/follow', requireAuth, async (req, res) => {
  res.json(await issues.setFollow(idParam(req), authUser(req), false));
});

issuesRouter.get('/:id/timeline', async (req, res) => {
  res.json(await issues.getTimeline(idParam(req)));
});

issuesRouter.use('/:id/comments', commentsRouter);
