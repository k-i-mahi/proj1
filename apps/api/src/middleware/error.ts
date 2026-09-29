import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ApiErrorBody } from '@civita/shared';
import mongoose from 'mongoose';
import multer from 'multer';
import { AppError } from '../lib/errors.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', `No route for ${req.method} ${req.path}`));
};

const normalise = (err: unknown): AppError => {
  if (err instanceof AppError) return err;
  if (err instanceof mongoose.Error.CastError) {
    return new AppError(400, 'BAD_REQUEST', `Invalid value for ${err.path}`);
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const details: Record<string, string[]> = {};
    for (const [key, e] of Object.entries(err.errors)) details[key] = [e.message];
    return new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid', details);
  }
  if (err && typeof err === 'object' && 'code' in err && err.code === 11000) {
    return new AppError(409, 'CONFLICT', 'That value is already taken');
  }
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'That file is too large'
        : 'The upload could not be processed';
    return new AppError(400, 'UPLOAD_ERROR', message);
  }
  if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.parse.failed') {
    return new AppError(400, 'BAD_REQUEST', 'Malformed JSON body');
  }
  if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.too.large') {
    return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  }
  return new AppError(500, 'INTERNAL', 'Something went wrong on our side');
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const appError = normalise(err);
  if (appError.status >= 500) req.log.error({ err }, 'Unhandled error');

  const body: ApiErrorBody = {
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details ? { details: appError.details } : {}),
      requestId: String(req.id),
    },
  };
  res.status(appError.status).json(body);
};
