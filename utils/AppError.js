// Simple AppError class for centralized error handling
// Based on wallet-api pattern but simplified for beginners

import logger from './logger.js';

class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'SERVER_ERROR', isOperational = true) {
    super(message);
    
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  // Log the error
  logError() {
    logger.error({
      code: this.errorCode,
      statusCode: this.statusCode,
      message: this.message,
      timestamp: this.timestamp,
      stack: this.stack
    });
  }

  // Get error response object
  getResponse() {
    return {
      error: {
        code: this.errorCode,
        message: this.message,
        timestamp: this.timestamp,
        statusCode: this.statusCode
      }
    };
  }
}

export default AppError;
