// Simple BaseModel for the Call Manager application
// Provides basic MySQL connection and query execution

import mysql from 'mysql2/promise';
import config from '../config/index.js';
import logger from '../utils/logger.js';

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
        connectionLimit: config.database.connectionLimit || 10,
        waitForConnections: true,
        queueLimit: 0
      });

      // Test the connection
      await this.testConnection();
      logger.info('MySQL connection pool initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize MySQL connection pool:', error);
      throw error;
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
      throw error;
    }
  }

  // Execute a single query with parameters
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
      throw error;
    }
  }

  // Close the connection pool
  async closePool() {
    if (this.pool) {
      try {
        await this.pool.end();
        logger.info('MySQL connection pool closed successfully');
      } catch (error) {
        logger.error('Failed to close MySQL connection pool:', error);
      }
    }
  }
}

export default BaseModel;
