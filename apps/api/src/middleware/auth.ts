import type { RequestHandler } from 'express';
import type { Role } from '@civita/shared';
import { forbidden, unauthorized, AppError } from '../lib/errors.js';
import { verifyAccessToken } from '../lib/tokens.js';
import { User } from '../models/user.model.js';

export interface AuthUser {
  id: string;
  role: Role;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

const readBearer = (header: string | undefined): string | null =>
  header?.startsWith('Bearer ') ? header.slice(7).trim() || null : null;

/**
 * Resolves the user from the access token. Role and active state are re-read
 * from the database so demotions and deactivations take effect immediately.
 */
const resolveUser = async (token: string): Promise<AuthUser> => {
  let sub: string;
  try {
    sub = verifyAccessToken(token).sub;
  } catch {
    throw new AppError(401, 'TOKEN_INVALID', 'Your session has expired');
  }
  const user = await User.findById(sub).select('role isActive').lean();
  if (!user || !user.isActive) throw unauthorized('Your account is not active');
  return { id: String(user._id), role: user.role };
};

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = readBearer(req.headers.authorization);
  if (!token) throw unauthorized();
  req.user = await resolveUser(token);
  next();
};

/** Attaches the user when a valid token is present, but never rejects. */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  const token = readBearer(req.headers.authorization);
  if (token) {
    try {
      req.user = await resolveUser(token);
    } catch {
      // An expired token on a public route just means an anonymous view.
    }
  }
  next();
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw unauthorized();
    if (!roles.includes(req.user.role)) throw forbidden();
    next();
  };

/** Narrowing helper for handlers mounted behind `requireAuth`. */
export const authUser = (req: { user?: AuthUser }): AuthUser => {
  if (!req.user) throw unauthorized();
  return req.user;
};
