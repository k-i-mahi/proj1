import { ISSUE_EVENT_TYPES, ISSUE_PRIORITIES, ISSUE_STATUSES } from '@civita/shared';
import { Schema, model, type InferSchemaType } from 'mongoose';

const pointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    /** GeoJSON order: [longitude, latitude]. */
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

const issueSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 4000 },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    status: { type: String, enum: ISSUE_STATUSES, default: 'open' },
    priority: { type: String, enum: ISSUE_PRIORITIES, default: 'medium' },
    location: { type: pointSchema, required: true },
    address: { type: String, default: '', maxlength: 300 },
    images: {
      type: [{ _id: false, url: { type: String, required: true }, publicId: String }],
      default: [],
    },
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignee: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    // Denormalised counters; the source of truth lives in Vote, Follow and Comment.
    upvoteCount: { type: Number, default: 0, min: 0 },
    commentCount: { type: Number, default: 0, min: 0 },
    followerCount: { type: Number, default: 0, min: 0 },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

issueSchema.index({ location: '2dsphere' });
issueSchema.index({ status: 1, createdAt: -1 });
issueSchema.index({ category: 1, status: 1 });
issueSchema.index({ reporter: 1, createdAt: -1 });
issueSchema.index({ assignee: 1, status: 1 });
issueSchema.index({ upvoteCount: -1, createdAt: -1 });

export type IssueFields = InferSchemaType<typeof issueSchema>;
export const Issue = model('Issue', issueSchema);

/* ------------------------------------------------------ votes & follows -- */

const edgeSchema = () => {
  const schema = new Schema(
    {
      issue: { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
      user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } },
  );
  schema.index({ issue: 1, user: 1 }, { unique: true });
  schema.index({ user: 1, createdAt: -1 });
  return schema;
};

export const Vote = model('Vote', edgeSchema());
export const Follow = model('Follow', edgeSchema());

/* ------------------------------------------------------------- comments -- */

const commentSchema = new Schema(
  {
    issue: { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, maxlength: 2000 },
    /** Internal notes are only visible to authorities and admins. */
    isInternal: { type: Boolean, default: false },
  },
  { timestamps: true },
);

commentSchema.index({ issue: 1, createdAt: 1 });
commentSchema.index({ author: 1 });

export type CommentFields = InferSchemaType<typeof commentSchema>;
export const Comment = model('Comment', commentSchema);

/* --------------------------------------------------------------- events -- */

const issueEventSchema = new Schema(
  {
    issue: { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    type: { type: String, enum: ISSUE_EVENT_TYPES, required: true },
    from: { type: String, default: null },
    to: { type: String, default: null },
    note: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

issueEventSchema.index({ issue: 1, createdAt: 1 });

export const IssueEvent = model('IssueEvent', issueEventSchema);
