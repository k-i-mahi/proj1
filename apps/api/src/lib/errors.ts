import { type z } from 'zod';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, details?: Record<string, string[]>) =>
  new AppError(400, 'BAD_REQUEST', message, details);
export const unauthorized = (message = 'Please sign in to continue') =>
  new AppError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'You do not have permission to do that') =>
  new AppError(403, 'FORBIDDEN', message);
export const notFound = (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found`);
export const conflict = (message: string) => new AppError(409, 'CONFLICT', message);

/** Turns a ZodError into `{ field: [messages] }`, using "_" for form-level errors. */
export const zodDetails = (error: z.ZodError): Record<string, string[]> => {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    (details[key] ??= []).push(issue.message);
  }
  return details;
};

/**
 * Validates untrusted input against a schema and returns the typed result.
 * Throws a 400 with per-field messages on failure.
 */
export const parse = <S extends z.ZodType>(schema: S, data: unknown): z.output<S> => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Some fields are invalid',
      zodDetails(result.error),
    );
  }
  return result.data;
};

/** Reads a route param as a single string (Express 5 types allow arrays for wildcards). */
export const idParam = (
  req: { params: Record<string, string | string[] | undefined> },
  name = 'id',
) => {
  const value = req.params[name];
  if (typeof value !== 'string' || !value) throw notFound();
  return value;
};
