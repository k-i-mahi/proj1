import {
  adminUpdateUserSchema,
  analyticsQuerySchema,
  categorySchema,
  changePasswordSchema,
  createCommentSchema,
  createIssueSchema,
  forgotPasswordSchema,
  listIssuesQuerySchema,
  listUsersQuerySchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  triageIssueSchema,
  updateCategorySchema,
  updateIssueSchema,
  updateMeSchema,
} from '@civita/shared';
import { z } from 'zod';

/*
 * The OpenAPI document is generated from the same Zod schemas the API uses for
 * validation, so the docs can't drift from the implementation.
 */

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
type Access = 'public' | 'optional' | 'user' | 'staff' | 'admin';

interface RouteDoc {
  method: Method;
  path: string;
  tag: string;
  summary: string;
  access?: Access;
  body?: z.ZodType;
  query?: z.ZodObject;
  status?: number;
  multipart?: boolean;
}

const routes: RouteDoc[] = [
  {
    method: 'post',
    path: '/auth/register',
    tag: 'Auth',
    summary: 'Create an account',
    body: registerSchema,
    status: 201,
  },
  {
    method: 'post',
    path: '/auth/login',
    tag: 'Auth',
    summary: 'Sign in; sets the refresh cookie',
    body: loginSchema,
  },
  {
    method: 'post',
    path: '/auth/refresh',
    tag: 'Auth',
    summary: 'Rotate the refresh cookie and get a new access token (204 when no cookie is present)',
  },
  {
    method: 'post',
    path: '/auth/logout',
    tag: 'Auth',
    summary: 'Revoke the current session',
    status: 204,
  },
  {
    method: 'post',
    path: '/auth/forgot-password',
    tag: 'Auth',
    summary: 'Email a single-use reset link',
    body: forgotPasswordSchema,
  },
  {
    method: 'post',
    path: '/auth/reset-password',
    tag: 'Auth',
    summary: 'Set a new password with a reset token',
    body: resetPasswordSchema,
  },
  {
    method: 'post',
    path: '/auth/change-password',
    tag: 'Auth',
    summary: 'Change password and sign out other devices',
    access: 'user',
    body: changePasswordSchema,
  },
  { method: 'get', path: '/auth/me', tag: 'Auth', summary: 'Current user', access: 'user' },

  {
    method: 'get',
    path: '/issues',
    tag: 'Issues',
    summary: 'List issues with filters, search, sorting and paging',
    access: 'optional',
    query: listIssuesQuerySchema,
  },
  {
    method: 'get',
    path: '/issues/map',
    tag: 'Issues',
    summary: 'Lightweight points for the map view',
  },
  {
    method: 'post',
    path: '/issues',
    tag: 'Issues',
    summary: 'Report an issue',
    access: 'user',
    body: createIssueSchema,
    status: 201,
  },
  {
    method: 'get',
    path: '/issues/{id}',
    tag: 'Issues',
    summary: 'Get an issue',
    access: 'optional',
  },
  {
    method: 'patch',
    path: '/issues/{id}',
    tag: 'Issues',
    summary: 'Edit an issue (reporter while open, or admin)',
    access: 'user',
    body: updateIssueSchema,
  },
  {
    method: 'delete',
    path: '/issues/{id}',
    tag: 'Issues',
    summary: 'Delete an issue (reporter while open, or admin)',
    access: 'user',
    status: 204,
  },
  {
    method: 'patch',
    path: '/issues/{id}/triage',
    tag: 'Issues',
    summary: 'Change status, priority or assignee',
    access: 'staff',
    body: triageIssueSchema,
  },
  {
    method: 'put',
    path: '/issues/{id}/vote',
    tag: 'Issues',
    summary: 'Upvote (idempotent)',
    access: 'user',
  },
  {
    method: 'delete',
    path: '/issues/{id}/vote',
    tag: 'Issues',
    summary: 'Remove upvote',
    access: 'user',
  },
  {
    method: 'put',
    path: '/issues/{id}/follow',
    tag: 'Issues',
    summary: 'Follow (idempotent)',
    access: 'user',
  },
  {
    method: 'delete',
    path: '/issues/{id}/follow',
    tag: 'Issues',
    summary: 'Unfollow',
    access: 'user',
  },
  {
    method: 'get',
    path: '/issues/{id}/timeline',
    tag: 'Issues',
    summary: 'Status and assignment history',
  },

  {
    method: 'get',
    path: '/issues/{id}/comments',
    tag: 'Comments',
    summary: 'List comments (internal notes for staff only)',
    access: 'optional',
  },
  {
    method: 'post',
    path: '/issues/{id}/comments',
    tag: 'Comments',
    summary: 'Add a comment',
    access: 'user',
    body: createCommentSchema,
    status: 201,
  },
  {
    method: 'delete',
    path: '/comments/{id}',
    tag: 'Comments',
    summary: 'Delete a comment (author or admin)',
    access: 'user',
    status: 204,
  },

  {
    method: 'get',
    path: '/categories',
    tag: 'Categories',
    summary: 'List categories with issue counts',
  },
  {
    method: 'post',
    path: '/categories',
    tag: 'Categories',
    summary: 'Create a category',
    access: 'admin',
    body: categorySchema,
    status: 201,
  },
  {
    method: 'patch',
    path: '/categories/{id}',
    tag: 'Categories',
    summary: 'Update a category',
    access: 'admin',
    body: updateCategorySchema,
  },
  {
    method: 'delete',
    path: '/categories/{id}',
    tag: 'Categories',
    summary: 'Delete an unused category',
    access: 'admin',
    status: 204,
  },

  {
    method: 'patch',
    path: '/users/me',
    tag: 'Users',
    summary: 'Update my profile',
    access: 'user',
    body: updateMeSchema,
  },
  {
    method: 'get',
    path: '/users/staff',
    tag: 'Users',
    summary: 'Assignable staff',
    access: 'staff',
  },
  {
    method: 'get',
    path: '/users',
    tag: 'Users',
    summary: 'Search users',
    access: 'admin',
    query: listUsersQuerySchema,
  },
  {
    method: 'patch',
    path: '/users/{id}',
    tag: 'Users',
    summary: 'Change role or active state',
    access: 'admin',
    body: adminUpdateUserSchema,
  },
  { method: 'get', path: '/users/{id}', tag: 'Users', summary: 'Public profile with stats' },

  {
    method: 'get',
    path: '/notifications',
    tag: 'Notifications',
    summary: 'My notifications',
    access: 'user',
  },
  {
    method: 'get',
    path: '/notifications/unread-count',
    tag: 'Notifications',
    summary: 'Unread count',
    access: 'user',
  },
  {
    method: 'patch',
    path: '/notifications/read-all',
    tag: 'Notifications',
    summary: 'Mark all as read',
    access: 'user',
  },
  {
    method: 'patch',
    path: '/notifications/{id}/read',
    tag: 'Notifications',
    summary: 'Mark one as read',
    access: 'user',
  },

  {
    method: 'get',
    path: '/analytics/overview',
    tag: 'Analytics',
    summary: 'Dashboard metrics',
    access: 'staff',
    query: analyticsQuerySchema,
  },
  { method: 'get', path: '/stats', tag: 'Analytics', summary: 'Public headline numbers' },

  {
    method: 'post',
    path: '/uploads/images',
    tag: 'Uploads',
    summary: 'Upload an image (JPEG, PNG or WebP, max 5 MB)',
    access: 'user',
    multipart: true,
    status: 201,
  },
  { method: 'get', path: '/geo/reverse', tag: 'Geo', summary: 'Address for coordinates' },
  { method: 'get', path: '/geo/search', tag: 'Geo', summary: 'Search places by text' },
];

const ACCESS_NOTE: Record<Access, string> = {
  public: '',
  optional: 'Authentication optional; adds viewer-specific fields when signed in.',
  user: 'Requires a signed-in user.',
  staff: 'Requires the authority or admin role.',
  admin: 'Requires the admin role.',
};

const jsonSchema = (schema: z.ZodType) =>
  z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as Record<string, unknown>;

export const buildOpenApi = (serverUrl: string) => {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const r of routes) {
    const access = r.access ?? 'public';
    const params: unknown[] = [];
    for (const match of r.path.matchAll(/\{(\w+)\}/g)) {
      params.push({ name: match[1], in: 'path', required: true, schema: { type: 'string' } });
    }
    if (r.query) {
      const shape = jsonSchema(r.query) as { properties?: Record<string, unknown> };
      for (const [name, schema] of Object.entries(shape.properties ?? {})) {
        params.push({ name, in: 'query', required: false, schema });
      }
    }

    const operation: Record<string, unknown> = {
      tags: [r.tag],
      summary: r.summary,
      ...(ACCESS_NOTE[access] ? { description: ACCESS_NOTE[access] } : {}),
      ...(params.length ? { parameters: params } : {}),
      ...(access !== 'public'
        ? { security: access === 'optional' ? [{}, { bearer: [] }] : [{ bearer: [] }] }
        : {}),
      responses: {
        [String(r.status ?? 200)]: { description: 'Success' },
        '4XX': {
          description: 'Client error',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    };

    if (r.body) {
      operation.requestBody = {
        required: true,
        content: { 'application/json': { schema: jsonSchema(r.body) } },
      };
    } else if (r.multipart) {
      operation.requestBody = {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: { file: { type: 'string', format: 'binary' } },
              required: ['file'],
            },
          },
        },
      };
    }

    (paths[r.path] ??= {})[r.method] = operation;
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'Civita API',
      version: '2.0.0',
      description:
        'REST API for Civita, a civic issue tracker. Access tokens are short-lived JWTs sent as `Authorization: Bearer <token>`; the refresh token lives in an httpOnly cookie scoped to `/api/v1/auth`.',
    },
    servers: [{ url: `${serverUrl}/api/v1` }],
    components: {
      securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: {
                  type: 'object',
                  additionalProperties: { type: 'array', items: { type: 'string' } },
                },
                requestId: { type: 'string' },
              },
              required: ['code', 'message'],
            },
          },
        },
      },
    },
    paths,
  };
};
