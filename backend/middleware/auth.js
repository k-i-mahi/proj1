// middleware/auth.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes - Verify JWT token and authenticate user
 * Usage: router.get('/protected', protect, controller)
 */
const protect = async (req, res, next) => {
  let token;

  // Extract token from Authorization header
  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      // Get token
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database (exclude password)
      req.user = await User.findById(decoded.id).select('-password');

      // Check if user exists and is active
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
        });
      }

      if (!req.user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is inactive. Contact support.',
        });
      }

      // Store token info for logging/debugging
      req.tokenInfo = {
        id: decoded.id,
        iat: decoded.iat,
        exp: decoded.exp,
      };

      next();
    } catch (error) {
      console.error('Token verification error:', error.message);

      // Handle specific JWT errors
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please login again.',
          code: 'TOKEN_EXPIRED',
        });
      }

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.',
          code: 'TOKEN_INVALID',
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: 'No token provided',
      code: 'NO_TOKEN',
    });
  }
};

/**
 * Optional authentication - Doesn't fail if no token
 * Useful for routes that work with/without authentication
 * Usage: router.get('/public', optionalAuth, controller)
 */
const optionalAuth = async (req, res, next) => {
  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      // Set user to null if inactive
      if (req.user && !req.user.isActive) {
        req.user = null;
      }
    } catch (error) {
      // Silently fail - continue without user
      req.user = null;
    }
  }

  next();
};

/**
 * Role-based authorization
 * Usage: router.post('/admin', protect, authorize('admin'), controller)
 * Usage: router.get('/manage', protect, authorize('admin', 'authority'), controller)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}`,
        userRole: req.user.role,
      });
    }

    next();
  };
};

/**
 * Check if user is admin (shorthand)
 * Usage: router.delete('/users/:id', protect, isAdmin, deleteUser)
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }

  next();
};

/**
 * Check if user is authority or admin
 * Usage: router.put('/issues/:id/assign', protect, isAuthority, assignIssue)
 */
const isAuthority = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (!['authority', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Authority or admin access required',
    });
  }

  next();
};

/**
 * Per-user rate limiting
 * Usage: router.post('/issues', protect, rateLimit(10, 60000), createIssue)
 */
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    // Skip rate limiting if no user
    if (!req.user) {
      return next();
    }

    const userId = req.user._id.toString();
    const now = Date.now();

    // Initialize user request tracking
    if (!requests.has(userId)) {
      requests.set(userId, []);
    }

    const userRequests = requests.get(userId);

    // Filter requests within time window
    const recentRequests = userRequests.filter(
      (timestamp) => now - timestamp < windowMs,
    );

    // Check if limit exceeded
    if (recentRequests.length >= maxRequests) {
      const oldestRequest = recentRequests[0];
      const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);

      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter,
      });
    }

    // Add current request
    recentRequests.push(now);
    requests.set(userId, recentRequests);

    // Periodic cleanup (1% chance)
    if (Math.random() < 0.01) {
      for (const [key, timestamps] of requests.entries()) {
        const recent = timestamps.filter((t) => now - t < windowMs);
        if (recent.length === 0) {
          requests.delete(key);
        } else {
          requests.set(key, recent);
        }
      }
    }

    next();
  };
};

/**
 * Role-based rate limiting (different limits per role)
 * Usage: router.post('/issues', protect, rateLimitByRole(), createIssue)
 */
const rateLimitByRole = () => {
  const limits = {
    admin: { max: 1000, window: 15 * 60 * 1000 }, // 1000 per 15 min
    authority: { max: 500, window: 15 * 60 * 1000 }, // 500 per 15 min
    resident: { max: 100, window: 15 * 60 * 1000 }, // 100 per 15 min
  };

  const requests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user._id.toString();
    const userRole = req.user.role;
    const limit = limits[userRole] || limits.resident;
    const now = Date.now();

    if (!requests.has(userId)) {
      requests.set(userId, []);
    }

    const userRequests = requests.get(userId);
    const recentRequests = userRequests.filter(
      (timestamp) => now - timestamp < limit.window,
    );

    if (recentRequests.length >= limit.max) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((recentRequests[0] + limit.window - now) / 1000),
      });
    }

    recentRequests.push(now);
    requests.set(userId, recentRequests);

    // Cleanup
    if (Math.random() < 0.01) {
      for (const [key, timestamps] of requests.entries()) {
        const recent = timestamps.filter((t) => now - t < limit.window);
        if (recent.length === 0) {
          requests.delete(key);
        } else {
          requests.set(key, recent);
        }
      }
    }

    next();
  };
};

module.exports = {
  protect,
  optionalAuth,
  authorize,
  isAdmin,
  isAuthority,
  rateLimit,
  rateLimitByRole,
};
