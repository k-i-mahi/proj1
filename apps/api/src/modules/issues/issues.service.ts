import {
  ISSUE_PRIORITY_LABEL,
  ISSUE_STATUS_LABEL,
  SOCKET_EVENTS,
  UPVOTE_MILESTONES,
  isStaff,
  type CreateIssueInput,
  type IssueSummary,
  type ListIssuesParams,
  type MapIssue,
  type Paginated,
  type TriageIssueInput,
  type UpdateIssueInput,
} from '@civita/shared';
import { Types, type PipelineStage } from 'mongoose';
import { AppError, badRequest, forbidden, notFound, unauthorized } from '../../lib/errors.js';
import { emitTo, rooms } from '../../lib/realtime.js';
import {
  CATEGORY_SUMMARY_FIELDS,
  USER_SUMMARY_FIELDS,
  toIssue,
  toIssueEvent,
  type Loose,
} from '../../lib/serialize.js';
import type { AuthUser } from '../../middleware/auth.js';
import { Category } from '../../models/category.model.js';
import { Comment, Follow, Issue, IssueEvent, Vote } from '../../models/issue.model.js';
import { Notification } from '../../models/notification.model.js';
import { User } from '../../models/user.model.js';
import { notify } from '../notifications/notifications.service.js';

const oid = (id: string) => new Types.ObjectId(id);
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ISSUE_POPULATE = [
  { path: 'category', select: CATEGORY_SUMMARY_FIELDS },
  { path: 'reporter', select: USER_SUMMARY_FIELDS },
  { path: 'assignee', select: USER_SUMMARY_FIELDS },
];

const SORTS: Record<Exclude<ListIssuesParams['sort'], 'nearest'>, Record<string, 1 | -1>> = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  top: { upvoteCount: -1, createdAt: -1, _id: -1 },
  discussed: { commentCount: -1, createdAt: -1, _id: -1 },
};

/** Looks up whether the viewer upvoted / follows each of the given issues. */
const viewerFlags = async (userId: string | undefined, issueIds: Types.ObjectId[]) => {
  if (!userId || !issueIds.length) return null;
  const filter = { user: oid(userId), issue: { $in: issueIds } };
  const [votes, follows] = await Promise.all([
    Vote.find(filter).select('issue').lean(),
    Follow.find(filter).select('issue').lean(),
  ]);
  const upvoted = new Set(votes.map((v) => String(v.issue)));
  const following = new Set(follows.map((f) => String(f.issue)));
  return (id: string) => ({ upvoted: upvoted.has(id), following: following.has(id) });
};

const loadIssue = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) throw notFound('Issue');
  const issue = await Issue.findById(id);
  if (!issue) throw notFound('Issue');
  return issue;
};

/** Returns the issue as a DTO, including viewer flags when a viewer is given. */
export const getIssue = async (id: string, viewer?: AuthUser): Promise<IssueSummary> => {
  if (!Types.ObjectId.isValid(id)) throw notFound('Issue');
  const issue = await Issue.findById(id).populate(ISSUE_POPULATE).lean();
  if (!issue) throw notFound('Issue');
  const flags = await viewerFlags(viewer?.id, [issue._id]);
  return toIssue(issue, flags?.(String(issue._id)));
};

/** Broadcasts the latest state of an issue to everyone watching it or the feed. */
const broadcastIssue = async (id: string) => {
  const issue = await getIssue(id);
  emitTo(rooms.issue(id), SOCKET_EVENTS.issueUpdated, issue);
  emitTo(rooms.feed, SOCKET_EVENTS.issueUpdated, issue);
  return issue;
};

export const listIssues = async (
  params: ListIssuesParams,
  viewer?: AuthUser,
): Promise<Paginated<IssueSummary>> => {
  const filter: Record<string, unknown> = {};

  if (params.status?.length) filter.status = { $in: params.status };
  if (params.priority?.length) filter.priority = { $in: params.priority };
  if (params.category?.length) filter.category = { $in: params.category.map(oid) };
  if (params.reporter) filter.reporter = oid(params.reporter);

  if (params.assignee === 'me') {
    if (!viewer) throw unauthorized();
    filter.assignee = oid(viewer.id);
  } else if (params.assignee === 'none') {
    filter.assignee = null;
  } else if (params.assignee) {
    filter.assignee = oid(params.assignee);
  }

  if (params.following) {
    if (!viewer) throw unauthorized();
    const ids = await Follow.find({ user: oid(viewer.id) }).distinct('issue');
    filter._id = { $in: ids };
  }

  if (params.q) {
    const rx = new RegExp(escapeRegex(params.q), 'i');
    filter.$or = [{ title: rx }, { description: rx }, { address: rx }];
  }

  const hasPoint = params.lat !== undefined && params.lng !== undefined;
  if (params.sort === 'nearest' && !hasPoint) {
    throw badRequest('Sorting by distance needs your location (lat and lng)');
  }
  const useGeo = hasPoint && (params.sort === 'nearest' || params.radiusKm !== undefined);

  const pipeline: PipelineStage[] = [];
  if (useGeo) {
    pipeline.push({
      $geoNear: {
        near: { type: 'Point', coordinates: [params.lng!, params.lat!] },
        distanceField: 'distance',
        spherical: true,
        query: filter,
        ...(params.radiusKm ? { maxDistance: params.radiusKm * 1000 } : {}),
      },
    });
  } else {
    pipeline.push({ $match: filter });
  }

  const sort =
    params.sort === 'nearest' ? { distance: 1 as const, _id: 1 as const } : SORTS[params.sort];
  pipeline.push({
    $facet: {
      items: [
        { $sort: sort },
        { $skip: (params.page - 1) * params.limit },
        { $limit: params.limit },
      ],
      total: [{ $count: 'n' }],
    },
  });

  const [result] = await Issue.aggregate<{
    items: Record<string, unknown>[];
    total: { n: number }[];
  }>(pipeline);
  const rawItems = result?.items ?? [];
  const total = result?.total[0]?.n ?? 0;

  const items = await Issue.populate(rawItems, ISSUE_POPULATE);
  const flags = await viewerFlags(
    viewer?.id,
    items.map((i) => i._id as Types.ObjectId),
  );

  return {
    items: items.map((i) => toIssue(i as unknown as Loose, flags?.(String(i._id)))),
    page: params.page,
    limit: params.limit,
    total,
    hasMore: params.page * params.limit < total,
  };
};

export const mapIssues = async (params: {
  status?: string[] | undefined;
  category?: string[] | undefined;
}): Promise<MapIssue[]> => {
  const filter: Record<string, unknown> = {};
  if (params.status?.length) filter.status = { $in: params.status };
  if (params.category?.length) filter.category = { $in: params.category.map(oid) };

  const issues = await Issue.find(filter)
    .select('title status priority category location upvoteCount')
    .sort({ createdAt: -1 })
    .limit(2000)
    .lean();

  return issues.map((i) => ({
    id: String(i._id),
    title: i.title,
    status: i.status,
    priority: i.priority,
    categoryId: String(i.category),
    lng: i.location.coordinates[0]!,
    lat: i.location.coordinates[1]!,
    upvoteCount: i.upvoteCount,
  }));
};

const assertActiveCategory = async (id: string) => {
  const category = await Category.findById(id).select('isActive').lean();
  if (!category || !category.isActive) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Choose a valid category', {
      category: ['Choose a valid category'],
    });
  }
};

export const createIssue = async (
  input: CreateIssueInput & { images: NonNullable<CreateIssueInput['images']> },
  user: AuthUser,
) => {
  await assertActiveCategory(input.category);

  const issue = await Issue.create({
    title: input.title,
    description: input.description,
    category: input.category,
    location: { type: 'Point', coordinates: [input.location.lng, input.location.lat] },
    address: input.address ?? '',
    images: input.images,
    reporter: user.id,
    followerCount: 1,
  });

  await Promise.all([
    Follow.create({ issue: issue._id, user: user.id }),
    IssueEvent.create({ issue: issue._id, actor: user.id, type: 'created', to: 'open' }),
  ]);

  const dto = await getIssue(String(issue._id), user);
  emitTo(rooms.feed, SOCKET_EVENTS.issueCreated, { ...dto, viewer: undefined });
  return dto;
};

const canModify = (issue: { reporter: unknown; status: string }, user: AuthUser) =>
  user.role === 'admin' || (String(issue.reporter) === user.id && issue.status === 'open');

export const updateIssue = async (id: string, input: UpdateIssueInput, user: AuthUser) => {
  const issue = await loadIssue(id);
  if (!canModify(issue, user)) {
    throw forbidden('Only the reporter can edit an issue, and only while it is still open');
  }
  if (input.category) await assertActiveCategory(input.category);

  if (input.title !== undefined) issue.title = input.title;
  if (input.description !== undefined) issue.description = input.description;
  if (input.category !== undefined) issue.set('category', input.category);
  if (input.address !== undefined) issue.address = input.address;
  if (input.images !== undefined) issue.set('images', input.images);
  if (input.location) {
    issue.set('location', { type: 'Point', coordinates: [input.location.lng, input.location.lat] });
  }
  await issue.save();
  await IssueEvent.create({ issue: issue._id, actor: user.id, type: 'edited' });

  await broadcastIssue(id);
  return getIssue(id, user);
};

export const deleteIssue = async (id: string, user: AuthUser) => {
  const issue = await loadIssue(id);
  if (!canModify(issue, user)) {
    throw forbidden('Only the reporter can delete an issue, and only while it is still open');
  }
  await Promise.all([
    Vote.deleteMany({ issue: issue._id }),
    Follow.deleteMany({ issue: issue._id }),
    Comment.deleteMany({ issue: issue._id }),
    IssueEvent.deleteMany({ issue: issue._id }),
    Notification.deleteMany({ issue: issue._id }),
  ]);
  await issue.deleteOne();
};

export const triageIssue = async (id: string, input: TriageIssueInput, actor: AuthUser) => {
  const issue = await loadIssue(id);
  const events: Record<string, unknown>[] = [];
  const note = input.note ?? '';
  const followerIds = () => Follow.find({ issue: issue._id }).distinct('user');

  if (input.status && input.status !== issue.status) {
    events.push({ type: 'status_changed', from: issue.status, to: input.status, note });
    issue.status = input.status;
    if (input.status === 'resolved') issue.resolvedAt = new Date();
    else if (input.status === 'open' || input.status === 'in_progress') issue.resolvedAt = null;
  }

  if (input.priority && input.priority !== issue.priority) {
    events.push({ type: 'priority_changed', from: issue.priority, to: input.priority });
    issue.priority = input.priority;
  }

  let newAssignee: { _id: Types.ObjectId; name: string } | null = null;
  if (input.assignee !== undefined && String(input.assignee) !== String(issue.assignee)) {
    const previous = issue.assignee
      ? await User.findById(issue.assignee).select('name').lean()
      : null;
    if (input.assignee === null) {
      events.push({ type: 'unassigned', from: previous?.name ?? null });
      issue.assignee = null;
    } else {
      const assignee = await User.findById(input.assignee).select('name role isActive').lean();
      if (!assignee || !assignee.isActive || !isStaff(assignee.role)) {
        throw badRequest('Issues can only be assigned to active authority or admin accounts');
      }
      events.push({ type: 'assigned', from: previous?.name ?? null, to: assignee.name, note });
      issue.assignee = assignee._id;
      newAssignee = assignee;
    }
  }

  if (!events.length) return getIssue(id, actor);

  await issue.save();
  await IssueEvent.insertMany(events.map((e) => ({ ...e, issue: issue._id, actor: actor.id })));

  const statusEvent = events.find((e) => e.type === 'status_changed');
  if (statusEvent) {
    const recipients = await followerIds();
    await notify({
      recipients: [...recipients, issue.reporter],
      actor: actor.id,
      issue: issue._id,
      type: 'issue_status_changed',
      message: `"${issue.title}" is now ${ISSUE_STATUS_LABEL[issue.status].toLowerCase()}${note ? `: ${note}` : ''}`,
    });
  }
  if (newAssignee) {
    await notify({
      recipients: [newAssignee._id],
      actor: actor.id,
      issue: issue._id,
      type: 'issue_assigned',
      message: `You were assigned "${issue.title}" (${ISSUE_PRIORITY_LABEL[issue.priority]} priority)`,
    });
  }

  await broadcastIssue(id);
  return getIssue(id, actor);
};

const isDuplicateKey = (err: unknown) =>
  !!err && typeof err === 'object' && 'code' in err && err.code === 11000;

export const setVote = async (id: string, user: AuthUser, upvote: boolean) => {
  const issue = await loadIssue(id);
  let changed = false;

  if (upvote) {
    try {
      await Vote.create({ issue: issue._id, user: user.id });
      changed = true;
    } catch (err) {
      if (!isDuplicateKey(err)) throw err;
    }
  } else {
    changed = (await Vote.deleteOne({ issue: issue._id, user: user.id })).deletedCount > 0;
  }

  let upvoteCount = issue.upvoteCount;
  if (changed) {
    const updated = await Issue.findByIdAndUpdate(
      issue._id,
      { $inc: { upvoteCount: upvote ? 1 : -1 } },
      { returnDocument: 'after', timestamps: false },
    ).select('upvoteCount');
    upvoteCount = Math.max(0, updated?.upvoteCount ?? 0);

    if (upvote && (UPVOTE_MILESTONES as readonly number[]).includes(upvoteCount)) {
      await notify({
        recipients: [issue.reporter],
        issue: issue._id,
        type: 'issue_upvote_milestone',
        message: `Your issue "${issue.title}" reached ${upvoteCount} upvotes`,
      });
    }
    emitTo(rooms.issue(id), SOCKET_EVENTS.issueUpdated, { id, upvoteCount });
  }

  return { upvoted: upvote, upvoteCount };
};

export const setFollow = async (id: string, user: AuthUser, follow: boolean) => {
  const issue = await loadIssue(id);
  let changed = false;

  if (follow) {
    try {
      await Follow.create({ issue: issue._id, user: user.id });
      changed = true;
    } catch (err) {
      if (!isDuplicateKey(err)) throw err;
    }
  } else {
    changed = (await Follow.deleteOne({ issue: issue._id, user: user.id })).deletedCount > 0;
  }

  let followerCount = issue.followerCount;
  if (changed) {
    const updated = await Issue.findByIdAndUpdate(
      issue._id,
      { $inc: { followerCount: follow ? 1 : -1 } },
      { returnDocument: 'after', timestamps: false },
    ).select('followerCount');
    followerCount = Math.max(0, updated?.followerCount ?? 0);
  }
  return { following: follow, followerCount };
};

export const getTimeline = async (id: string) => {
  const issue = await loadIssue(id);
  const events = await IssueEvent.find({ issue: issue._id })
    .sort({ createdAt: 1, _id: 1 })
    .populate('actor', USER_SUMMARY_FIELDS)
    .lean();
  return events.map((e) => toIssueEvent(e));
};

/** Ensures a user follows an issue (used when they comment). */
export const ensureFollowing = async (issueId: Types.ObjectId, userId: string) => {
  try {
    await Follow.create({ issue: issueId, user: userId });
    await Issue.updateOne({ _id: issueId }, { $inc: { followerCount: 1 } }, { timestamps: false });
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
  }
};

export const staffCanSee = (user?: AuthUser) => isStaff(user?.role);
