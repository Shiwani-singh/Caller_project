// Custom AppError class for centralized error handling
// This class extends the built-in Error class and provides additional functionality

const { getErrorByCode } = require('../config/errorCodes');

class AppError extends Error {
  constructor(message, statusCode, errorCode, isOperational = true) {
    super(message);
    
    this.statusCode = statusCode || 500;
    this.errorCode = errorCode || 'SERVER_INTERNAL_ERROR';
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
    
    // Set the prototype explicitly for proper inheritance
    Object.setPrototypeOf(this, AppError.prototype);
  }

  // Static method to create AppError from error code
  static fromCode(errorCode, customMessage = null) {
    const errorDetails = getErrorByCode(errorCode);
    const message = customMessage || errorDetails.message;
    
    return new AppError(
      message,
      errorDetails.statusCode,
      errorCode,
      true
    );
  }

  // Static method to create validation error
  static validationError(message, field = null) {
    const error = new AppError(
      message,
      400,
      'VALIDATION_FAILED',
      true
    );
    
    if (field) {
      error.field = field;
    }
    
    return error;
  }

  // Static method to create database error
  static databaseError(message, originalError = null) {
    const error = new AppError(
      message,
      500,
      'DB_QUERY_FAILED',
      false
    );
    
    if (originalError) {
      error.originalError = originalError;
    }
    
    return error;
  }

  // Static method to create authentication error
  static authError(message, errorCode = 'AUTH_UNAUTHORIZED') {
    return new AppError(
      message,
      401,
      errorCode,
      true
    );
  }

  // Static method to create permission error
  static permissionError(message = 'Insufficient permissions') {
    return new AppError(
      message,
      403,
      'AUTH_INSUFFICIENT_PERMISSIONS',
      true
    );
  }

  // Static method to create not found error
  static notFoundError(message = 'Resource not found') {
    return new AppError(
      message,
      404,
      'USER_NOT_FOUND',
      true
    );
  }

  // Static method to create conflict error
  static conflictError(message, errorCode = 'USER_EMAIL_EXISTS') {
    return new AppError(
      message,
      409,
      errorCode,
      true
    );
  }

  // Method to get error response object
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

  // Method to check if error is operational
  isOperationalError() {
    return this.isOperational;
  }

  // Method to get error details for logging
  getLogDetails() {
    return {
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      stack: this.stack,
      timestamp: this.timestamp,
      isOperational: this.isOperational
    };
  }
}

module.exports = AppError;
