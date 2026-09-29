import type { Role } from '@civita/shared';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Category } from '../src/models/category.model.js';
import { User, hashPassword } from '../src/models/user.model.js';

export const app = createApp();
export const api = () => request(app);

export const PASSWORD = 'Password123';

let counter = 0;

/** Creates a user directly in the database and signs in, returning the token and cookie. */
export const createUser = async (
  role: Role = 'resident',
  overrides: { name?: string; email?: string } = {},
) => {
  counter += 1;
  const email = overrides.email ?? `user${counter}-${Date.now()}@test.dev`;
  const user = await User.create({
    name: overrides.name ?? `Test ${role} ${counter}`,
    email,
    role,
    passwordHash: await hashPassword(PASSWORD),
  });
  const res = await api()
    .post('/api/v1/auth/login')
    .send({ email, password: PASSWORD })
    .expect(200);
  return {
    id: String(user._id),
    email,
    token: res.body.accessToken as string,
    cookie: res.headers['set-cookie'] as unknown as string[],
    auth: { Authorization: `Bearer ${res.body.accessToken as string}` },
  };
};

export const createCategory = (name = 'Roads') =>
  Category.create({ name, slug: name.toLowerCase(), color: '#f97316', icon: 'construction' });

export const issueInput = (category: string, overrides: Record<string, unknown> = {}) => ({
  title: 'Large pothole outside the main gate',
  description: 'A deep pothole has formed right in the middle of the lane and keeps growing.',
  category,
  location: { lat: 22.8995, lng: 89.5021 },
  address: 'KUET, Khulna',
  ...overrides,
});

export const createIssue = async (
  user: { auth: Record<string, string> },
  category: string,
  overrides: Record<string, unknown> = {},
) => {
  const res = await api()
    .post('/api/v1/issues')
    .set(user.auth)
    .send(issueInput(category, overrides))
    .expect(201);
  return res.body as { id: string; [k: string]: unknown };
};

/** Extracts the refresh token cookie pair ("civita_rt=...") from a Set-Cookie header. */
export const refreshCookie = (setCookie: string[] | string | undefined) => {
  const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const cookie = list.find((c) => c.startsWith('civita_rt='));
  return cookie?.split(';')[0] ?? '';
};
