import { z } from 'zod';
import {
  ISSUE_PRIORITIES,
  ISSUE_SORTS,
  ISSUE_STATUSES,
  MAX_ISSUE_IMAGES,
  ROLES,
} from './constants.js';

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const email = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address').max(254));

export const passwordSchema = z
  .string({ error: 'Password is required' })
  .min(8, 'Use at least 8 characters')
  .max(128, 'Use at most 128 characters')
  .regex(/[a-zA-Z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number');

/* ----------------------------------------------------------------- auth -- */

export const registerSchema = z.object({
  name: z
    .string({ error: 'Name is required' })
    .trim()
    .min(2, 'Name is too short')
    .max(60, 'Name is too long'),
  email,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(128),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/* ---------------------------------------------------------------- users -- */

export const updateMeSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(60).optional(),
  bio: z.string().trim().max(280, 'Keep your bio under 280 characters').optional(),
  avatarUrl: z.url().max(500).nullable().optional(),
});
export type UpdateMeInput = z.infer<typeof updateMeSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const adminUpdateUserSchema = z
  .object({
    role: z.enum(ROLES).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.role !== undefined || v.isActive !== undefined, 'Nothing to update');
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

export const listUsersQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(ROLES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListUsersQuery = z.input<typeof listUsersQuerySchema>;

/* --------------------------------------------------------------- issues -- */

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type Coordinates = z.infer<typeof coordinatesSchema>;

export const issueImageSchema = z.object({
  url: z.url().max(500),
  publicId: z.string().max(200).optional(),
});

export const createIssueSchema = z.object({
  title: z
    .string()
    .trim()
    .min(8, 'Use at least 8 characters')
    .max(120, 'Keep it under 120 characters'),
  description: z.string().trim().min(20, 'Describe the issue in at least 20 characters').max(4000),
  category: objectIdSchema,
  location: coordinatesSchema,
  address: z.string().trim().max(300).optional(),
  images: z.array(issueImageSchema).max(MAX_ISSUE_IMAGES).default([]),
});
export type CreateIssueInput = z.input<typeof createIssueSchema>;

export const updateIssueSchema = createIssueSchema.partial();
export type UpdateIssueInput = z.input<typeof updateIssueSchema>;

export const triageIssueSchema = z
  .object({
    status: z.enum(ISSUE_STATUSES).optional(),
    priority: z.enum(ISSUE_PRIORITIES).optional(),
    assignee: objectIdSchema.nullable().optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine(
    (v) => v.status !== undefined || v.priority !== undefined || v.assignee !== undefined,
    'Nothing to update',
  );
export type TriageIssueInput = z.infer<typeof triageIssueSchema>;

const csvOf = <T extends z.ZodType<string, string>>(item: T) =>
  z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').filter(Boolean) : undefined))
    .pipe(z.array(item).optional());

const booleanish = z
  .enum(['true', 'false', '1', '0'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true' || v === '1'));

export const listIssuesQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: csvOf(z.enum(ISSUE_STATUSES)),
  priority: csvOf(z.enum(ISSUE_PRIORITIES)),
  category: csvOf(objectIdSchema),
  reporter: objectIdSchema.optional(),
  assignee: z.union([objectIdSchema, z.literal('me'), z.literal('none')]).optional(),
  following: booleanish,
  sort: z.enum(ISSUE_SORTS).default('newest'),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0.1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});
export type ListIssuesQuery = z.input<typeof listIssuesQuerySchema>;
export type ListIssuesParams = z.output<typeof listIssuesQuerySchema>;

export const mapIssuesQuerySchema = z.object({
  status: csvOf(z.enum(ISSUE_STATUSES)),
  category: csvOf(objectIdSchema),
});
export type MapIssuesQuery = z.input<typeof mapIssuesQuerySchema>;

/* ------------------------------------------------------------- comments -- */

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, 'Write something first').max(2000),
  isInternal: z.boolean().optional().default(false),
});
export type CreateCommentInput = z.input<typeof createCommentSchema>;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/* ----------------------------------------------------------- categories -- */

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(40),
  description: z.string().trim().max(200).default(''),
  icon: z.string().trim().max(40).default('circle-alert'),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, 'Use a hex colour like #3b82f6')
    .default('#6366f1'),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).max(1000).default(0),
});
export type CategoryInput = z.input<typeof categorySchema>;
export const updateCategorySchema = categorySchema.partial();

/* ------------------------------------------------------------ analytics -- */

export const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(365).default(30),
});
