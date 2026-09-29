import { describe, expect, it } from 'vitest';
import { outbox } from '../src/lib/mailer.js';
import { Session } from '../src/models/session.model.js';
import { User } from '../src/models/user.model.js';
import { PASSWORD, api, createUser, refreshCookie } from './helpers.js';

const register = (overrides: Record<string, unknown> = {}) =>
  api()
    .post('/api/v1/auth/register')
    .send({ name: 'Nusrat Jahan', email: 'nusrat@test.dev', password: 'Secret123', ...overrides });

describe('registration', () => {
  it('creates an account, returns an access token and sets an httpOnly refresh cookie', async () => {
    const res = await register().expect(201);

    expect(res.body.user).toMatchObject({
      name: 'Nusrat Jahan',
      email: 'nusrat@test.dev',
      role: 'resident',
    });
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.accessToken).toEqual(expect.any(String));

    const cookie = (res.headers['set-cookie'] as unknown as string[]).join(';');
    expect(cookie).toContain('civita_rt=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/api/v1/auth');

    const stored = await User.findOne({ email: 'nusrat@test.dev' }).select('+passwordHash').lean();
    expect(stored?.passwordHash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('normalises email case and rejects duplicates', async () => {
    await register({ email: 'Mixed@Test.dev' }).expect(201);
    const res = await register({ email: 'mixed@test.dev' }).expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns field-level validation errors', async () => {
    const res = await register({ email: 'not-an-email', password: 'short' }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.email).toBeDefined();
    expect(res.body.error.details.password).toBeDefined();
  });

  it('ignores attempts to self-assign a role', async () => {
    const res = await register({ role: 'admin' }).expect(201);
    expect(res.body.user.role).toBe('resident');
  });
});

describe('login', () => {
  it('rejects a wrong password with a generic message', async () => {
    const user = await createUser();
    const res = await api()
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'Wrong1234' })
      .expect(401);
    expect(res.body.error.message).toBe('Email or password is incorrect');
  });

  it('gives the same answer for unknown emails', async () => {
    const res = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@test.dev', password: 'Wrong1234' })
      .expect(401);
    expect(res.body.error.message).toBe('Email or password is incorrect');
  });

  it('blocks deactivated accounts', async () => {
    const user = await createUser();
    await User.updateOne({ email: user.email }, { isActive: false });
    await api()
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: PASSWORD })
      .expect(403);
  });
});

describe('access tokens', () => {
  it('protects /me', async () => {
    await api().get('/api/v1/auth/me').expect(401);
    await api().get('/api/v1/auth/me').set('Authorization', 'Bearer garbage').expect(401);
  });

  it('returns the current user', async () => {
    const user = await createUser('authority');
    const res = await api().get('/api/v1/auth/me').set(user.auth).expect(200);
    expect(res.body).toMatchObject({ id: user.id, role: 'authority' });
  });

  it('stops working as soon as the account is deactivated', async () => {
    const user = await createUser();
    await User.updateOne({ _id: user.id }, { isActive: false });
    await api().get('/api/v1/auth/me').set(user.auth).expect(401);
  });
});

describe('refresh token rotation', () => {
  it('issues a new token pair and invalidates the old refresh token', async () => {
    const user = await createUser();
    const first = refreshCookie(user.cookie);

    const res = await api().post('/api/v1/auth/refresh').set('Cookie', first).expect(200);
    const second = refreshCookie(res.headers['set-cookie'] as unknown as string[]);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(second).not.toBe(first);

    // The second token still works.
    const again = await api().post('/api/v1/auth/refresh').set('Cookie', second).expect(200);
    expect(refreshCookie(again.headers['set-cookie'] as unknown as string[])).toBeTruthy();
  });

  it('revokes every session when a used refresh token is replayed', async () => {
    const user = await createUser();
    const stolen = refreshCookie(user.cookie);

    const res = await api().post('/api/v1/auth/refresh').set('Cookie', stolen).expect(200);
    const legit = refreshCookie(res.headers['set-cookie'] as unknown as string[]);

    // Attacker replays the old token: rejected, and the family is burned.
    await api().post('/api/v1/auth/refresh').set('Cookie', stolen).expect(401);
    await api().post('/api/v1/auth/refresh').set('Cookie', legit).expect(401);
    expect(await Session.countDocuments({ user: user.id, revokedAt: null })).toBe(0);
  });

  it('answers 204 without a cookie and rejects unknown tokens', async () => {
    await api().post('/api/v1/auth/refresh').expect(204);
    await api().post('/api/v1/auth/refresh').set('Cookie', 'civita_rt=nope').expect(401);
  });

  it('logout revokes the session', async () => {
    const user = await createUser();
    const cookie = refreshCookie(user.cookie);
    await api().post('/api/v1/auth/logout').set('Cookie', cookie).expect(204);
    await api().post('/api/v1/auth/refresh').set('Cookie', cookie).expect(401);
  });
});

describe('password reset', () => {
  const latestResetToken = () => {
    const mail = outbox.at(-1);
    const match = mail?.text.match(/token=([\w%-]+)/);
    return match ? decodeURIComponent(match[1]!) : '';
  };

  it('never reveals whether an email is registered and never returns the token', async () => {
    const known = await createUser();
    const a = await api()
      .post('/api/v1/auth/forgot-password')
      .send({ email: known.email })
      .expect(200);
    const b = await api()
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'ghost@test.dev' })
      .expect(200);
    expect(a.body).toEqual(b.body);
    expect(JSON.stringify(a.body)).not.toMatch(/token/i);
  });

  it('resets the password with the emailed single-use token and signs out other sessions', async () => {
    const user = await createUser();
    await api().post('/api/v1/auth/forgot-password').send({ email: user.email }).expect(200);
    const token = latestResetToken();
    expect(token.length).toBeGreaterThanOrEqual(32);

    await api()
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'BrandNew123' })
      .expect(200);

    // Old sessions are gone, the new password works, the old one doesn't.
    await api().post('/api/v1/auth/refresh').set('Cookie', refreshCookie(user.cookie)).expect(401);
    await api()
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'BrandNew123' })
      .expect(200);
    await api()
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: PASSWORD })
      .expect(401);

    // The token cannot be reused.
    await api()
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'Another123' })
      .expect(400);
  });

  it('rejects made-up tokens', async () => {
    await api()
      .post('/api/v1/auth/reset-password')
      .send({ token: 'a'.repeat(43), password: 'BrandNew123' })
      .expect(400);
  });
});

describe('change password', () => {
  it('requires the current password', async () => {
    const user = await createUser();
    const res = await api()
      .post('/api/v1/auth/change-password')
      .set(user.auth)
      .send({ currentPassword: 'Wrong1234', newPassword: 'BrandNew123' })
      .expect(400);
    expect(res.body.error.details.currentPassword).toBeDefined();
  });

  it('keeps the current device signed in but signs out others', async () => {
    const user = await createUser();
    const other = await api()
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: PASSWORD });
    const current = refreshCookie(user.cookie);

    await api()
      .post('/api/v1/auth/change-password')
      .set(user.auth)
      .set('Cookie', current)
      .send({ currentPassword: PASSWORD, newPassword: 'BrandNew123' })
      .expect(200);

    await api().post('/api/v1/auth/refresh').set('Cookie', current).expect(200);
    await api()
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie(other.headers['set-cookie'] as unknown as string[]))
      .expect(401);
  });
});
