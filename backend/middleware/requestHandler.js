// middleware/requestHandler.js

const { validationResult } = require('express-validator');
const asyncHandler = require('express-async-handler');
/**
 * Validate request using express-validator
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.param || err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }

  next();
};


/**
 * Async handler to wrap async route handlers
 */
exports.asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Not found handler
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Error handler
 */
exports.errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
};

/**
 * Request logger middleware (development only)
 * Logs all incoming requests with timing information
 */
const logger = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    const start = Date.now();

    // Log request
    console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.path}`);

    // Log authenticated user
    if (req.user) {
      console.log(`User: ${req.user.role} (${req.user._id})`);
    }

    // Log query parameters
    if (Object.keys(req.query).length > 0) {
      console.log('Query:', JSON.stringify(req.query, null, 2));
    }

    // Log body (exclude sensitive fields)
    if (req.body && Object.keys(req.body).length > 0) {
      const sanitizedBody = { ...req.body };
      if (sanitizedBody.password) sanitizedBody.password = '***';
      if (sanitizedBody.currentPassword) sanitizedBody.currentPassword = '***';
      if (sanitizedBody.newPassword) sanitizedBody.newPassword = '***';
      console.log('Body:', JSON.stringify(sanitizedBody, null, 2));
    }

    // Log response
    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      const statusColor =
        status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
      console.log(
        `${statusColor}${status}\x1b[0m ${req.method} ${req.path} - ${duration}ms`,
      );
    });
  }

  next();
};

/**
 * Pagination helper middleware
 * Adds pagination metadata to request
 * Usage: router.get('/route', paginate, controller)
 */
const paginate = (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const maxLimit = 100;

  // Ensure limit doesn't exceed max
  const validLimit = Math.min(limit, maxLimit);

  req.pagination = {
    page: Math.max(1, page),
    limit: validLimit,
    skip: (Math.max(1, page) - 1) * validLimit,
  };

  next();
};

/**
 * Sort helper middleware
 * Parses and validates sort parameters
 * Usage: router.get('/route', sort(['name', 'createdAt', 'status']), controller)
 */
const sort = (allowedFields = []) => {
  return (req, res, next) => {
    const sortParam = req.query.sort || '-createdAt';
    const sortOrder = sortParam.startsWith('-') ? -1 : 1;
    const sortField = sortParam.replace(/^-/, '');

    // Validate sort field if allowed fields specified
    if (allowedFields.length > 0 && !allowedFields.includes(sortField)) {
      return res.status(400).json({
        success: false,
        message: `Invalid sort field. Allowed: ${allowedFields.join(', ')}`,
      });
    }

    req.sort = { [sortField]: sortOrder };
    next();
  };
};

/**
 * Search helper middleware
 * Parses search query and creates search object
 * Usage: router.get('/route', search(['title', 'description']), controller)
 */
const search = (searchFields = []) => {
  return (req, res, next) => {
    const searchQuery = req.query.search || req.query.q;

    if (!searchQuery) {
      req.search = null;
      return next();
    }

    if (searchFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search not configured for this route',
      });
    }

    // Create MongoDB search query
    req.search = {
      $or: searchFields.map((field) => ({
        [field]: { $regex: searchQuery, $options: 'i' },
      })),
    };

    next();
  };
};

/**
 * Cache helper middleware
 * Simple in-memory caching for GET requests
 * Usage: router.get('/route', cache(300), controller) // 300 seconds
 */
const cache = (duration = 300) => {
  const cacheStore = new Map();

  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `${req.path}_${JSON.stringify(req.query)}_${
      req.user?._id || 'public'
    }`;
    const cached = cacheStore.get(key);

    if (cached) {
      const age = (Date.now() - cached.timestamp) / 1000;

      if (age < duration) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Age', Math.floor(age));
        return res.json(cached.data);
      }

      // Remove expired cache
      cacheStore.delete(key);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = (data) => {
      if (res.statusCode === 200) {
        cacheStore.set(key, {
          data,
          timestamp: Date.now(),
        });

        res.setHeader('X-Cache', 'MISS');

        // Cleanup old cache entries (1% chance per request)
        if (Math.random() < 0.01) {
          const now = Date.now();
          for (const [k, v] of cacheStore.entries()) {
            if ((now - v.timestamp) / 1000 > duration) {
              cacheStore.delete(k);
            }
          }
        }
      }

      return originalJson(data);
    };

    next();
  };
};

/**
 * Request timeout middleware
 * Prevents long-running requests
 * Usage: router.get('/route', timeout(30000), controller) // 30 seconds
 */
const timeout = (ms = 30000) => {
  return (req, res, next) => {
    req.setTimeout(ms, () => {
      res.status(408).json({
        success: false,
        message: 'Request timeout',
        timeout: ms,
      });
    });

    res.setTimeout(ms, () => {
      res.status(503).json({
        success: false,
        message: 'Response timeout',
        timeout: ms,
      });
    });

    next();
  };
};

/**
 * Request ID middleware
 * Adds unique ID to each request for tracking
 */
const requestId = (req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
};

/**
 * CORS preflight handler
 * Handles OPTIONS requests for CORS
 */
const corsPreflightHandler = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization',
    );
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    return res.status(204).send();
  }
  next();
};

/**
 * Response formatter middleware
 * Adds consistent formatting to all responses
 */
const formatResponse = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (data) => {
    const formatted = {
      success: res.statusCode < 400,
      timestamp: new Date().toISOString(),
      path: req.path,
      ...data,
    };

    return originalJson(formatted);
  };

  next();
};

/**
 * Security headers middleware
 * Adds basic security headers to responses
 */
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

module.exports = {
  asyncHandler,
  validate,
  logger,
  notFound,
  paginate,
  sort,
  search,
  cache,
  timeout,
  requestId,
  corsPreflightHandler,
  formatResponse,
  securityHeaders,
};
