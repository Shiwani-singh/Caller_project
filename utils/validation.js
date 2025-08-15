// Zod validation schemas for the Call Manager application
// Provides consistent validation across frontend and backend

import { z } from 'zod';
import config from '../config/index.js';

// User validation schemas
export const userSchemas = {
  // Schema for creating a new user
  create: z.object({
    name: z.string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be less than 100 characters')
      .trim(),
    email: z.string()
      .email('Invalid email format')
      .min(5, 'Email must be at least 5 characters')
      .max(255, 'Email must be less than 255 characters')
      .toLowerCase()
      .trim(),
    phone: z.string()
      .min(10, 'Phone number must be at least 10 digits')
      .max(20, 'Phone number must be less than 20 digits')
      .regex(/^[\+]?[0-9\s\-\(\)]+$/, 'Invalid phone number format')
      .trim(),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password must be less than 100 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    role_id: z.number()
      .int('Role ID must be an integer')
      .min(1, 'Role ID must be at least 1')
      .max(2, 'Role ID must be at most 2')
  }),

  // Schema for updating a user
  update: z.object({
    name: z.string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be less than 100 characters')
      .trim()
      .optional(),
    email: z.string()
      .email('Invalid email format')
      .min(5, 'Email must be at least 5 characters')
      .max(255, 'Email must be less than 255 characters')
      .toLowerCase()
      .trim()
      .optional(),
    phone: z.string()
      .min(10, 'Phone number must be at least 10 digits')
      .max(20, 'Phone number must be less than 20 digits')
      .regex(/^[\+]?[0-9\s\-\(\)]+$/, 'Invalid phone number format')
      .trim()
      .optional(),
    role_id: z.number()
      .int('Role ID must be an integer')
      .min(1, 'Role ID must be at least 1')
      .max(2, 'Role ID must be at most 2')
      .optional()
  }),

  // Schema for user login
  login: z.object({
    email: z.string()
      .email('Invalid email format')
      .min(5, 'Email must be at least 5 characters')
      .max(255, 'Email must be less than 255 characters')
      .toLowerCase()
      .trim(),
    password: z.string()
      .min(1, 'Password is required')
      .max(100, 'Password must be less than 100 characters')
  })
};

// Caller validation schemas
export const callerSchemas = {
  // Schema for creating a single caller
  create: z.object({
    name: z.string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be less than 100 characters')
      .trim(),
    email: z.string()
      .email('Invalid email format')
      .min(5, 'Email must be at least 5 characters')
      .max(255, 'Email must be less than 255 characters')
      .toLowerCase()
      .trim(),
    phone: z.string()
      .min(10, 'Phone number must be at least 10 digits')
      .max(20, 'Phone number must be less than 20 digits')
      .regex(/^[\+]?[0-9\s\-\(\)]+$/, 'Invalid phone number format')
      .trim(),
    batch_id: z.string()
      .max(50, 'Batch ID must be less than 50 characters')
      .optional()
  }),

  // Schema for updating a caller
  update: z.object({
    name: z.string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be less than 100 characters')
      .trim()
      .optional(),
    email: z.string()
      .email('Invalid email format')
      .min(5, 'Email must be at least 5 characters')
      .max(255, 'Email must be less than 255 characters')
      .toLowerCase()
      .trim()
      .optional(),
    phone: z.string()
      .min(10, 'Phone number must be at least 10 digits')
      .max(20, 'Phone number must be less than 20 digits')
      .regex(/^[\+]?[0-9\s\-\(\)]+$/, 'Invalid phone number format')
      .trim()
      .optional(),
    status: z.enum(['active', 'inactive'], {
      errorMap: () => ({ message: 'Status must be either "active" or "inactive"' })
    }).optional()
  }),

  // Schema for CSV row validation
  csvRow: z.object({
    name: z.string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be less than 100 characters')
      .trim(),
    email: z.string()
      .email('Invalid email format')
      .min(5, 'Email must be at least 5 characters')
      .max(255, 'Email must be less than 255 characters')
      .toLowerCase()
      .trim(),
    phone: z.string()
      .min(10, 'Phone number must be at least 10 digits')
      .max(20, 'Phone number must be less than 20 digits')
      .regex(/^[\+]?[0-9\s\-\(\)]+$/, 'Invalid phone number format')
      .trim()
  })
};

// Assignment validation schemas
export const assignmentSchemas = {
  // Schema for manual caller assignment
  assign: z.object({
    caller_ids: z.array(z.number().int('Caller ID must be an integer').positive('Caller ID must be positive'))
      .min(1, 'At least one caller must be selected')
      .max(100, 'Maximum 100 callers can be assigned at once'),
    employee_id: z.number()
      .int('Employee ID must be an integer')
      .positive('Employee ID must be positive')
  }),

  // Schema for marking caller as called
  markCalled: z.object({
    caller_id: z.number()
      .int('Caller ID must be an integer')
      .positive('Caller ID must be positive')
  })
};

// File upload validation schemas
export const uploadSchemas = {
  // Schema for CSV upload validation - configurable file size limit
  csvUpload: z.object({
    file: z.object({
      mimetype: z.string().refine(
        (type) => type === 'text/csv',
        'Only CSV files are allowed'
      ),
      size: z.number().max(config.upload.maxFileSize, `File size must be less than ${config.upload.maxFileSize / (1024 * 1024)}MB`),
      originalname: z.string().endsWith('.csv', 'File must have .csv extension')
    })
  })
};

// Helper function to validate data against a schema
export function validateData(schema, data) {
  try {
    return {
      success: true,
      data: schema.parse(data),
      errors: null
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      return {
        success: false,
        data: null,
        errors
      };
    }
    
    return {
      success: false,
      data: null,
      errors: [{ field: 'unknown', message: 'Validation failed' }]
    };
  }
}

// Helper function to sanitize data
export function sanitizeData(data) {
  if (typeof data === 'string') {
    return data
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeData(value);
    }
    return sanitized;
  }
  
  return data;
}
