import { Schema, model, type InferSchemaType } from 'mongoose';

const categorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    description: { type: String, default: '', maxlength: 200 },
    icon: { type: String, default: 'circle-alert' },
    color: { type: String, default: '#6366f1' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type CategoryFields = InferSchemaType<typeof categorySchema>;
export const Category = model('Category', categorySchema);
