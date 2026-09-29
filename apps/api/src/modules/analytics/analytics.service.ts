import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  type AnalyticsOverview,
  type PublicStats,
} from '@civita/shared';
import { Category } from '../../models/category.model.js';
import { Issue } from '../../models/issue.model.js';
import { User } from '../../models/user.model.js';

const DAY = 86_400_000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Median hours between report and resolution, over resolved issues. */
const medianResolutionHours = async (): Promise<number | null> => {
  const rows = await Issue.aggregate<{ h: number }>([
    { $match: { status: 'resolved', resolvedAt: { $ne: null } } },
    {
      $project: {
        _id: 0,
        h: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3_600_000] },
      },
    },
    { $sort: { h: 1 } },
    { $limit: 50_000 },
  ]);
  if (!rows.length) return null;
  const mid = Math.floor(rows.length / 2);
  const median = rows.length % 2 ? rows[mid]!.h : (rows[mid - 1]!.h + rows[mid]!.h) / 2;
  return Math.round(median * 10) / 10;
};

const countBy = async <K extends string>(field: string, keys: readonly K[]) => {
  const rows = await Issue.aggregate<{ _id: K; n: number }>([
    { $group: { _id: `$${field}`, n: { $sum: 1 } } },
  ]);
  const map = new Map(rows.map((r) => [r._id, r.n]));
  return keys.map((k) => ({ key: k, count: map.get(k) ?? 0 }));
};

export const getOverview = async (days: number): Promise<AnalyticsOverview> => {
  const to = new Date();
  const from = new Date(
    Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()) - (days - 1) * DAY,
  );

  const [
    byStatus,
    byPriority,
    users,
    median,
    reportedRows,
    resolvedRows,
    categoryRows,
    categories,
    top,
  ] = await Promise.all([
    countBy('status', ISSUE_STATUSES),
    countBy('priority', ISSUE_PRIORITIES),
    User.countDocuments({ isActive: true }),
    medianResolutionHours(),
    Issue.aggregate<{ _id: string; n: number }>([
      { $match: { createdAt: { $gte: from } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          n: { $sum: 1 },
        },
      },
    ]),
    Issue.aggregate<{ _id: string; n: number }>([
      { $match: { resolvedAt: { $gte: from } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$resolvedAt' } },
          n: { $sum: 1 },
        },
      },
    ]),
    Issue.aggregate<{ _id: unknown; total: number; resolved: number }>([
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        },
      },
    ]),
    Category.find().select('name color').lean(),
    Issue.find({ status: { $in: ['open', 'in_progress'] } })
      .sort({ upvoteCount: -1, commentCount: -1 })
      .limit(5)
      .select('title status upvoteCount commentCount')
      .lean(),
  ]);

  const reported = new Map(reportedRows.map((r) => [r._id, r.n]));
  const resolved = new Map(resolvedRows.map((r) => [r._id, r.n]));
  const trend = Array.from({ length: days }, (_, i) => {
    const date = dayKey(new Date(from.getTime() + i * DAY));
    return { date, reported: reported.get(date) ?? 0, resolved: resolved.get(date) ?? 0 };
  });

  const categoryInfo = new Map(categories.map((c) => [String(c._id), c]));
  const byCategory = categoryRows
    .map((r) => {
      const info = categoryInfo.get(String(r._id));
      return {
        categoryId: String(r._id),
        name: info?.name ?? 'Uncategorised',
        color: info?.color ?? '#94a3b8',
        total: r.total,
        resolved: r.resolved,
      };
    })
    .sort((a, b) => b.total - a.total);

  const status = Object.fromEntries(byStatus.map((s) => [s.key, s.count])) as Record<
    (typeof ISSUE_STATUSES)[number],
    number
  >;
  const total = byStatus.reduce((sum, s) => sum + s.count, 0);

  return {
    range: { days, from: from.toISOString(), to: to.toISOString() },
    totals: {
      issues: total,
      open: status.open,
      inProgress: status.in_progress,
      resolved: status.resolved,
      users,
      resolutionRate: total ? Math.round((status.resolved / total) * 1000) / 10 : 0,
      medianResolutionHours: median,
      reportedInRange: trend.reduce((s, d) => s + d.reported, 0),
      resolvedInRange: trend.reduce((s, d) => s + d.resolved, 0),
    },
    trend,
    byCategory,
    byStatus: byStatus.map((s) => ({ status: s.key, count: s.count })),
    byPriority: byPriority.map((p) => ({ priority: p.key, count: p.count })),
    topIssues: top.map((i) => ({
      id: String(i._id),
      title: i.title,
      status: i.status,
      upvoteCount: i.upvoteCount,
      commentCount: i.commentCount,
    })),
  };
};

let statsCache: { at: number; value: PublicStats } | null = null;

/** Headline numbers for the landing page. Cached for a minute. */
export const getPublicStats = async (): Promise<PublicStats> => {
  if (statsCache && Date.now() - statsCache.at < 60_000) return statsCache.value;
  const [issues, resolved, residents, median] = await Promise.all([
    Issue.estimatedDocumentCount(),
    Issue.countDocuments({ status: 'resolved' }),
    User.countDocuments({ isActive: true }),
    medianResolutionHours(),
  ]);
  const value = { issues, resolved, residents, medianResolutionHours: median };
  statsCache = { at: Date.now(), value };
  return value;
};

export const clearStatsCache = () => {
  statsCache = null;
};
