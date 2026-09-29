import type {
  Category,
  Comment,
  IssueEvent,
  IssueSummary,
  Notification,
  Role,
  User,
  UserSummary,
} from '@civita/shared';
import type { Types } from 'mongoose';

/*
 * Serializers turn Mongoose documents or lean objects into the public DTOs
 * defined in @civita/shared. Nothing leaves the API without going through one,
 * so internal fields like passwordHash can never leak by accident.
 */

type Id = Types.ObjectId | string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Loose = { _id: Id } & Record<string, any>;

const iso = (d: unknown): string => (d instanceof Date ? d.toISOString() : String(d));
const isoOrNull = (d: unknown): string | null => (d ? iso(d) : null);

/** Returns a populated sub-document, or null when it is missing or not populated. */
const populated = (v: unknown): Loose | null =>
  v && typeof v === 'object' && '_id' in v && ('name' in v || 'slug' in v) ? (v as Loose) : null;

export const toUserSummary = (u: unknown): UserSummary | null => {
  const doc = populated(u);
  if (!doc) return null;
  return {
    id: String(doc._id),
    name: String(doc.name),
    avatarUrl: (doc.avatarUrl as string | null) ?? null,
    role: doc.role as Role,
  };
};

const deletedUser: UserSummary = {
  id: '',
  name: 'Deleted user',
  avatarUrl: null,
  role: 'resident',
};

export const toUser = (u: Loose): User => ({
  ...(toUserSummary(u) ?? deletedUser),
  email: String(u.email),
  bio: String(u.bio ?? ''),
  isActive: Boolean(u.isActive),
  createdAt: iso(u.createdAt),
});

export const toCategory = (c: Loose, issueCount = 0): Category => ({
  id: String(c._id),
  slug: String(c.slug),
  name: String(c.name),
  description: String(c.description ?? ''),
  icon: String(c.icon),
  color: String(c.color),
  isActive: Boolean(c.isActive),
  order: Number(c.order ?? 0),
  issueCount,
});

export const toIssue = (
  i: Loose,
  viewer?: { upvoted: boolean; following: boolean },
): IssueSummary => {
  const category = populated(i.category);
  const location = i.location as { coordinates: [number, number] };
  const distance = i.distance as number | undefined;
  return {
    id: String(i._id),
    title: String(i.title),
    description: String(i.description),
    status: i.status as IssueSummary['status'],
    priority: i.priority as IssueSummary['priority'],
    category: category
      ? {
          id: String(category._id),
          name: String(category.name),
          slug: String(category.slug),
          icon: String(category.icon),
          color: String(category.color),
        }
      : { id: '', name: 'Uncategorised', slug: 'uncategorised', icon: 'circle', color: '#94a3b8' },
    location: { lng: location.coordinates[0], lat: location.coordinates[1] },
    address: String(i.address ?? ''),
    images: ((i.images as { url: string; publicId?: string | null }[]) ?? []).map((img) => ({
      url: img.url,
      ...(img.publicId ? { publicId: img.publicId } : {}),
    })),
    reporter: toUserSummary(i.reporter) ?? deletedUser,
    assignee: toUserSummary(i.assignee),
    upvoteCount: Number(i.upvoteCount ?? 0),
    commentCount: Number(i.commentCount ?? 0),
    followerCount: Number(i.followerCount ?? 0),
    createdAt: iso(i.createdAt),
    updatedAt: iso(i.updatedAt),
    resolvedAt: isoOrNull(i.resolvedAt),
    ...(distance !== undefined ? { distanceKm: Math.round(distance / 100) / 10 } : {}),
    ...(viewer ? { viewer } : {}),
  };
};

export const toComment = (c: Loose): Comment => ({
  id: String(c._id),
  issueId: String(c.issue),
  author: toUserSummary(c.author) ?? deletedUser,
  body: String(c.body),
  isInternal: Boolean(c.isInternal),
  createdAt: iso(c.createdAt),
});

export const toIssueEvent = (e: Loose): IssueEvent => ({
  id: String(e._id),
  type: e.type as IssueEvent['type'],
  actor: toUserSummary(e.actor),
  from: (e.from as string | null) ?? null,
  to: (e.to as string | null) ?? null,
  note: String(e.note ?? ''),
  createdAt: iso(e.createdAt),
});

export const toNotification = (n: Loose): Notification => {
  const issue =
    n.issue && typeof n.issue === 'object' && 'title' in n.issue ? (n.issue as Loose) : null;
  return {
    id: String(n._id),
    type: n.type as Notification['type'],
    message: String(n.message),
    actor: toUserSummary(n.actor),
    issue: issue ? { id: String(issue._id), title: String(issue.title) } : null,
    readAt: isoOrNull(n.readAt),
    createdAt: iso(n.createdAt),
  };
};

export const USER_SUMMARY_FIELDS = 'name avatarUrl role';
export const CATEGORY_SUMMARY_FIELDS = 'name slug icon color';
