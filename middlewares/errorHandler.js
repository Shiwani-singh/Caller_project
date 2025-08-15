// Simple error handling middleware for the Call Manager application
// Inspired by wallet-api error handling approach

import logger from '../utils/logger.js';

// Simple error handler middleware
const errorHandler = (error, req, res, next) => {
  // Log the error
  logger.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
      url: req.originalUrl,
    method: req.method
  });

  // Set response status
  const statusCode = error.statusCode || 500;
  res.status(statusCode);

  // Handle different response formats
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    // API request - return JSON
    return res.json({
      success: false,
      message: error.message || 'Something went wrong',
      statusCode: statusCode
    });
  }

  // Web request - render error page
  return res.render('error', {
    title: 'Error',
    message: error.message || 'Something went wrong',
    error: {
      status: statusCode,
      stack: process.env.NODE_ENV === 'development' ? error.stack : 'An error occurred'
    }
  });
};

// 404 handler for unmatched routes
const notFoundHandler = (req, res) => {
  logger.warn('Route not found:', req.originalUrl);

  res.status(404);

  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.json({
      success: false,
        message: 'Route not found',
      statusCode: 404
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

export {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
