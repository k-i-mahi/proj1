import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Role } from '@civita/shared';
import { env } from '../config/env.js';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
    issuer: 'civita',
  });

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'civita' });
  if (typeof decoded === 'string' || !decoded.sub) throw new Error('Malformed token');
  return { sub: decoded.sub, role: (decoded as jwt.JwtPayload & { role: Role }).role };
};

/** Cryptographically random, URL-safe opaque token. */
export const randomToken = (bytes = 48): string => randomBytes(bytes).toString('base64url');

/** Opaque tokens are stored hashed so a database leak does not leak live sessions. */
export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
