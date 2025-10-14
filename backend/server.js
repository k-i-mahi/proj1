const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const path = require('path');
const cors = require('cors');

// Load environment variables FIRST
dotenv.config();

// Security middleware
const {
  applySecurityMiddleware,
  configureRateLimits,
} = require('./middleware/security');

// Database connection
const { connectDB, getDBStatus } = require('./config/database');

// Initialize express app
const app = express();

// ============================================
// SECURITY & MIDDLEWARE
// ============================================

// CORS configuration - MUST BE BEFORE OTHER MIDDLEWARE
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL || 'https://civita.com']
      : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'];
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Apply all security middleware
applySecurityMiddleware(app);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Morgan logging (development only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Add request logger for debugging
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`\n🌐 ${req.method} ${req.originalUrl}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('Body:', JSON.stringify(req.body, null, 2));
    }
    next();
  });
}

// Static files
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
}

// Configure rate limiters
const { generalLimiter, authLimiter, uploadLimiter } = configureRateLimits();

// Conditional rate limiting (disabled in development)
const applyRateLimit = (limiter) => {
  return process.env.NODE_ENV === 'production'
    ? limiter
    : (req, res, next) => next();
};

// ============================================
// ROUTES
// ============================================

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = getDBStatus();
  const memoryUsage = process.memoryUsage();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus.status,
      connected: dbStatus.readyState === 1,
    },
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      unit: 'MB',
    },
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Civita API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      issues: '/api/issues',
      categories: '/api/categories',
      notifications: '/api/notifications',
      activities: '/api/activities',
      interactions: '/api/interactions',
      location: '/api/location',
      upload: '/api/upload',
    },
    documentation: process.env.API_DOCS_URL || 'https://docs.civita.com',
  });
});

// API Routes with error handling
const routeFiles = [
  { path: '/api/auth', file: './routes/auth', limiter: authLimiter, name: 'Auth' },
  { path: '/api/users', file: './routes/users', limiter: generalLimiter, name: 'Users' },
  { path: '/api/issues', file: './routes/issues', limiter: generalLimiter, name: 'Issues' },
  { path: '/api/categories', file: './routes/categories', limiter: generalLimiter, name: 'Categories' },
  { path: '/api/notifications', file: './routes/notifications', limiter: generalLimiter, name: 'Notifications' },
  { path: '/api/activities', file: './routes/activities', limiter: generalLimiter, name: 'Activities' },
  { path: '/api/interactions', file: './routes/interactions', limiter: generalLimiter, name: 'Interactions' },
  { path: '/api/location', file: './routes/location', limiter: generalLimiter, name: 'Location' },
  { path: '/api/upload', file: './routes/upload', limiter: uploadLimiter, name: 'Upload' },
];

let loadedRoutes = 0;
let failedRoutes = [];

routeFiles.forEach(({ path, file, limiter, name }) => {
  try {
    const route = require(file);
    app.use(path, applyRateLimit(limiter), route);
    loadedRoutes++;
    console.log(`✅ ${name} routes loaded`);
  } catch (error) {
    failedRoutes.push({ name, error: error.message });
    console.error(`❌ Failed to load ${name} routes:`, error.message);
  }
});

if (failedRoutes.length > 0) {
  console.warn(`⚠️  ${loadedRoutes}/${routeFiles.length} routes loaded successfully`);
  console.warn('Failed routes:', failedRoutes.map(r => r.name).join(', '));
} else {
  console.log(`✅ All ${loadedRoutes} routes loaded successfully`);
}

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler - Must be after all routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      '/api/auth',
      '/api/users',
      '/api/issues',
      '/api/categories',
      '/api/notifications',
      '/api/activities',
      '/api/interactions',
      '/api/location',
      '/api/upload',
    ],
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
    });
  }

  // Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large',
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ============================================
// SERVER INITIALIZATION
// ============================================

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start server
    const server = app.listen(PORT, HOST, () => {
      console.log(`
╔════════════════════════════════════════════════╗
║       🏙️  CIVITA SERVER STARTED                ║
╠════════════════════════════════════════════════╣
║  Port:         ${PORT}                            ║
║  Environment:  ${process.env.NODE_ENV || 'development'}                   ║
║  Database:     Connected ✓                     ║
║  Node:         ${process.version}                        ║
╠════════════════════════════════════════════════╣
║  API:          http://localhost:${PORT}/api       ║
║  Health:       http://localhost:${PORT}/health    ║
║  Uploads:      http://localhost:${PORT}/uploads   ║
╠════════════════════════════════════════════════╣
║  📝 Press Ctrl+C to stop the server            ║
╚════════════════════════════════════════════════╝
      `);

      // Log environment info
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️  Development mode - Rate limiting disabled');
        console.log('⚠️  CORS enabled for all origins');
      } else {
        console.log('🔒 Production mode - Security enabled');
      }
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);

      server.close(() => {
        console.log('✅ HTTP server closed');

        // Close database connection
        const mongoose = require('mongoose');
        mongoose.connection.close(false, () => {
          console.log('✅ MongoDB connection closed');
          process.exit(0);
        });
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// ============================================
// PROCESS ERROR HANDLERS
// ============================================

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ UNHANDLED REJECTION:', err);
  console.error('Stack:', err.stack);

  // Exit with failure
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
  console.error('Stack:', err.stack);

  // Exit with failure
  process.exit(1);
});

// Handle warnings
process.on('warning', (warning) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Warning:', warning.name);
    console.warn('   Message:', warning.message);
  }
});

// Start the server
startServer();

// Export for testing
module.exports = app;
