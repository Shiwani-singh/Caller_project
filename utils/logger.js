// Simple logger for the Call Manager application
// Provides basic logging functionality without complex dependencies

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { createWriteStream } from 'fs';
import { fileURLToPath } from 'url';
import config from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Logging {
  constructor() {
    this.showLogs = config.logging.debug;
    this.logDirectory = path.resolve(__dirname, '../logs');
    this.ensureLogDirectoryExists();
    this.logStream = this.getLogStream();
  }

  // Ensure log directory exists
  ensureLogDirectoryExists() {
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }
  }

  // Get log stream
  getLogStream() {
    const logFilePath = path.join(this.logDirectory, 'app.log');
    return createWriteStream(logFilePath, { flags: 'a' });
  }

  // Write logs to file
  writeLog(level, message) {
    if (config.logging.fileLogging) {
      const logEntry = `[${new Date().toISOString()}] [${level}] ${typeof message === 'string' ? message : JSON.stringify(message)}\n`;
      this.logStream.write(logEntry);
    }
  }

  // Log methods with different levels
  info(...args) {
    this.writeLog('INFO', args);
    if (this.showLogs) {
      console.log(
        chalk.blue(`[${new Date().toLocaleString()}][Info]:`),
        typeof args === 'string' ? chalk.blueBright(args) : args
      );
    }
  }

  warn(...args) {
    this.writeLog('WARN', args);
    if (this.showLogs) {
      console.log(
        chalk.white.bgYellowBright(`[${new Date().toLocaleString()}][Warn]:`),
        typeof args === 'string' ? chalk.yellowBright(args) : args
      );
    }
  }

  error(...args) {
    this.writeLog('ERROR', args);
    console.log(args);
    console.log(
      chalk.white.bgRedBright(`[${new Date().toLocaleString()}][Error]:`),
      typeof args === 'string' ? chalk.redBright(args) : args
    );
  }

  log(...args) {
    this.writeLog('LOG', args);
    if (this.showLogs) {
      console.log(
        chalk.white.bgGreenBright(`[${new Date().toLocaleString()}][Log]:`),
        typeof args === 'string' ? chalk.greenBright(args) : args
      );
    }
  }

  success(...args) {
    this.writeLog('SUCCESS', args);
    if (this.showLogs) {
      console.log(
        chalk.white.bgGreenBright(`[${new Date().toLocaleString()}][Success]:`),
        typeof args === 'string' ? chalk.greenBright(args) : args
      );
    }
  }

  auth(...args) {
    this.writeLog('AUTH', args);
    if (this.showLogs) {
      console.log(
        chalk.magenta(`[${new Date().toLocaleString()}][Auth]:`),
        typeof args === 'string' ? chalk.magentaBright(args) : args
      );
    }
  }

  debug(...args) {
    if (this.showLogs) {
      this.writeLog('DEBUG', args);
      console.log(
        chalk.gray(`[${new Date().toLocaleString()}][Debug]:`),
        typeof args === 'string' ? chalk.gray(args) : args
      );
    }
  }

  // Request logging middleware
  logRequest(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
      
      this[logLevel](`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });
    
    next();
  }
}

// Export a singleton instance
export default new Logging();
