import { beforeEach, describe, expect, it } from 'vitest';
import { Notification } from '../src/models/notification.model.js';
import { api, createCategory, createIssue, createUser } from './helpers.js';

let categoryId: string;

beforeEach(async () => {
  categoryId = String((await createCategory())._id);
});

describe('comments', () => {
  it('adds comments, bumps the counter, notifies followers and auto-follows the author', async () => {
    const reporter = await createUser();
    const commenter = await createUser();
    const issue = await createIssue(reporter, categoryId);

    const res = await api()
      .post(`/api/v1/issues/${issue.id}/comments`)
      .set(commenter.auth)
      .send({ body: 'Same problem on my street.' })
      .expect(201);
    expect(res.body).toMatchObject({
      body: 'Same problem on my street.',
      author: { id: commenter.id },
    });

    const detail = await api().get(`/api/v1/issues/${issue.id}`).set(commenter.auth).expect(200);
    expect(detail.body.commentCount).toBe(1);
    expect(detail.body.viewer.following).toBe(true);

    const notes = await Notification.find({ type: 'issue_commented' }).lean();
    expect(notes.map((n) => String(n.recipient))).toEqual([reporter.id]);
  });

  it('hides internal notes from residents and blocks them from posting any', async () => {
    const reporter = await createUser();
    const staff = await createUser('authority');
    const issue = await createIssue(reporter, categoryId);

    await api()
      .post(`/api/v1/issues/${issue.id}/comments`)
      .set(staff.auth)
      .send({ body: 'Contractor booked for Thursday', isInternal: true })
      .expect(201);
    await api()
      .post(`/api/v1/issues/${issue.id}/comments`)
      .set(reporter.auth)
      .send({ body: 'Sneaky', isInternal: true })
      .expect(403);

    const publicView = await api()
      .get(`/api/v1/issues/${issue.id}/comments`)
      .set(reporter.auth)
      .expect(200);
    expect(publicView.body.total).toBe(0);

    const staffView = await api()
      .get(`/api/v1/issues/${issue.id}/comments`)
      .set(staff.auth)
      .expect(200);
    expect(staffView.body.items[0]).toMatchObject({ isInternal: true });

    // Internal notes don't count toward the public counter or notify residents.
    const detail = await api().get(`/api/v1/issues/${issue.id}`).expect(200);
    expect(detail.body.commentCount).toBe(0);
    expect(await Notification.countDocuments({ type: 'issue_commented' })).toBe(0);
  });

  it('lets authors and admins delete comments, but nobody else', async () => {
    const reporter = await createUser();
    const other = await createUser();
    const admin = await createUser('admin');
    const issue = await createIssue(reporter, categoryId);
    const post = () =>
      api().post(`/api/v1/issues/${issue.id}/comments`).set(reporter.auth).send({ body: 'hello' });

    const first = (await post()).body.id as string;
    const second = (await post()).body.id as string;

    await api().delete(`/api/v1/comments/${first}`).set(other.auth).expect(403);
    await api().delete(`/api/v1/comments/${first}`).set(reporter.auth).expect(204);
    await api().delete(`/api/v1/comments/${second}`).set(admin.auth).expect(204);

    const detail = await api().get(`/api/v1/issues/${issue.id}`).expect(200);
    expect(detail.body.commentCount).toBe(0);
  });
});

describe('notifications', () => {
  it('lists, counts and marks notifications as read for the recipient only', async () => {
    const reporter = await createUser();
    const commenter = await createUser();
    const stranger = await createUser();
    const issue = await createIssue(reporter, categoryId);
    await api()
      .post(`/api/v1/issues/${issue.id}/comments`)
      .set(commenter.auth)
      .send({ body: 'hi' });

    const count = await api()
      .get('/api/v1/notifications/unread-count')
      .set(reporter.auth)
      .expect(200);
    expect(count.body.count).toBe(1);

    const list = await api().get('/api/v1/notifications').set(reporter.auth).expect(200);
    const id = list.body.items[0].id as string;
    expect(list.body.items[0]).toMatchObject({ type: 'issue_commented', issue: { id: issue.id } });

    await api().patch(`/api/v1/notifications/${id}/read`).set(stranger.auth).expect(404);
    const read = await api()
      .patch(`/api/v1/notifications/${id}/read`)
      .set(reporter.auth)
      .expect(200);
    expect(read.body.readAt).toEqual(expect.any(String));

    const after = await api()
      .get('/api/v1/notifications/unread-count')
      .set(reporter.auth)
      .expect(200);
    expect(after.body.count).toBe(0);
  });

  it('marks everything read', async () => {
    const user = await createUser();
    await Notification.insertMany([
      { recipient: user.id, type: 'welcome', message: 'a' },
      { recipient: user.id, type: 'welcome', message: 'b' },
    ]);
    const res = await api().patch('/api/v1/notifications/read-all').set(user.auth).expect(200);
    expect(res.body.updated).toBe(2);
  });
});
