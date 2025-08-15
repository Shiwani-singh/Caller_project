// User model for the Call Manager application
// Handles user authentication, creation, and management

import BaseModel from './BaseModel.js';
import bcrypt from 'bcrypt';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

class User extends BaseModel {
  constructor() {
    super();
    this.tableName = 'users';
  }

  // Create a new user
  async create(userData) {
    try {
      const { name, email, phone, password, role_id } = userData;

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 12);

      const sql = `
        INSERT INTO ${this.tableName} (name, email, phone, password, role_id)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      const params = [name, email, phone, hashedPassword, role_id];
      
      const result = await this.query(sql, params);
      logger.auth(`User created successfully: ${email}`);
      
      return {
        id: result.insertId,
        name,
        email,
        phone,
        role_id,
        created_at: new Date()
      };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.message.includes('email')) {
          throw AppError.conflictError('A user with this email already exists', 'USER_EMAIL_EXISTS');
        } else if (error.message.includes('phone')) {
          throw AppError.conflictError('A user with this phone number already exists', 'USER_PHONE_EXISTS');
        }
      }
      throw error;
    }
  }

  // Find user by ID
  async findById(id) {
    try {
      const sql = `
        SELECT u.id, u.name, u.email, u.phone, u.role_id, u.created_at, u.updated_at,
               r.name as role_name
        FROM ${this.tableName} u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?
      `;
      
      const users = await this.query(sql, [id]);
      const user = users[0];
      
      if (!user) {
        throw AppError.notFoundError('User not found');
      }
      
      return user;
    } catch (error) {
      logger.error('Error finding user by ID:', { id, error: error.message });
      throw error;
    }
  }

  // Find user by email
  async findByEmail(email) {
    try {
      const sql = `
        SELECT u.id, u.name, u.email, u.phone, u.password, u.role_id, u.created_at, u.updated_at,
               r.name as role_name
        FROM ${this.tableName} u
        JOIN roles r ON u.role_id = r.id
        WHERE u.email = ?
      `;
      
      const users = await this.query(sql, [email]);
      return users[0];
    } catch (error) {
      logger.info(email);
      logger.error('Error finding user by email:', { email, error: error.message });
      throw error;
    }
  }

  // Find user by phone
  async findByPhone(phone) {
    try {
      const sql = `
        SELECT u.id, u.name, u.email, u.phone, u.password, u.role_id, u.created_at, u.updated_at,
               r.name as role_name
        FROM ${this.tableName} u
        JOIN roles r ON u.role_id = r.id
        WHERE u.phone = ?
      `;
      
      const users = await this.query(sql, [phone]);
      return users[0];
    } catch (error) {
      logger.error('Error finding user by phone:', { phone, error: error.message });
      throw error;
    }
  }

  // Verify user password
  async verifyPassword(user, password) {
    try {
      if (!user || !user.password) {
        return false;
      }
      
      return await bcrypt.compare(password, user.password);
    } catch (error) {
      logger.error('Error verifying password:', error);
      return false;
    }
  }

  // Get all users with pagination and filtering
  async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        role_id = null,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = options;

      let whereClause = '';
      let params = [];

      // Build search conditions
      if (search) {
        whereClause = 'WHERE (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
        params = [`%${search}%`, `%${search}%`, `%${search}%`];
      }

      // Add role filter
      if (role_id) {
        if (whereClause) {
          whereClause += ' AND u.role_id = ?';
        } else {
          whereClause = 'WHERE u.role_id = ?';
        }
        params.push(role_id);
      }

      // Count total records
      const countSql = `
        SELECT COUNT(*) as count
        FROM ${this.tableName} u
        ${whereClause}
      `;
      
      const countResult = await this.query(countSql, params);
      const totalCount = countResult[0].count;

      // Get paginated results
      const sql = `
        SELECT u.id, u.name, u.email, u.phone, u.role_id, u.created_at, u.updated_at,
               r.name as role_name
        FROM ${this.tableName} u
        JOIN roles r ON u.role_id = r.id
        ${whereClause}
        ORDER BY u.${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;
      
      const offset = (page - 1) * limit;
      const allParams = [...params, limit, offset];
      
      const users = await this.query(sql, allParams);

      return {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      logger.error('Error finding all users:', { options, error: error.message });
      throw error;
    }
  }

  // Update user
  async update(id, updateData) {
    try {
      const allowedFields = ['name', 'email', 'phone', 'role_id'];
      const updates = [];
      const params = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updates.push(`${key} = ?`);
          params.push(value);
        }
      }

      if (updates.length === 0) {
        throw AppError.validationError('No valid fields to update');
      }

      updates.push('updated_at = NOW()');
      params.push(id);

      const sql = `
        UPDATE ${this.tableName}
        SET ${updates.join(', ')}
        WHERE id = ?
      `;
      
      const result = await this.query(sql, params);
      
      if (result.affectedRows === 0) {
        throw AppError.notFoundError('User not found');
      }
      
      logger.auth(`User updated successfully: ID ${id}`);
      return await this.findById(id);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.message.includes('email')) {
          throw AppError.conflictError('A user with this email already exists', 'USER_EMAIL_EXISTS');
        } else if (error.message.includes('phone')) {
          throw AppError.conflictError('A user with this phone number already exists', 'USER_PHONE_EXISTS');
        }
      }
      throw error;
    }
  }

  // Delete user
  async delete(id) {
    try {
      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = await this.query(sql, [id]);
      
      if (result.affectedRows === 0) {
        throw AppError.notFoundError('User not found');
      }
      
      logger.auth(`User deleted successfully: ID ${id}`);
      return true;
    } catch (error) {
      logger.error('Error deleting user:', { id, error: error.message });
      throw error;
    }
  }

  // Get all employees (users with role_id = 2)
  async getEmployees() {
    try {
      const sql = `
        SELECT u.id, u.name, u.email, u.phone, u.created_at
        FROM ${this.tableName} u
        WHERE u.role_id = 2
        ORDER BY u.name ASC
      `;
      
      return await this.query(sql);
    } catch (error) {
      logger.error('Error getting employees:', error);
      throw error;
    }
  }

  // Get employees with caller count
  async getEmployeesWithCallerCount() {
    try {
      const sql = `
        SELECT 
          u.id, 
          u.name, 
          u.email, 
          u.phone,
          COUNT(c.id) as caller_count
        FROM ${this.tableName} u
        LEFT JOIN callers c ON u.id = c.assigned_to AND c.status = 'active'
        WHERE u.role_id = 2
        GROUP BY u.id, u.name, u.email, u.phone
        ORDER BY caller_count ASC, u.name ASC
      `;
      
      return await this.query(sql);
    } catch (error) {
      logger.error('Error getting employees with caller count:', error);
      throw error;
    }
  }

  // Check if user exists
  async exists(conditions) {
    try {
      let whereClause = '';
      let params = [];
      
      if (conditions.email) {
        whereClause = 'WHERE email = ?';
        params = [conditions.email];
      } else if (conditions.phone) {
        whereClause = 'WHERE phone = ?';
        params = [conditions.phone];
      } else if (conditions.id) {
        whereClause = 'WHERE id = ?';
        params = [conditions.id];
      }
      
      const fullSql = `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`;
      
      const result = await this.query(fullSql, params);
      return result[0].count > 0;
    } catch (error) {
      logger.error('Error checking if user exists:', { conditions, error: error.message });
      throw error;
    }
  }

  // Get user statistics
  async getStats() {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN role_id = 1 THEN 1 END) as super_admins,
          COUNT(CASE WHEN role_id = 2 THEN 1 END) as employees,
          COUNT(CASE WHEN role_id = 3 THEN 1 END) as callers
        FROM ${this.tableName}
      `;
      
      const results = await this.query(sql);
      return results[0];
    } catch (error) {
      logger.error('Error getting user statistics:', error);
      throw error;
    }
  }

  // Static methods for database connection management
  static async testConnection() {
    const userModel = new User();
    return await userModel.testConnection();
  }

  static async closePool() {
    const userModel = new User();
    return await userModel.closePool();
  }
}

// Create and export an instance
const userModel = new User();
export default userModel;
