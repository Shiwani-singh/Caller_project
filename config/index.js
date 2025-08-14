// Configuration loader for the Call Manager application
// This file centralizes all environment variables and provides defaults

import dotenv from 'dotenv';
dotenv.config();

const config = {
  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'call_assignment',
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
  },

  // Application configuration
  app: {
    name: process.env.APP_NAME || 'Call Manager',
    version: process.env.APP_VERSION || '1.0.0',
    port: parseInt(process.env.PORT) || 3000,
    environment: process.env.NODE_ENV || 'development',
    debug: process.env.DEBUG === 'true'
  },

  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production',
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  },

  // Logging configuration
  logging: {
    fileLogging: process.env.FILE_LOGGING === 'true',
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
  },

  // Security configuration
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5 // limit each IP to 5 requests per windowMs
    }
  },

  // File upload configuration
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['text/csv'],
    maxRows: 200
  }
};

// Validate required configuration
const requiredConfigs = [
  'database.host',
  'database.user',
  'database.database',
  'session.secret'
];

for (const configPath of requiredConfigs) {
  const value = configPath.split('.').reduce((obj, key) => obj?.[key], config);
  if (!value) {
    throw new Error(`Missing required configuration: ${configPath}`);
  }
}

export default config;
