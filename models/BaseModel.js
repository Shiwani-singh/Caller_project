// Base database model for the Call Manager application
// Provides MySQL pool connection, query execution, and transaction handling

const mysql = require('mysql2/promise');
const config = require('../config');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

class BaseModel {
  constructor() {
    this.pool = null;
    this.initPool();
  }

  // Initialize MySQL connection pool
  async initPool() {
    try {
      this.pool = mysql.createPool({
        host: config.database.host,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        connectionLimit: config.database.connectionLimit,
        acquireTimeout: config.database.acquireTimeout,
        timeout: config.database.timeout,
        reconnect: config.database.reconnect,
        waitForConnections: true,
        queueLimit: 0
      });

      // Test the connection
      await this.testConnection();
      logger.database('MySQL connection pool initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize MySQL connection pool:', error);
      throw AppError.databaseError('Database connection failed', error);
    }
  }

  // Test database connection
  async testConnection() {
    try {
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      return true;
    } catch (error) {
      logger.error('Database connection test failed:', error);
      throw AppError.databaseError('Database connection test failed', error);
    }
  }

  // Execute a single query
  async query(sql, params = []) {
    try {
      if (!this.pool) {
        await this.initPool();
      }

      const [rows] = await this.pool.execute(sql, params);
      logger.debug('Query executed successfully', { sql, params, rowCount: Array.isArray(rows) ? rows.length : 1 });
      return rows;
    } catch (error) {
      logger.error('Query execution failed:', { sql, params, error: error.message });
      throw AppError.databaseError('Database query failed', error);
    }
  }

  // Execute a query and return the first row
  async queryOne(sql, params = []) {
    try {
      const rows = await this.query(sql, params);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      logger.error('QueryOne execution failed:', { sql, params, error: error.message });
      throw error;
    }
  }

  // Execute a query and return the count
  async queryCount(sql, params = []) {
    try {
      const result = await this.query(sql, params);
      return result[0]?.count || 0;
    } catch (error) {
      logger.error('QueryCount execution failed:', { sql, params, error: error.message });
      throw error;
    }
  }

  // Execute multiple queries in a transaction
  async transaction(queries) {
    let connection;
    try {
      if (!this.pool) {
        await this.initPool();
      }

      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      const results = [];
      for (const { sql, params } of queries) {
        const [rows] = await connection.execute(sql, params);
        results.push(rows);
      }

      await connection.commit();
      connection.release();

      logger.debug('Transaction completed successfully', { queryCount: queries.length });
      return results;
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
          connection.release();
        } catch (rollbackError) {
          logger.error('Transaction rollback failed:', rollbackError);
        }
      }

      logger.error('Transaction failed:', { error: error.message, queries: queries.length });
      throw AppError.databaseError('Database transaction failed', error);
    }
  }

  // Escape values to prevent SQL injection
  escape(value) {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    
    if (typeof value === 'number') {
      return value.toString();
    }
    
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }
    
    if (value instanceof Date) {
      return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
    }
    
    if (Array.isArray(value)) {
      return value.map(v => this.escape(v)).join(', ');
    }
    
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  // Build WHERE clause from object
  buildWhereClause(conditions) {
    if (!conditions || Object.keys(conditions).length === 0) {
      return { sql: '', params: [] };
    }

    const clauses = [];
    const params = [];

    for (const [key, value] of Object.entries(conditions)) {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          clauses.push(`${key} IN (${value.map(() => '?').join(', ')})`);
          params.push(...value);
        } else if (typeof value === 'object' && value.operator) {
          clauses.push(`${key} ${value.operator} ?`);
          params.push(value.value);
        } else {
          clauses.push(`${key} = ?`);
          params.push(value);
        }
      }
    }

    return {
      sql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
      params
    };
  }

  // Build ORDER BY clause
  buildOrderClause(sortBy, sortOrder = 'ASC') {
    if (!sortBy) {
      return '';
    }

    const validColumns = ['id', 'name', 'email', 'phone', 'created_at', 'updated_at', 'assigned_at', 'status'];
    const validOrders = ['ASC', 'DESC'];
    
    if (!validColumns.includes(sortBy)) {
      sortBy = 'id';
    }
    
    if (!validOrders.includes(sortOrder.toUpperCase())) {
      sortOrder = 'ASC';
    }

    return `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
  }

  // Build LIMIT clause for pagination
  buildLimitClause(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    return `LIMIT ${limit} OFFSET ${offset}`;
  }

  // Close the connection pool
  async closePool() {
    if (this.pool) {
      try {
        await this.pool.end();
        logger.database('MySQL connection pool closed successfully');
      } catch (error) {
        logger.error('Failed to close MySQL connection pool:', error);
      }
    }
  }

  // Get pool status
  getPoolStatus() {
    if (!this.pool) {
      return { status: 'not_initialized' };
    }

    return {
      status: 'active',
      connectionLimit: this.pool.config.connectionLimit,
      acquireTimeout: this.pool.config.acquireTimeout,
      timeout: this.pool.config.timeout
    };
  }
}

// Create and export a singleton instance
const baseModel = new BaseModel();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing database connections...');
  await baseModel.closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing database connections...');
  await baseModel.closePool();
  process.exit(0);
});

module.exports = baseModel;
