// Main server file for the Call Manager application
// Sets up Express, middleware, routes, and starts the application

const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const helmet = require('helmet');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');
const cronManager = require('./utils/cronJobs');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { sessionConfig, authRateLimit } = require('./middlewares/auth');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const employeeRoutes = require('./routes/employee');

// Create Express app
const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session(sessionConfig));

// Flash messages
app.use(flash());

// CSRF protection
app.use(csrf({ cookie: false }));

// Rate limiting for authentication routes
const loginLimiter = rateLimit(authRateLimit);
app.use('/auth/login', loginLimiter);
app.use('/auth/forgot-password', loginLimiter);

// Global middleware for CSRF token
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.user = req.user;
  res.locals.flash = req.flash;
  res.locals.config = config.app;
  next();
});

// Request logging middleware
app.use(logger.logRequest);

// Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/employee', employeeRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    applicationName: config.app.name,
    version: config.app.version,
    environment: config.app.environment,
    timestamp: new Date().toISOString(),
    dbStatus: 'connected' // This would be checked dynamically in production
  });
});

// Root route - redirect to appropriate dashboard
app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    // User is logged in, redirect based on role
    const role = req.session.userRole;
    switch (role) {
      case 'super_admin':
        res.redirect('/admin/dashboard');
        break;
      case 'employee':
        res.redirect('/employee/dashboard');
        break;
      case 'caller':
        res.redirect('/caller/dashboard');
        break;
      default:
        res.redirect('/auth/login');
    }
  } else {
    // User is not logged in, redirect to login
    res.redirect('/auth/login');
  }
});

// Dashboard route - redirect based on role
app.get('/dashboard', (req, res) => {
  if (req.session && req.session.userId) {
    const role = req.session.userRole;
    switch (role) {
      case 'super_admin':
        res.redirect('/admin/dashboard');
        break;
      case 'employee':
        res.redirect('/employee/dashboard');
        break;
      case 'caller':
        res.redirect('/caller/dashboard');
        break;
      default:
        res.redirect('/auth/login');
    }
  } else {
    res.redirect('/auth/login');
  }
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

// Database connection test function
async function testDatabaseConnection() {
  try {
    const User = require('./models/User');
    await User.testConnection();
    logger.success('Database connection test passed');
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return false;
  }
}

// Application startup function
async function startApplication() {
  try {
    // Log startup information
    logger.logStartup();
    
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      logger.error('Cannot start application without database connection');
      process.exit(1);
    }
    
    // Initialize cron jobs
    await cronManager.init();
    logger.success('Cron jobs initialized');
    
    // Start server
    const server = app.listen(config.app.port, () => {
      logger.success(`Server started on port ${config.app.port}`);
      logger.success(`Environment: ${config.app.environment}`);
      logger.success(`Database: ${config.database.host}:${config.database.database}`);
      
      if (config.app.environment === 'development') {
        logger.info(`Development server: http://localhost:${config.app.port}`);
      }
    });
    
    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      
      // Stop accepting new connections
      server.close(() => {
        logger.info('HTTP server closed');
        
        // Stop cron jobs
        cronManager.stopAllJobs();
        logger.info('Cron jobs stopped');
        
        // Close database connections
        const User = require('./models/User');
        User.closePool();
        logger.info('Database connections closed');
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
    
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  startApplication();
}

module.exports = app;
