import { SOCKET_EVENTS, type NotificationType } from '@civita/shared';
import type { Types } from 'mongoose';
import { logger } from '../../lib/logger.js';
import { emitTo, rooms } from '../../lib/realtime.js';
import { USER_SUMMARY_FIELDS, toNotification } from '../../lib/serialize.js';
import { Notification } from '../../models/notification.model.js';

type Id = Types.ObjectId | string;

interface NotifyInput {
  recipients: Id[];
  actor?: Id | null;
  issue?: Id | null;
  type: NotificationType;
  message: string;
}

/**
 * Creates one notification per recipient (skipping the actor) and pushes each
 * over the socket. Notification failures are logged but never fail the request
 * that caused them.
 */
export const notify = async ({ recipients, actor, issue, type, message }: NotifyInput) => {
  const actorId = actor ? String(actor) : null;
  const unique = [...new Set(recipients.map(String))].filter((id) => id !== actorId);
  if (!unique.length) return;

  try {
    const created = await Notification.insertMany(
      unique.map((recipient) => ({ recipient, actor: actorId, issue, type, message })),
    );
    const populated = await Notification.populate(created, [
      { path: 'actor', select: USER_SUMMARY_FIELDS },
      { path: 'issue', select: 'title' },
    ]);
    for (const n of populated) {
      emitTo(
        rooms.user(String(n.recipient)),
        SOCKET_EVENTS.notification,
        toNotification(n.toObject()),
      );
    }
  } catch (err) {
    logger.error({ err, type }, 'Failed to create notifications');
  }
};
