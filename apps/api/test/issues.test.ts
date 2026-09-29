import { beforeEach, describe, expect, it } from 'vitest';
import { Follow, IssueEvent, Vote } from '../src/models/issue.model.js';
import { Notification } from '../src/models/notification.model.js';
import { api, createCategory, createIssue, createUser, issueInput } from './helpers.js';

let categoryId: string;

beforeEach(async () => {
  categoryId = String((await createCategory())._id);
});

describe('creating issues', () => {
  it('requires authentication', async () => {
    await api().post('/api/v1/issues').send(issueInput(categoryId)).expect(401);
  });

  it('creates an open issue, auto-follows the reporter and logs a timeline event', async () => {
    const user = await createUser();
    const issue = await createIssue(user, categoryId);

    expect(issue).toMatchObject({
      status: 'open',
      priority: 'medium',
      followerCount: 1,
      upvoteCount: 0,
      location: { lat: 22.8995, lng: 89.5021 },
      reporter: { id: user.id },
      category: { id: categoryId, name: 'Roads' },
      viewer: { upvoted: false, following: true },
    });
    expect(await IssueEvent.countDocuments({ issue: issue.id, type: 'created' })).toBe(1);
  });

  it('validates input and rejects unknown categories', async () => {
    const user = await createUser();
    const bad = await api()
      .post('/api/v1/issues')
      .set(user.auth)
      .send(issueInput(categoryId, { title: 'short', location: { lat: 200, lng: 0 } }))
      .expect(400);
    expect(Object.keys(bad.body.error.details)).toEqual(
      expect.arrayContaining(['title', 'location.lat']),
    );

    await api()
      .post('/api/v1/issues')
      .set(user.auth)
      .send(issueInput('0123456789abcdef01234567'))
      .expect(400);
  });

  it('rejects NoSQL operator injection in ids', async () => {
    const user = await createUser();
    await api()
      .post('/api/v1/issues')
      .set(user.auth)
      .send(issueInput(categoryId, { category: { $ne: null } }))
      .expect(400);
  });
});

describe('listing issues', () => {
  it('filters, searches, sorts and paginates', async () => {
    const user = await createUser();
    const staff = await createUser('authority');
    const a = await createIssue(user, categoryId, { title: 'Broken streetlight near the park' });
    const b = await createIssue(user, categoryId, { title: 'Garbage pile beside the school gate' });
    await createIssue(user, categoryId, { title: 'Blocked drain flooding the road' });

    await api()
      .patch(`/api/v1/issues/${a.id}/triage`)
      .set(staff.auth)
      .send({ status: 'resolved' })
      .expect(200);
    await api().put(`/api/v1/issues/${b.id}/vote`).set(staff.auth).expect(200);

    const resolved = await api().get('/api/v1/issues?status=resolved').expect(200);
    expect(resolved.body.items.map((i: { id: string }) => i.id)).toEqual([a.id]);

    const search = await api().get('/api/v1/issues?q=garbage').expect(200);
    expect(search.body.total).toBe(1);
    expect(search.body.items[0].id).toBe(b.id);

    const top = await api().get('/api/v1/issues?sort=top').expect(200);
    expect(top.body.items[0].id).toBe(b.id);

    const page = await api().get('/api/v1/issues?limit=2&page=2').expect(200);
    expect(page.body).toMatchObject({ page: 2, limit: 2, total: 3, hasMore: false });
    expect(page.body.items).toHaveLength(1);
  });

  it('treats regex characters in search as literal text', async () => {
    const user = await createUser();
    await createIssue(user, categoryId);
    const res = await api()
      .get('/api/v1/issues?q=' + encodeURIComponent('.*'))
      .expect(200);
    expect(res.body.total).toBe(0);
  });

  it('sorts by distance and filters by radius', async () => {
    const user = await createUser();
    const near = await createIssue(user, categoryId, { location: { lat: 22.9, lng: 89.5 } });
    const far = await createIssue(user, categoryId, { location: { lat: 23.8, lng: 90.4 } });

    const res = await api().get('/api/v1/issues?sort=nearest&lat=22.9&lng=89.5').expect(200);
    expect(res.body.items.map((i: { id: string }) => i.id)).toEqual([near.id, far.id]);
    expect(res.body.items[0].distanceKm).toBe(0);

    const within = await api().get('/api/v1/issues?lat=22.9&lng=89.5&radiusKm=10').expect(200);
    expect(within.body.items.map((i: { id: string }) => i.id)).toEqual([near.id]);

    await api().get('/api/v1/issues?sort=nearest').expect(400);
  });

  it('supports "following" and "assigned to me" views', async () => {
    const reporter = await createUser();
    const other = await createUser();
    const staff = await createUser('authority');
    const issue = await createIssue(reporter, categoryId);
    await createIssue(reporter, categoryId, { title: 'Another issue somewhere else' });

    await api().put(`/api/v1/issues/${issue.id}/follow`).set(other.auth).expect(200);
    const following = await api().get('/api/v1/issues?following=true').set(other.auth).expect(200);
    expect(following.body.items.map((i: { id: string }) => i.id)).toEqual([issue.id]);

    await api()
      .patch(`/api/v1/issues/${issue.id}/triage`)
      .set(staff.auth)
      .send({ assignee: staff.id })
      .expect(200);
    const mine = await api().get('/api/v1/issues?assignee=me').set(staff.auth).expect(200);
    expect(mine.body.total).toBe(1);

    await api().get('/api/v1/issues?following=true').expect(401);
  });

  it('serves compact map points', async () => {
    const user = await createUser();
    const issue = await createIssue(user, categoryId);
    const res = await api().get('/api/v1/issues/map').expect(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        id: issue.id,
        lat: 22.8995,
        lng: 89.5021,
        status: 'open',
        categoryId,
      }),
    ]);
  });
});

describe('votes and follows', () => {
  it('is idempotent and keeps counters exact', async () => {
    const reporter = await createUser();
    const voter = await createUser();
    const issue = await createIssue(reporter, categoryId);
    const url = `/api/v1/issues/${issue.id}/vote`;

    await api().put(url).set(voter.auth).expect(200);
    const twice = await api().put(url).set(voter.auth).expect(200);
    expect(twice.body).toEqual({ upvoted: true, upvoteCount: 1 });

    const detail = await api().get(`/api/v1/issues/${issue.id}`).set(voter.auth).expect(200);
    expect(detail.body.viewer).toEqual({ upvoted: true, following: false });

    await api().delete(url).set(voter.auth).expect(200);
    const again = await api().delete(url).set(voter.auth).expect(200);
    expect(again.body).toEqual({ upvoted: false, upvoteCount: 0 });
    expect(await Vote.countDocuments()).toBe(0);
  });

  it('handles concurrent upvotes from the same user', async () => {
    const reporter = await createUser();
    const issue = await createIssue(reporter, categoryId);
    const voter = await createUser();
    await Promise.all(
      Array.from({ length: 5 }, () => api().put(`/api/v1/issues/${issue.id}/vote`).set(voter.auth)),
    );
    const res = await api().get(`/api/v1/issues/${issue.id}`).expect(200);
    expect(res.body.upvoteCount).toBe(1);
  });

  it('notifies the reporter at upvote milestones', async () => {
    const reporter = await createUser();
    const issue = await createIssue(reporter, categoryId);
    for (let i = 0; i < 5; i++) {
      const voter = await createUser();
      await api().put(`/api/v1/issues/${issue.id}/vote`).set(voter.auth).expect(200);
    }
    const n = await Notification.find({
      recipient: reporter.id,
      type: 'issue_upvote_milestone',
    }).lean();
    expect(n).toHaveLength(1);
    expect(n[0]!.message).toContain('5 upvotes');
  });

  it('follows and unfollows', async () => {
    const reporter = await createUser();
    const user = await createUser();
    const issue = await createIssue(reporter, categoryId);
    const res = await api().put(`/api/v1/issues/${issue.id}/follow`).set(user.auth).expect(200);
    expect(res.body).toEqual({ following: true, followerCount: 2 });
    const off = await api().delete(`/api/v1/issues/${issue.id}/follow`).set(user.auth).expect(200);
    expect(off.body).toEqual({ following: false, followerCount: 1 });
  });

  it('returns 404 for unknown issues', async () => {
    const user = await createUser();
    await api().put('/api/v1/issues/0123456789abcdef01234567/vote').set(user.auth).expect(404);
    await api().get('/api/v1/issues/not-an-id').expect(404);
  });
});

describe('triage', () => {
  it('is restricted to authorities and admins', async () => {
    const resident = await createUser();
    const issue = await createIssue(resident, categoryId);
    await api()
      .patch(`/api/v1/issues/${issue.id}/triage`)
      .set(resident.auth)
      .send({ status: 'resolved' })
      .expect(403);
  });

  it('records events, sets resolvedAt and notifies followers and the assignee', async () => {
    const reporter = await createUser();
    const follower = await createUser();
    const staff = await createUser('authority');
    const colleague = await createUser('authority');
    const issue = await createIssue(reporter, categoryId);
    await api().put(`/api/v1/issues/${issue.id}/follow`).set(follower.auth);

    const res = await api()
      .patch(`/api/v1/issues/${issue.id}/triage`)
      .set(staff.auth)
      .send({
        status: 'in_progress',
        priority: 'high',
        assignee: colleague.id,
        note: 'Crew scheduled',
      })
      .expect(200);
    expect(res.body).toMatchObject({
      status: 'in_progress',
      priority: 'high',
      assignee: { id: colleague.id },
    });

    const timeline = await api().get(`/api/v1/issues/${issue.id}/timeline`).expect(200);
    expect(timeline.body.map((e: { type: string }) => e.type)).toEqual([
      'created',
      'status_changed',
      'priority_changed',
      'assigned',
    ]);

    const statusNotes = await Notification.find({ type: 'issue_status_changed' }).lean();
    expect(statusNotes.map((n) => String(n.recipient)).sort()).toEqual(
      [reporter.id, follower.id].sort(),
    );
    expect(
      await Notification.countDocuments({ type: 'issue_assigned', recipient: colleague.id }),
    ).toBe(1);

    const resolved = await api()
      .patch(`/api/v1/issues/${issue.id}/triage`)
      .set(staff.auth)
      .send({ status: 'resolved' })
      .expect(200);
    expect(resolved.body.resolvedAt).toEqual(expect.any(String));
  });

  it('only assigns to active staff', async () => {
    const reporter = await createUser();
    const staff = await createUser('authority');
    const issue = await createIssue(reporter, categoryId);
    await api()
      .patch(`/api/v1/issues/${issue.id}/triage`)
      .set(staff.auth)
      .send({ assignee: reporter.id })
      .expect(400);
  });

  it('rejects empty updates', async () => {
    const reporter = await createUser();
    const staff = await createUser('admin');
    const issue = await createIssue(reporter, categoryId);
    await api()
      .patch(`/api/v1/issues/${issue.id}/triage`)
      .set(staff.auth)
      .send({ note: 'hi' })
      .expect(400);
  });
});

describe('editing and deleting', () => {
  it('lets the reporter edit while open, but not after triage', async () => {
    const reporter = await createUser();
    const staff = await createUser('authority');
    const issue = await createIssue(reporter, categoryId);

    const edited = await api()
      .patch(`/api/v1/issues/${issue.id}`)
      .set(reporter.auth)
      .send({ title: 'Updated title for this issue' })
      .expect(200);
    expect(edited.body.title).toBe('Updated title for this issue');

    await api()
      .patch(`/api/v1/issues/${issue.id}/triage`)
      .set(staff.auth)
      .send({ status: 'in_progress' });
    await api()
      .patch(`/api/v1/issues/${issue.id}`)
      .set(reporter.auth)
      .send({ title: 'Too late to edit this' })
      .expect(403);
  });

  it('forbids other residents from editing or deleting', async () => {
    const reporter = await createUser();
    const other = await createUser();
    const issue = await createIssue(reporter, categoryId);
    await api()
      .patch(`/api/v1/issues/${issue.id}`)
      .set(other.auth)
      .send({ title: 'Hijacked title here' })
      .expect(403);
    await api().delete(`/api/v1/issues/${issue.id}`).set(other.auth).expect(403);
  });

  it('cascades deletes to votes, follows and events', async () => {
    const reporter = await createUser();
    const issue = await createIssue(reporter, categoryId);
    await api().put(`/api/v1/issues/${issue.id}/vote`).set(reporter.auth);
    await api().delete(`/api/v1/issues/${issue.id}`).set(reporter.auth).expect(204);

    await api().get(`/api/v1/issues/${issue.id}`).expect(404);
    expect(await Vote.countDocuments({ issue: issue.id })).toBe(0);
    expect(await Follow.countDocuments({ issue: issue.id })).toBe(0);
    expect(await IssueEvent.countDocuments({ issue: issue.id })).toBe(0);
  });
});
