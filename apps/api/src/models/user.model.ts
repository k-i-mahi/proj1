import bcrypt from 'bcryptjs';
import { ROLES } from '@civita/shared';
import { Schema, model, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'resident' },
    avatarUrl: { type: String, default: null },
    bio: { type: String, default: '', maxlength: 280 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, createdAt: -1 });

export type UserFields = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);
