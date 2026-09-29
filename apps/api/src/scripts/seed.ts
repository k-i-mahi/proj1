/**
 * Resets the database and fills it with realistic demo data.
 *
 *   npm run seed
 *
 * Demo accounts (password: Password123)
 *   admin@civita.dev      admin
 *   authority@civita.dev  authority
 *   resident@civita.dev   resident
 */
import mongoose, { Types } from 'mongoose';
import type { IssuePriority, IssueStatus } from '@civita/shared';
import { env } from '../config/env.js';
import { Category } from '../models/category.model.js';
import { Comment, Follow, Issue, IssueEvent, Vote } from '../models/issue.model.js';
import { Notification } from '../models/notification.model.js';
import { User, hashPassword } from '../models/user.model.js';
import { slugify } from '../modules/categories/categories.routes.js';
import {
  AREAS,
  CATEGORIES,
  COMMENTS,
  ISSUE_TEMPLATES,
  RESIDENT_NAMES,
  RESOLUTION_NOTES,
  STAFF_NOTES,
} from './seed-data.js';

export const DEMO_PASSWORD = 'Password123';
const ISSUE_COUNT = 72;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// Deterministic PRNG so every seed produces the same dataset.
let state = 20_251_026;
const rand = () => {
  state = (state * 1_664_525 + 1_013_904_223) % 2 ** 32;
  return state / 2 ** 32;
};
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)]!;
const sample = <T>(items: readonly T[], n: number): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, n);
};
const weighted = <T extends string>(weights: Record<T, number>): T => {
  const total = Object.values<number>(weights).reduce((a, b) => a + b, 0);
  let roll = rand() * total;
  for (const [key, w] of Object.entries<number>(weights)) {
    roll -= w;
    if (roll <= 0) return key as T;
  }
  return Object.keys(weights)[0] as T;
};

export const seed = async () => {
  const now = Date.now();
  await mongoose.connection.dropDatabase();
  await mongoose.connection.syncIndexes();

  /* categories */
  const categories = await Category.insertMany(
    CATEGORIES.map((c, i) => ({ ...c, slug: slugify(c.name), order: i })),
  );

  /* users */
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const joined = (daysAgo: number) => new Date(now - daysAgo * DAY);
  const [admin, authority, authority2, demoResident, ...residents] = await User.insertMany(
    [
      {
        name: 'Civita Admin',
        email: 'admin@civita.dev',
        role: 'admin',
        bio: 'Platform administrator.',
        createdAt: joined(120),
      },
      {
        name: 'Engr. Kamal Uddin',
        email: 'authority@civita.dev',
        role: 'authority',
        bio: 'Ward engineering desk, Khulna City Corporation.',
        createdAt: joined(110),
      },
      {
        name: 'Ayesha Siddiqua',
        email: 'ayesha.siddiqua@civita.dev',
        role: 'authority',
        bio: 'Conservancy and sanitation.',
        createdAt: joined(100),
      },
      {
        name: RESIDENT_NAMES[0]!,
        email: 'resident@civita.dev',
        role: 'resident',
        bio: 'CSE student at KUET. Cycling to class every day.',
        createdAt: joined(90),
      },
      ...RESIDENT_NAMES.slice(1).map((name, i) => ({
        name,
        email: `${slugify(name).replace(/-/g, '.')}@example.com`,
        role: 'resident' as const,
        createdAt: joined(85 - i * 4),
      })),
    ].map((u) => ({ ...u, passwordHash, updatedAt: u.createdAt })),
    { timestamps: false },
  );
  const staff = [authority!, authority2!];
  const everyone = [demoResident!, ...residents, authority!, authority2!, admin!];
  const reporters = [demoResident!, demoResident!, ...residents];

  /* issues and their activity */
  const issues: Record<string, unknown>[] = [];
  const votes: Record<string, unknown>[] = [];
  const follows: Record<string, unknown>[] = [];
  const comments: Record<string, unknown>[] = [];
  const events: Record<string, unknown>[] = [];

  for (let n = 0; n < ISSUE_COUNT; n++) {
    const category = pick(categories);
    const template = pick(ISSUE_TEMPLATES[category.name as keyof typeof ISSUE_TEMPLATES]);
    const area = n < 6 ? AREAS[0] : pick(AREAS); // Cluster a few around KUET for the demo.
    const reporter = pick(reporters);
    const createdAt = new Date(now - Math.pow(rand(), 1.4) * 75 * DAY - int(1, 20) * HOUR);
    const ageDays = (now - createdAt.getTime()) / DAY;

    let status: IssueStatus = weighted({
      open: 36,
      in_progress: 24,
      resolved: 30,
      closed: 5,
      rejected: 5,
    });
    if (ageDays < 2 && status !== 'open') status = 'open';
    const priority: IssuePriority = weighted({ low: 15, medium: 45, high: 30, urgent: 10 });
    const _id = new Types.ObjectId();

    const at = (fraction: number) =>
      new Date(createdAt.getTime() + Math.max(HOUR, fraction * (now - createdAt.getTime())));

    events.push({ issue: _id, actor: reporter._id, type: 'created', to: 'open', createdAt });

    let assignee: Types.ObjectId | null = null;
    let resolvedAt: Date | null = null;
    let updatedAt = createdAt;

    if (status !== 'open') {
      const handler = pick(staff);
      const triagedAt = at(0.15);
      if (priority !== 'medium') {
        events.push({
          issue: _id,
          actor: handler._id,
          type: 'priority_changed',
          from: 'medium',
          to: priority,
          createdAt: triagedAt,
        });
      }
      if (status === 'rejected') {
        events.push({
          issue: _id,
          actor: handler._id,
          type: 'status_changed',
          from: 'open',
          to: 'rejected',
          note: 'Duplicate of an existing report; tracking it there.',
          createdAt: triagedAt,
        });
        updatedAt = triagedAt;
      } else {
        assignee = handler._id;
        events.push({
          issue: _id,
          actor: handler._id,
          type: 'assigned',
          to: handler.name,
          createdAt: triagedAt,
        });
        const startedAt = at(0.3);
        events.push({
          issue: _id,
          actor: handler._id,
          type: 'status_changed',
          from: 'open',
          to: 'in_progress',
          note: pick(STAFF_NOTES),
          createdAt: startedAt,
        });
        updatedAt = startedAt;
        if (status === 'resolved' || status === 'closed') {
          resolvedAt = new Date(
            Math.min(
              now - HOUR,
              startedAt.getTime() + int(4, 30) * HOUR + rand() * Math.min(6, ageDays / 3) * DAY,
            ),
          );
          events.push({
            issue: _id,
            actor: handler._id,
            type: 'status_changed',
            from: 'in_progress',
            to: 'resolved',
            note: pick(RESOLUTION_NOTES),
            createdAt: resolvedAt,
          });
          updatedAt = resolvedAt;
          if (status === 'closed') {
            const closedAt = new Date(Math.min(now, resolvedAt.getTime() + 2 * DAY));
            events.push({
              issue: _id,
              actor: handler._id,
              type: 'status_changed',
              from: 'resolved',
              to: 'closed',
              createdAt: closedAt,
            });
            updatedAt = closedAt;
          }
        }
      }
    }

    // Upvotes: skewed so a few issues are clearly popular.
    const voters = sample(
      everyone,
      Math.min(everyone.length, Math.floor(Math.pow(rand(), 2.2) * 17)),
    );
    for (const v of voters) votes.push({ issue: _id, user: v._id, createdAt: at(rand()) });

    const followerIds = new Set([
      String(reporter._id),
      ...sample(voters, int(0, voters.length)).map((v) => String(v._id)),
    ]);
    for (const id of followerIds)
      follows.push({ issue: _id, user: new Types.ObjectId(id), createdAt });

    let publicComments = 0;
    const commentTotal = Math.floor(Math.pow(rand(), 1.6) * 6);
    for (let c = 0; c < commentTotal; c++) {
      const author = pick(everyone);
      comments.push({
        issue: _id,
        author: author._id,
        body: pick(COMMENTS),
        isInternal: false,
        createdAt: at(rand()),
      });
      publicComments++;
    }
    if (assignee && rand() < 0.5) {
      comments.push({
        issue: _id,
        author: assignee,
        body: pick(STAFF_NOTES),
        isInternal: true,
        createdAt: at(0.35),
      });
    }

    const lat = area.lat + (rand() - 0.5) * 0.008;
    const lng = area.lng + (rand() - 0.5) * 0.008;

    issues.push({
      _id,
      title: template.title.replace('{area}', area.name),
      description: template.description,
      category: category._id,
      status,
      priority: status === 'open' && rand() < 0.6 ? 'medium' : priority,
      location: { type: 'Point', coordinates: [lng, lat] },
      address: `${area.name}, Khulna, Bangladesh`,
      images: [],
      reporter: reporter._id,
      assignee,
      upvoteCount: voters.length,
      commentCount: publicComments,
      followerCount: followerIds.size,
      resolvedAt,
      createdAt,
      updatedAt,
    });
  }

  const withUpdatedAt = (docs: Record<string, unknown>[]) =>
    docs.map((d) => ({ ...d, updatedAt: d.updatedAt ?? d.createdAt }));

  await Issue.insertMany(issues, { timestamps: false });
  await Vote.insertMany(votes, { timestamps: false });
  await Follow.insertMany(follows, { timestamps: false });
  await Comment.insertMany(withUpdatedAt(comments), { timestamps: false });
  await IssueEvent.insertMany(events, { timestamps: false });

  /* a few notifications for the demo resident */
  const mine = issues.filter((i) => String(i.reporter) === String(demoResident!._id));
  const notifications = [
    {
      recipient: demoResident!._id,
      type: 'welcome',
      message: 'Welcome to Civita, Tanvir! Report your first issue to get started.',
      createdAt: new Date(now - 80 * DAY),
      readAt: new Date(now - 80 * DAY),
    },
    ...mine.slice(0, 4).map((i, k) => ({
      recipient: demoResident!._id,
      actor: i.assignee ?? authority!._id,
      issue: i._id,
      type: i.status === 'open' ? 'issue_commented' : 'issue_status_changed',
      message:
        i.status === 'open'
          ? `${pick(RESIDENT_NAMES.slice(1))} commented on "${String(i.title)}"`
          : `"${String(i.title)}" is now ${String(i.status).replace('_', ' ')}`,
      createdAt: new Date(now - (k + 1) * 5 * HOUR),
      readAt: k < 2 ? null : new Date(now - k * HOUR),
    })),
  ];
  await Notification.insertMany(notifications, { timestamps: false });

  return {
    categories: categories.length,
    users: everyone.length,
    issues: issues.length,
    votes: votes.length,
    comments: comments.length,
  };
};

const isMain =
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop()!);

if (isMain) {
  if (env.isProd && !process.argv.includes('--force')) {
    console.error('Refusing to wipe a production database. Pass --force if you really mean it.');
    process.exit(1);
  }
  await mongoose.connect(env.MONGODB_URI);
  const counts = await seed();
  console.log('Seeded:', counts);
  console.log(`Demo accounts use the password "${DEMO_PASSWORD}":`);
  console.log('  admin@civita.dev | authority@civita.dev | resident@civita.dev');
  await mongoose.disconnect();
}
