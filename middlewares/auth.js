// Authentication middleware for the Call Manager application
// Handles user authentication, role checking, and session management

import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

// Check if user is authenticated
const requireAuth = (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      logger.auth('Authentication required for route:', req.originalUrl);
      return res.redirect('/auth/login');
    }
    next();
  } catch (error) {
    logger.error('Error in requireAuth middleware:', error);
    next(AppError.authError('Authentication failed'));
  }
};

// Check if user is not authenticated (for login/register routes)
const requireGuest = (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      logger.auth('User already authenticated, redirecting to dashboard');
      return res.redirect('/dashboard');
    }
    next();
  } catch (error) {
    logger.error('Error in requireGuest middleware:', error);
    next(AppError.authError('Authentication check failed'));
  }
};

// Check if user has specific role
const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.session || !req.session.userId) {
        logger.auth('Role check failed: User not authenticated');
        return res.redirect('/auth/login');
      }

      // Get user from database to check current role
      const user = await User.findById(req.session.userId);
      if (!user) {
        logger.auth('Role check failed: User not found in database');
        req.session.destroy();
        return res.redirect('/auth/login');
      }

      // Check if user has required role
      const userRole = user.role_name;
      if (!roles.includes(userRole)) {
        logger.auth(`Role check failed: User ${user.email} (${userRole}) lacks required roles: ${roles.join(', ')}`);
        return res.status(403).render('error', {
          title: 'Access Denied',
          message: 'You do not have permission to access this resource.',
          error: {
            status: 403,
            stack: 'Access denied due to insufficient permissions'
          }
        });
      }

      // Add user info to request for use in routes
      req.user = user;
      next();
    } catch (error) {
      logger.error('Error in requireRole middleware:', error);
      next(AppError.authError('Role verification failed'));
    }
  };
};

// Check if user is super admin
const requireSuperAdmin = requireRole(['super_admin']);

// Check if user is employee or super admin
const requireEmployee = requireRole(['employee', 'super_admin']);

// Check if user is super admin only
const requireSuperAdminOnly = requireRole(['super_admin']);

// Check if user is employee only
const requireEmployeeOnly = requireRole(['employee']);

// Load user data for authenticated routes
const loadUser = async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user) {
        req.user = user;
      } else {
        // User not found in database, destroy session
        logger.auth('User not found in database, destroying session');
        req.session.destroy();
      }
    }
    next();
  } catch (error) {
    logger.error('Error in loadUser middleware:', error);
    next();
  }
};

// Check if user owns the resource (for employee routes)
const requireOwnership = (resourceModel, resourceIdField = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(AppError.authError('User not authenticated'));
      }

      // Super admins can access all resources
      if (req.user.role_name === 'super_admin') {
        return next();
      }

      // Employees can only access their own resources
      if (req.user.role_name === 'employee') {
        const resourceId = req.params[resourceIdField];
        if (!resourceId) {
          return next(AppError.validationError('Resource ID not provided'));
        }

        // Check if resource belongs to the user
        const resource = await resourceModel.findById(resourceId);
        if (!resource) {
          return next(AppError.notFoundError('Resource not found'));
        }

        if (resource.assigned_to !== req.user.id) {
          logger.auth(`Ownership check failed: User ${req.user.email} tried to access resource ${resourceId}`);
          return next(AppError.permissionError('You can only access your own resources'));
        }

        req.resource = resource;
        return next();
      }

      next(AppError.permissionError('Insufficient permissions'));
    } catch (error) {
      logger.error('Error in requireOwnership middleware:', error);
      next(AppError.authError('Ownership verification failed'));
    }
  };
};

// Rate limiting for authentication routes
const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
};

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  },
  name: 'callmanager.sid'
};

// Logout user
const logout = (req, res, next) => {
  try {
    if (req.session) {
      const userId = req.session.userId;
      req.session.destroy((err) => {
        if (err) {
          logger.error('Error destroying session:', err);
          return next(AppError.authError('Logout failed'));
        }
        
        logger.auth(`User logged out successfully: ID ${userId}`);
        res.clearCookie('callmanager.sid');
        res.redirect('/auth/login');
      });
    } else {
      res.redirect('/auth/login');
    }
  } catch (error) {
    logger.error('Error in logout middleware:', error);
    next(AppError.authError('Logout failed'));
  }
};

// Check if user is active
const requireActiveUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(AppError.authError('User not authenticated'));
    }

    // Check if user account is still active
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
              logger.auth('User account not found, destroying session');
        req.session.destroy();
        return res.redirect('/auth/login');
    }

    // Update user info in request
    req.user = currentUser;
    next();
  } catch (error) {
    logger.error('Error in requireActiveUser middleware:', error);
    next(AppError.authError('User verification failed'));
  }
};

// Redirect based on user role
const redirectByRole = (req, res, next) => {
  try {
    if (!req.user) {
      return res.redirect('/auth/login');
    }

    const role = req.user.role_name;
    let redirectPath = '/dashboard';

    switch (role) {
      case 'super_admin':
        redirectPath = '/admin/dashboard';
        break;
      case 'employee':
        redirectPath = '/employee/dashboard';
        break;
      default:
        redirectPath = '/dashboard';
    }

    res.redirect(redirectPath);
  } catch (error) {
    logger.error('Error in redirectByRole middleware:', error);
    next(AppError.authError('Role-based redirect failed'));
  }
};

export {
  requireAuth,
  requireGuest,
  requireRole,
  requireSuperAdmin,
  requireEmployee,
  requireSuperAdminOnly,
  requireEmployeeOnly,
  loadUser,
  requireOwnership,
  authRateLimit,
  sessionConfig,
  logout,
  requireActiveUser,
  redirectByRole
};
