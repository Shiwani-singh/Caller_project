// Error codes configuration for the Call Manager application
// This file maps error codes to default messages for consistent error handling

const errorCodes = {
  // Authentication errors (1000-1099)
  AUTH_INVALID_CREDENTIALS: {
    code: 1000,
    message: 'Invalid email or password',
    statusCode: 401
  },
  AUTH_UNAUTHORIZED: {
    code: 1001,
    message: 'You are not authorized to access this resource',
    statusCode: 401
  },
  AUTH_SESSION_EXPIRED: {
    code: 1002,
    message: 'Your session has expired. Please log in again',
    statusCode: 401
  },
  AUTH_INSUFFICIENT_PERMISSIONS: {
    code: 1003,
    message: 'You do not have sufficient permissions for this action',
    statusCode: 403
  },

  // User management errors (1100-1199)
  USER_NOT_FOUND: {
    code: 1100,
    message: 'User not found',
    statusCode: 404
  },
  USER_EMAIL_EXISTS: {
    code: 1101,
    message: 'A user with this email already exists',
    statusCode: 409
  },
  USER_PHONE_EXISTS: {
    code: 1102,
    message: 'A user with this phone number already exists',
    statusCode: 409
  },
  USER_INVALID_ROLE: {
    code: 1103,
    message: 'Invalid user role specified',
    statusCode: 400
  },

  // Caller management errors (1200-1299)
  CALLER_NOT_FOUND: {
    code: 1200,
    message: 'Caller not found',
    statusCode: 404
  },
  CALLER_EMAIL_EXISTS: {
    code: 1201,
    message: 'A caller with this email already exists',
    statusCode: 409
  },
  CALLER_PHONE_EXISTS: {
    code: 1202,
    message: 'A caller with this phone number already exists',
    statusCode: 409
  },
  CALLER_ALREADY_ASSIGNED: {
    code: 1203,
    message: 'This caller is already assigned to an employee',
    statusCode: 409
  },
  CALLER_INVALID_STATUS: {
    code: 1204,
    message: 'Invalid caller status specified',
    statusCode: 400
  },

  // File upload errors (1300-1399)
  UPLOAD_INVALID_FILE_TYPE: {
    code: 1300,
    message: 'Invalid file type. Only CSV files are allowed',
    statusCode: 400
  },
  UPLOAD_FILE_TOO_LARGE: {
    code: 1301,
    message: 'File size exceeds the maximum allowed limit',
    statusCode: 400
  },
  UPLOAD_TOO_MANY_ROWS: {
    code: 1302,
    message: 'CSV file contains too many rows. Maximum allowed is 200',
    statusCode: 400
  },
  UPLOAD_INVALID_CSV_FORMAT: {
    code: 1303,
    message: 'Invalid CSV format. Please check the file structure',
    statusCode: 400
  },
  UPLOAD_DUPLICATE_DATA: {
    code: 1304,
    message: 'CSV contains duplicate data that conflicts with existing records',
    statusCode: 409
  },

  // Validation errors (1400-1499)
  VALIDATION_FAILED: {
    code: 1400,
    message: 'Validation failed. Please check your input',
    statusCode: 400
  },
  VALIDATION_REQUIRED_FIELD: {
    code: 1401,
    message: 'Required field is missing',
    statusCode: 400
  },
  VALIDATION_INVALID_EMAIL: {
    code: 1402,
    message: 'Invalid email format',
    statusCode: 400
  },
  VALIDATION_INVALID_PHONE: {
    code: 1403,
    message: 'Invalid phone number format',
    statusCode: 400
  },

  // Database errors (1500-1599)
  DB_CONNECTION_FAILED: {
    code: 1500,
    message: 'Database connection failed',
    statusCode: 500
  },
  DB_QUERY_FAILED: {
    code: 1501,
    message: 'Database query failed',
    statusCode: 500
  },
  DB_TRANSACTION_FAILED: {
    code: 1502,
    message: 'Database transaction failed',
    statusCode: 500
  },

  // Server errors (1600-1699)
  SERVER_INTERNAL_ERROR: {
    code: 1600,
    message: 'Internal server error',
    statusCode: 500
  },
  SERVER_MAINTENANCE: {
    code: 1601,
    message: 'Server is under maintenance. Please try again later',
    statusCode: 503
  },

  // Rate limiting errors (1700-1799)
  RATE_LIMIT_EXCEEDED: {
    code: 1700,
    message: 'Too many requests. Please try again later',
    statusCode: 429
  }
};

// Helper function to get error details by code
function getErrorByCode(code) {
  return errorCodes[code] || {
    code: 9999,
    message: 'Unknown error occurred',
    statusCode: 500
  };
}

// Helper function to get all error codes
function getAllErrorCodes() {
  return errorCodes;
}

export {
  errorCodes,
  getErrorByCode,
  getAllErrorCodes
};
