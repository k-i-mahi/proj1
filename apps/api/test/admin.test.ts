import { describe, expect, it } from 'vitest';
import { sniffImageType } from '../src/modules/uploads/uploads.routes.js';
import { api, createCategory, createIssue, createUser } from './helpers.js';

describe('categories', () => {
  it('lists active categories publicly with issue counts', async () => {
    const user = await createUser();
    const roads = await createCategory('Roads');
    await createCategory('Water');
    await createIssue(user, String(roads._id));

    const res = await api().get('/api/v1/categories').expect(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.find((c: { name: string }) => c.name === 'Roads').issueCount).toBe(1);
  });

  it('lets only admins manage categories', async () => {
    const admin = await createUser('admin');
    const authority = await createUser('authority');
    const body = { name: 'Noise Pollution', color: '#123456' };

    await api().post('/api/v1/categories').set(authority.auth).send(body).expect(403);
    const created = await api().post('/api/v1/categories').set(admin.auth).send(body).expect(201);
    expect(created.body).toMatchObject({ slug: 'noise-pollution', isActive: true });

    await api().post('/api/v1/categories').set(admin.auth).send(body).expect(409);

    const updated = await api()
      .patch(`/api/v1/categories/${created.body.id}`)
      .set(admin.auth)
      .send({ isActive: false })
      .expect(200);
    expect(updated.body.isActive).toBe(false);

    const publicList = await api().get('/api/v1/categories').expect(200);
    expect(publicList.body).toHaveLength(0);
    const adminList = await api().get('/api/v1/categories?all=true').set(admin.auth).expect(200);
    expect(adminList.body).toHaveLength(1);
  });

  it('refuses to delete a category that has issues', async () => {
    const admin = await createUser('admin');
    const category = await createCategory('Roads');
    await createIssue(admin, String(category._id));
    await api().delete(`/api/v1/categories/${category._id}`).set(admin.auth).expect(409);
  });
});

describe('users', () => {
  it('updates my profile', async () => {
    const user = await createUser();
    const res = await api()
      .patch('/api/v1/users/me')
      .set(user.auth)
      .send({ name: 'New Name', bio: 'Hello there' })
      .expect(200);
    expect(res.body).toMatchObject({ name: 'New Name', bio: 'Hello there' });
  });

  it('shows public profiles with stats but without email', async () => {
    const user = await createUser();
    const category = await createCategory();
    await createIssue(user, String(category._id));
    const res = await api().get(`/api/v1/users/${user.id}`).expect(200);
    expect(res.body.stats).toMatchObject({ reported: 1, resolved: 0 });
    expect(res.body).not.toHaveProperty('email');
  });

  it('lets admins search, promote and deactivate users', async () => {
    const admin = await createUser('admin');
    const target = await createUser('resident', { name: 'Findable Person' });

    await api().get('/api/v1/users').set(target.auth).expect(403);
    const search = await api().get('/api/v1/users?q=findable').set(admin.auth).expect(200);
    expect(search.body.items.map((u: { id: string }) => u.id)).toEqual([target.id]);

    const promoted = await api()
      .patch(`/api/v1/users/${target.id}`)
      .set(admin.auth)
      .send({ role: 'authority' })
      .expect(200);
    expect(promoted.body.role).toBe('authority');

    await api()
      .patch(`/api/v1/users/${target.id}`)
      .set(admin.auth)
      .send({ isActive: false })
      .expect(200);
    await api().get('/api/v1/auth/me').set(target.auth).expect(401);
  });

  it('stops admins from demoting themselves', async () => {
    const admin = await createUser('admin');
    await api()
      .patch(`/api/v1/users/${admin.id}`)
      .set(admin.auth)
      .send({ role: 'resident' })
      .expect(400);
  });

  it('lists assignable staff for authorities', async () => {
    const authority = await createUser('authority');
    await createUser('resident');
    const res = await api().get('/api/v1/users/staff').set(authority.auth).expect(200);
    expect(res.body.map((u: { role: string }) => u.role)).toEqual(['authority']);
  });
});

describe('analytics', () => {
  it('is staff-only and reports totals and a daily trend', async () => {
    const resident = await createUser();
    const staff = await createUser('authority');
    const category = await createCategory();
    const issue = await createIssue(resident, String(category._id));
    await createIssue(resident, String(category._id));
    await api()
      .patch(`/api/v1/issues/${issue.id}/triage`)
      .set(staff.auth)
      .send({ status: 'resolved' });

    await api().get('/api/v1/analytics/overview').set(resident.auth).expect(403);
    const res = await api().get('/api/v1/analytics/overview?days=7').set(staff.auth).expect(200);
    expect(res.body.totals).toMatchObject({ issues: 2, open: 1, resolved: 1, resolutionRate: 50 });
    expect(res.body.trend).toHaveLength(7);
    expect(res.body.trend.at(-1)).toMatchObject({ reported: 2, resolved: 1 });
    expect(res.body.byCategory[0]).toMatchObject({ name: 'Roads', total: 2, resolved: 1 });
  });

  it('serves public headline stats', async () => {
    const res = await api().get('/api/v1/stats').expect(200);
    expect(res.body).toHaveProperty('issues');
    expect(res.body).toHaveProperty('residents');
  });
});

describe('uploads', () => {
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

  it('detects images by content, not by name', () => {
    expect(sniffImageType(png)).toBe('png');
    expect(sniffImageType(Buffer.from('ffd8ffe0', 'hex'))).toBe('jpg');
    expect(sniffImageType(Buffer.from('RIFF0000WEBP', 'ascii'))).toBe('webp');
    expect(sniffImageType(Buffer.from('<svg onload=alert(1)>'))).toBeNull();
  });

  it('stores a real image and serves it back', async () => {
    const user = await createUser();
    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );
    const res = await api()
      .post('/api/v1/uploads/images')
      .set(user.auth)
      .attach('file', tinyPng, 'dot.png')
      .expect(201);
    expect(res.body.url).toMatch(/\/uploads\/[\w-]+\.png$/);
    const served = await api()
      .get(new URL(res.body.url as string).pathname)
      .expect(200);
    expect(served.headers['content-type']).toBe('image/png');
  });

  it('requires auth and rejects disguised files', async () => {
    const user = await createUser();
    await api().post('/api/v1/uploads/images').attach('file', png, 'a.png').expect(401);
    const res = await api()
      .post('/api/v1/uploads/images')
      .set(user.auth)
      .attach('file', Buffer.from('<html>evil</html>'), {
        filename: 'photo.png',
        contentType: 'image/png',
      })
      .expect(400);
    expect(res.body.error.code).toBe('UPLOAD_ERROR');
  });
});

describe('platform', () => {
  it('reports health and serves OpenAPI docs', async () => {
    await api().get('/health').expect(200);
    const spec = await api().get('/api/openapi.json').expect(200);
    expect(spec.body.openapi).toBe('3.1.0');
    expect(Object.keys(spec.body.paths)).toContain('/issues/{id}/triage');
  });

  it('returns JSON errors for unknown routes and malformed bodies', async () => {
    const missing = await api().get('/api/v1/does-not-exist').expect(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
    const malformed = await api()
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
    expect(malformed.body.error.message).toBe('Malformed JSON body');
  });

  it('sets security headers', async () => {
    const res = await api().get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-request-id']).toEqual(expect.any(String));
  });
});
