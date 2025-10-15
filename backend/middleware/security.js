const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

/**
 * CORS Configuration
 * Controls which domains can access the API
 */
const configureCORS = () => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  return cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // 24 hours
  });
};

/**
 * Helmet Configuration
 * Sets various HTTP headers for security
 */
const configureHelmet = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://maps.googleapis.com'],
        connectSrc: ["'self'", 'https://maps.googleapis.com'],
        frameSrc: ["'self'", 'https://www.google.com'],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
};

/**
 * Rate Limiting Configuration
 * Prevents brute force attacks
 */
const configureRateLimits = () => {
  // General API rate limit
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Strict rate limit for auth routes
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    skipSuccessfulRequests: true,
    message: {
      success: false,
      message: 'Too many login attempts, please try again after 15 minutes.',
    },
  });

  // File upload rate limit
  const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 uploads per hour
    message: {
      success: false,
      message: 'Too many file uploads, please try again later.',
    },
  });

  return {
    generalLimiter,
    authLimiter,
    uploadLimiter,
  };
};

/**
 * Sanitize Data
 * Prevents NoSQL injection attacks
 */
const configureSanitization = () => {
  return mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`[Security] Sanitized key: ${key} in request`);
    },
  });
};

/**
 * HTTP Parameter Pollution Protection
 */
const configureHPP = () => {
  return hpp({
    whitelist: [
      'status',
      'priority',
      'category',
      'sort',
      'page',
      'limit',
      'tags',
    ],
  });
};

/**
 * Custom Security Headers
 */
const customSecurityHeaders = (req, res, next) => {
  // Remove powered by header
  res.removeHeader('X-Powered-By');

  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=()');

  next();
};

/**
 * Request Logger (Development Only)
 */
const requestLogger = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
};

/**
 * IP Whitelist Middleware (Optional)
 */
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next();
    }

    const clientIP = req.ip || req.connection.remoteAddress;

    if (allowedIPs.includes(clientIP)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied from your IP address',
    });
  };
};

/**
 * Apply All Security Middleware
 */
const applySecurityMiddleware = (app) => {
  // CORS
  app.use(configureCORS());

  // Helmet
  app.use(configureHelmet());

  // Data sanitization
  app.use(configureSanitization());

  // HPP protection
  app.use(configureHPP());

  // Custom headers
  app.use(customSecurityHeaders);

  // Request logger
  app.use(requestLogger);

  // Rate limiters are applied to specific routes in server.js
};

module.exports = {
  applySecurityMiddleware,
  configureCORS,
  configureHelmet,
  configureRateLimits,
  configureSanitization,
  configureHPP,
  customSecurityHeaders,
  requestLogger,
  ipWhitelist,
};
