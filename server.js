// Main server file for the Call Manager application
// Sets up Express, middleware, routes, and starts the application

import express from 'express';
import session from 'express-session';
import MySQLStore from 'express-mysql-session';
import flash from 'connect-flash';
import helmet from 'helmet';
import csrf from 'csurf';
// import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';
import logger from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { sessionConfig } from './middlewares/auth.js';
import expressLayouts from 'express-ejs-layouts';

// Import routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import employeeRoutes from './routes/employee.js';

// Import User model for database operations
import User from './models/User.js';
import { start } from 'repl';

// Create Express app
const app = express();

// Trust proxy for rate limiting - DISABLED
// app.set('trust proxy', 1);

// View engine setup
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout'); // uses views/layout.ejs by default
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// MySQL Session Store configuration
const MySQLSessionStore = MySQLStore(session);
const sessionStore = new MySQLSessionStore({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
});

// Session middleware with MySQL store
app.use(session({
  ...sessionConfig,
  store: sessionStore
}));

const csrfProtection = csrf();

// Flash messages
app.use(flash());

app.use((req, res, next) => {
  logger.log('here ----->', req.method)
  logger.log('here ----->', req.path)
  if (req.path === "/admin/callers/upload" && req.method === 'POST') {
    // ⛔ skip CSRF check for this route here
    return next();
  }
  csrfProtection(req, res, next);
});

// CSRF protection
// app.use(csrf({ cookie: false }));

// Rate limiting for authentication routes - DISABLED for testing
// const loginLimiter = rateLimit(authRateLimit);
// app.use('/auth/login', loginLimiter);
// app.use('/auth/forgot-password', loginLimiter);

// Global middleware for CSRF token
app.use((req, res, next) => {
  if (req.path === "/admin/callers/upload" && req.method === 'POST') {
    // ⛔ skip CSRF check for this route here
    return next();
  }
  const token= req.csrfToken()
  res.locals.csrfToken = token;
  console.log("csrf token in server.js", token);
  res.locals.user = req.user;
  res.locals.flash = req.flash;
  res.locals.config = config.app;
  next();
});


// Request logging middleware
app.use(logger.logRequest.bind(logger));

// Routes without versioning
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
    dbStatus: 'connected'
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
    // console.log('Starting Call Manager application...');
    // Log startup information
    logger.info('Starting Call Manager application...');
   
    
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      logger.error('Cannot start application without database connection');
      process.exit(1);
    }
    
    // Start server
    const server = app.listen(config.app.port, () => {
      console.log(`Server is running on port ${config.app.port}`);
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
        
        // Close database connections
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
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application
// if (import.meta.url === `file://${process.argv[1]}`) {
//   startApplication();
// }

startApplication();

export default app;
