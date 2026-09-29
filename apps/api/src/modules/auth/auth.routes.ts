import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@civita/shared';
import { Router, type CookieOptions, type Request, type Response } from 'express';
import { env } from '../../config/env.js';
import { parse, unauthorized } from '../../lib/errors.js';
import { toUser } from '../../lib/serialize.js';
import { authUser, requireAuth } from '../../middleware/auth.js';
import { authLimiter } from '../../middleware/rate-limit.js';
import { User } from '../../models/user.model.js';
import * as auth from './auth.service.js';

export const REFRESH_COOKIE = 'civita_rt';

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.isProd || env.COOKIE_SAMESITE === 'none',
  sameSite: env.COOKIE_SAMESITE,
  path: '/api/v1/auth',
});

const client = (req: Request): auth.ClientInfo => ({
  userAgent: req.get('user-agent') ?? '',
  ip: req.ip ?? '',
});

const readRefresh = (req: Request): string | undefined => {
  const value: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' ? value : undefined;
};

const sendSession = (res: Response, session: auth.IssuedSession, status = 200) => {
  res.cookie(REFRESH_COOKIE, session.refreshToken, {
    ...cookieOptions(),
    expires: session.refreshExpiresAt,
  });
  res.status(status).json({ user: session.user, accessToken: session.accessToken });
};

export const authRouter = Router();

authRouter.post('/register', authLimiter, async (req, res) => {
  const session = await auth.register(parse(registerSchema, req.body), client(req));
  sendSession(res, session, 201);
});

authRouter.post('/login', authLimiter, async (req, res) => {
  const session = await auth.login(parse(loginSchema, req.body), client(req));
  sendSession(res, session);
});

authRouter.post('/refresh', async (req, res) => {
  const token = readRefresh(req);
  // No cookie simply means "not signed in", which is not an error for the client.
  if (!token) {
    res.status(204).end();
    return;
  }
  try {
    const session = await auth.refresh(token, client(req));
    sendSession(res, session);
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions());
    throw err;
  }
});

authRouter.post('/logout', async (req, res) => {
  await auth.logout(readRefresh(req));
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
  res.status(204).end();
});

authRouter.post('/forgot-password', authLimiter, async (req, res) => {
  const { email } = parse(forgotPasswordSchema, req.body);
  await auth.requestPasswordReset(email);
  res.json({ message: 'If an account exists for that email, a reset link is on its way.' });
});

authRouter.post('/reset-password', authLimiter, async (req, res) => {
  await auth.resetPassword(parse(resetPasswordSchema, req.body));
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
  res.json({ message: 'Your password has been reset. You can now sign in.' });
});

authRouter.post('/change-password', requireAuth, authLimiter, async (req, res) => {
  const input = parse(changePasswordSchema, req.body);
  await auth.changePassword(authUser(req).id, input, readRefresh(req));
  res.json({ message: 'Password updated. Other devices have been signed out.' });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(authUser(req).id).lean();
  if (!user) throw unauthorized();
  res.json(toUser(user));
});
