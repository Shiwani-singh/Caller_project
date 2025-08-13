// Winston-based logger for the Call Manager application
// Provides color-coded logging, file logging, and uncaught error handling

const winston = require('winston');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output with colors
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let colorizedLevel;
    let colorizedMessage = message;
    
    // Color-code different log levels
    switch (level) {
      case 'error':
        colorizedLevel = chalk.red(level.toUpperCase());
        colorizedMessage = chalk.red(message);
        break;
      case 'warn':
        colorizedLevel = chalk.yellow(level.toUpperCase());
        colorizedMessage = chalk.yellow(message);
        break;
      case 'info':
        colorizedLevel = chalk.blue(level.toUpperCase());
        colorizedMessage = chalk.blue(message);
        break;
      case 'debug':
        colorizedLevel = chalk.gray(level.toUpperCase());
        colorizedMessage = chalk.gray(message);
        break;
      default:
        colorizedLevel = chalk.white(level.toUpperCase());
    }
    
    let output = `${chalk.gray(timestamp)} ${colorizedLevel}: ${colorizedMessage}`;
    
    // Add stack trace for errors in development
    if (stack && (config.app.environment === 'development' || config.app.debug)) {
      output += `\n${chalk.red(stack)}`;
    }
    
    // Add meta information if present
    if (Object.keys(meta).length > 0) {
      output += `\n${chalk.gray(JSON.stringify(meta, null, 2))}`;
    }
    
    return output;
  })
);

// File format (no colors, structured)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: fileFormat,
  transports: [
    // Always log to console
    new winston.transports.Console({
      format: consoleFormat,
      level: config.app.debug ? 'debug' : config.logging.level
    })
  ]
});

// Add file transport if enabled
if (config.logging.fileLogging) {
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'app.log'),
    format: fileFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    tailable: true
  }));
}

// Special transport for uncaught errors
const uncaughtLogger = winston.createLogger({
  level: 'error',
  format: fileFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'uncaught.log'),
      format: fileFormat
    })
  ]
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  uncaughtLogger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  uncaughtLogger.error('Unhandled Rejection:', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise,
    timestamp: new Date().toISOString()
  });
  
  console.error(chalk.red('Unhandled Rejection:'), reason);
  process.exit(1);
});

// Helper methods for common logging patterns
logger.startup = (message, ...meta) => {
  logger.info(`🚀 ${message}`, ...meta);
};

logger.success = (message, ...meta) => {
  logger.info(`✅ ${message}`, ...meta);
};

logger.warning = (message, ...meta) => {
  logger.warn(`⚠️  ${message}`, ...meta);
};

logger.error = (message, ...meta) => {
  logger.error(`❌ ${message}`, ...meta);
};

logger.debug = (message, ...meta) => {
  if (config.app.debug || config.app.environment === 'development') {
    logger.debug(`🔍 ${message}`, ...meta);
  }
};

logger.database = (message, ...meta) => {
  logger.info(`🗄️  ${message}`, ...meta);
};

logger.auth = (message, ...meta) => {
  logger.info(`🔐 ${message}`, ...meta);
};

logger.upload = (message, ...meta) => {
  logger.info(`📁 ${message}`, ...meta);
};

logger.cron = (message, ...meta) => {
  logger.info(`⏰ ${message}`, ...meta);
};

// Method to log application startup information
logger.logStartup = () => {
  logger.startup(`${config.app.name} v${config.app.version} [${config.app.environment}]`);
  logger.debug(`Debug mode: ${config.app.debug ? 'enabled' : 'disabled'}`);
  logger.debug(`File logging: ${config.logging.fileLogging ? 'enabled' : 'disabled'}`);
  logger.debug(`Log level: ${config.logging.level}`);
  
  if (config.app.environment === 'production' && config.app.debug) {
    logger.warning('Debug mode is enabled in production environment');
  }
};

// Method to log database connection status
logger.logDatabaseStatus = (status, details = {}) => {
  if (status === 'connected') {
    logger.success('Database connected', details);
  } else if (status === 'failed') {
    logger.error('Database connection failed', details);
  } else {
    logger.info(`Database status: ${status}`, details);
  }
};

// Method to log request information
logger.logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    const emoji = res.statusCode >= 400 ? '⚠️' : '📝';
    
    logger[logLevel](`${emoji} ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
};

module.exports = logger;
