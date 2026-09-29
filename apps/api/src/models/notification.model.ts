import { NOTIFICATION_TYPES } from '@civita/shared';
import { Schema, model, type InferSchemaType } from 'mongoose';

const notificationSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    issue: { type: Schema.Types.ObjectId, ref: 'Issue', default: null },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    message: { type: String, required: true, maxlength: 300 },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, readAt: 1 });
// Keep notifications for 90 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export type NotificationFields = InferSchemaType<typeof notificationSchema>;
export const Notification = model('Notification', notificationSchema);
