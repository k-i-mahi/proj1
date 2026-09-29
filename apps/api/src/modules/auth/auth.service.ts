import type {
  AuthResponse,
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '@civita/shared';
import { env } from '../../config/env.js';
import { AppError, badRequest, conflict } from '../../lib/errors.js';
import { passwordResetMail, sendMail } from '../../lib/mailer.js';
import { toUser } from '../../lib/serialize.js';
import { randomToken, sha256, signAccessToken } from '../../lib/tokens.js';
import { Notification } from '../../models/notification.model.js';
import { PasswordReset, Session } from '../../models/session.model.js';
import { User, hashPassword, verifyPassword } from '../../models/user.model.js';

const RESET_TTL_MS = 30 * 60 * 1000;

export interface ClientInfo {
  userAgent: string;
  ip: string;
}

export interface IssuedSession extends AuthResponse {
  refreshToken: string;
  refreshExpiresAt: Date;
}

let dummyHashPromise: Promise<string> | null = null;
const dummyHash = () => (dummyHashPromise ??= hashPassword(randomToken(16)));

const invalidCredentials = () =>
  new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');

const invalidSession = () => new AppError(401, 'SESSION_INVALID', 'Please sign in again');

type UserLike = Parameters<typeof toUser>[0] & { role: AuthResponse['user']['role'] };

const issueSession = async (user: UserLike, client: ClientInfo): Promise<IssuedSession> => {
  const refreshToken = randomToken();
  const refreshExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  await Session.create({
    user: user._id,
    tokenHash: sha256(refreshToken),
    userAgent: client.userAgent.slice(0, 300),
    ip: client.ip,
    expiresAt: refreshExpiresAt,
  });
  return {
    user: toUser(user),
    accessToken: signAccessToken({ sub: String(user._id), role: user.role }),
    refreshToken,
    refreshExpiresAt,
  };
};

export const register = async (input: RegisterInput, client: ClientInfo) => {
  if (await User.exists({ email: input.email })) {
    throw conflict('An account with this email already exists');
  }
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
  });
  await Notification.create({
    recipient: user._id,
    type: 'welcome',
    message: `Welcome to Civita, ${user.name.split(' ')[0]}! Report your first issue to get started.`,
  });
  return issueSession(user.toObject(), client);
};

export const login = async (input: LoginInput, client: ClientInfo) => {
  const user = await User.findOne({ email: input.email }).select('+passwordHash').lean();
  // Always run bcrypt, even for unknown emails, so response timing doesn't reveal which exist.
  const hash = user?.passwordHash ?? (await dummyHash());
  const ok = await verifyPassword(input.password, hash);
  if (!user || !ok) throw invalidCredentials();
  if (!user.isActive) throw new AppError(403, 'ACCOUNT_DISABLED', 'This account has been disabled');
  return issueSession(user, client);
};

/**
 * Rotates a refresh token. Each token can be used once; presenting a token
 * that was already rotated means it was stolen, so every session for that
 * user is revoked.
 */
export const refresh = async (token: string | undefined, client: ClientInfo) => {
  if (!token) throw invalidSession();
  const session = await Session.findOne({ tokenHash: sha256(token) });
  if (!session) throw invalidSession();

  if (session.revokedAt) {
    await Session.updateMany({ user: session.user, revokedAt: null }, { revokedAt: new Date() });
    throw invalidSession();
  }
  if (session.expiresAt.getTime() < Date.now()) throw invalidSession();

  const user = await User.findById(session.user).lean();
  if (!user || !user.isActive) throw invalidSession();

  // Atomic check-and-revoke so two concurrent refreshes can't both succeed.
  const claimed = await Session.updateOne(
    { _id: session._id, revokedAt: null },
    { revokedAt: new Date() },
  );
  if (claimed.modifiedCount === 0) throw invalidSession();

  return issueSession(user, client);
};

export const logout = async (token: string | undefined) => {
  if (!token) return;
  await Session.updateOne({ tokenHash: sha256(token), revokedAt: null }, { revokedAt: new Date() });
};

export const requestPasswordReset = async (email: string) => {
  const user = await User.findOne({ email, isActive: true }).lean();
  // Respond identically whether or not the account exists (no user enumeration).
  if (!user) return;

  const token = randomToken(32);
  await PasswordReset.create({
    user: user._id,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  });
  const link = `${env.webUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await sendMail(passwordResetMail(user.email, user.name, link));
};

export const resetPassword = async (input: ResetPasswordInput) => {
  const reset = await PasswordReset.findOneAndUpdate(
    { tokenHash: sha256(input.token), usedAt: null, expiresAt: { $gt: new Date() } },
    { usedAt: new Date() },
  );
  if (!reset) throw badRequest('This reset link is invalid or has expired');

  await User.updateOne({ _id: reset.user }, { passwordHash: await hashPassword(input.password) });
  // A password reset signs the user out everywhere.
  await Session.updateMany({ user: reset.user, revokedAt: null }, { revokedAt: new Date() });
};

export const changePassword = async (
  userId: string,
  input: ChangePasswordInput,
  currentRefreshToken: string | undefined,
) => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw invalidSession();
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Current password is incorrect', {
      currentPassword: ['Current password is incorrect'],
    });
  }
  user.passwordHash = await hashPassword(input.newPassword);
  await user.save();
  // Keep this device signed in; sign out every other session.
  await Session.updateMany(
    {
      user: user._id,
      revokedAt: null,
      ...(currentRefreshToken ? { tokenHash: { $ne: sha256(currentRefreshToken) } } : {}),
    },
    { revokedAt: new Date() },
  );
};
