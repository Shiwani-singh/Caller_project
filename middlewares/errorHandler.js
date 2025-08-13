// Error handling middleware for the Call Manager application
// Catches and processes all application errors with appropriate responses

const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const config = require('../config');

// Handle Zod validation errors
const handleZodError = (error) => {
  const errors = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));

  return {
    statusCode: 400,
    message: 'Validation failed',
    errors,
    isOperational: true
  };
};

// Handle MySQL duplicate entry errors
const handleDuplicateKeyError = (error) => {
  let message = 'Duplicate entry found';
  let field = 'unknown';

  if (error.message.includes('email')) {
    message = 'A record with this email already exists';
    field = 'email';
  } else if (error.message.includes('phone')) {
    message = 'A record with this phone number already exists';
    field = 'phone';
  } else if (error.message.includes('name')) {
    message = 'A record with this name already exists';
    field = 'name';
  }

  return {
    statusCode: 409,
    message,
    field,
    isOperational: true
  };
};

// Handle MySQL foreign key constraint errors
const handleForeignKeyError = (error) => {
  let message = 'Referenced record not found';
  
  if (error.message.includes('role_id')) {
    message = 'Invalid role specified';
  } else if (error.message.includes('assigned_to')) {
    message = 'Invalid employee specified';
  }

  return {
    statusCode: 400,
    message,
    isOperational: true
  };
};

// Handle MySQL connection errors
const handleConnectionError = (error) => {
  return {
    statusCode: 503,
    message: 'Database connection failed. Please try again later.',
    isOperational: false
  };
};

// Handle Multer file upload errors
const handleMulterError = (error) => {
  let message = 'File upload failed';
  let statusCode = 400;

  if (error.code === 'LIMIT_FILE_SIZE') {
    message = 'File size exceeds the maximum allowed limit';
  } else if (error.code === 'LIMIT_FILE_COUNT') {
    message = 'Too many files uploaded';
  } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    message = 'Unexpected file field';
  }

  return {
    statusCode,
    message,
    isOperational: true
  };
};

// Handle CSRF token errors
const handleCSRFError = (error) => {
  return {
    statusCode: 403,
    message: 'CSRF token validation failed. Please refresh the page and try again.',
    isOperational: true
  };
};

// Handle rate limiting errors
const handleRateLimitError = (error) => {
  return {
    statusCode: 429,
    message: 'Too many requests. Please try again later.',
    isOperational: true
  };
};

// Main error handler middleware
const errorHandler = (error, req, res, next) => {
  let errorResponse = {
    statusCode: 500,
    message: 'Internal server error',
    isOperational: false
  };

  // Handle different types of errors
  if (error instanceof AppError) {
    errorResponse = {
      statusCode: error.statusCode,
      message: error.message,
      errorCode: error.errorCode,
      isOperational: error.isOperational
    };
  } else if (error.name === 'ZodError') {
    const zodError = handleZodError(error);
    errorResponse = { ...errorResponse, ...zodError };
  } else if (error.code === 'ER_DUP_ENTRY') {
    const duplicateError = handleDuplicateKeyError(error);
    errorResponse = { ...errorResponse, ...duplicateError };
  } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    const foreignKeyError = handleForeignKeyError(error);
    errorResponse = { ...errorResponse, ...foreignKeyError };
  } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    const connectionError = handleConnectionError(error);
    errorResponse = { ...errorResponse, ...connectionError };
  } else if (error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
    const multerError = handleMulterError(error);
    errorResponse = { ...errorResponse, ...multerError };
  } else if (error.code === 'EBADCSRFTOKEN') {
    const csrfError = handleCSRFError(error);
    errorResponse = { ...errorResponse, ...csrfError };
  } else if (error.status === 429) {
    const rateLimitError = handleRateLimitError(error);
    errorResponse = { ...errorResponse, ...rateLimitError };
  }

  // Log the error
  if (errorResponse.isOperational) {
    logger.warn('Operational error:', {
      message: errorResponse.message,
      statusCode: errorResponse.statusCode,
      url: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  } else {
    logger.error('System error:', {
      message: errorResponse.message,
      statusCode: errorResponse.statusCode,
      url: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      stack: error.stack,
      originalError: error.message
    });
  }

  // Set response status
  res.status(errorResponse.statusCode);

  // Handle different response formats
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    // API request - return JSON
    return res.json({
      error: {
        message: errorResponse.message,
        statusCode: errorResponse.statusCode,
        errorCode: errorResponse.errorCode || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString()
      }
    });
  }

  // Web request - render error page
  if (errorResponse.statusCode === 404) {
    return res.render('error', {
      title: 'Page Not Found',
      message: 'The page you are looking for could not be found.',
      error: {
        status: 404,
        stack: config.app.debug ? error.stack : 'Page not found'
      }
    });
  }

  if (errorResponse.statusCode === 403) {
    return res.render('error', {
      title: 'Access Denied',
      message: 'You do not have permission to access this resource.',
      error: {
        status: 403,
        stack: config.app.debug ? error.stack : 'Access denied'
      }
    });
  }

  // Generic error page
  return res.render('error', {
    title: 'Error',
    message: errorResponse.message,
    error: {
      status: errorResponse.statusCode,
      stack: config.app.debug ? error.stack : 'An error occurred'
    }
  });
};

// 404 handler for unmatched routes
const notFoundHandler = (req, res) => {
  logger.warn('Route not found:', {
    url: req.originalUrl,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  res.status(404);

  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.json({
      error: {
        message: 'Route not found',
        statusCode: 404,
        errorCode: 'ROUTE_NOT_FOUND',
        timestamp: new Date().toISOString()
      }
    });
  }

  res.render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for could not be found.',
    error: {
      status: 404,
      stack: 'Route not found'
    }
  });
};

// Async error wrapper for route handlers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Development error handler (shows full error details)
const developmentErrorHandler = (error, req, res, next) => {
  if (config.app.environment === 'development') {
    // In development, show full error details
    logger.error('Development error details:', {
      message: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method
    });

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(500).json({
        error: {
          message: error.message,
          stack: error.stack,
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      });
    }

    return res.status(500).render('error', {
      title: 'Error',
      message: error.message,
      error: {
        status: 500,
        stack: error.stack
      }
    });
  }

  // In production, use the standard error handler
  next(error);
};

// Production error handler (hides sensitive information)
const productionErrorHandler = (error, req, res, next) => {
  if (config.app.environment === 'production') {
    // In production, log the error but don't expose details
    logger.error('Production error:', {
      message: error.message,
      url: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Don't expose error details in production
    const safeError = {
      statusCode: error.statusCode || 500,
      message: 'Something went wrong',
      isOperational: error.isOperational || false
    };

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(safeError.statusCode).json({
        error: {
          message: safeError.message,
          statusCode: safeError.statusCode,
          timestamp: new Date().toISOString()
        }
      });
    }

    return res.status(safeError.statusCode).render('error', {
      title: 'Error',
      message: safeError.message,
      error: {
        status: safeError.statusCode,
        stack: 'An error occurred'
      }
    });
  }

  // In development, use the development error handler
  next(error);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  developmentErrorHandler,
  productionErrorHandler
};
