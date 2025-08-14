// Caller model for the Call Manager application
// Handles caller creation, assignment, and management

import BaseModel from './BaseModel.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

class Caller extends BaseModel {
  constructor() {
    super();
    this.tableName = 'callers';
  }

  // Create a new caller
  async create(callerData) {
    try {
      const { name, email, phone, batch_id = null } = callerData;

      const sql = `
        INSERT INTO ${this.tableName} (name, email, phone, batch_id)
        VALUES (?, ?, ?, ?)
      `;
      
      const params = [name, email, phone, batch_id];
      
      const result = await this.query(sql, params);
      logger.upload(`Caller created successfully: ${email}`);
      
      return {
        id: result.insertId,
        name,
        email,
        phone,
        batch_id,
        status: 'active',
        created_at: new Date()
      };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.message.includes('email')) {
          throw AppError.conflictError('A caller with this email already exists', 'CALLER_EMAIL_EXISTS');
        } else if (error.message.includes('phone')) {
          throw AppError.conflictError('A caller with this phone number already exists', 'CALLER_PHONE_EXISTS');
        }
      }
      throw error;
    }
  }

  // Create multiple callers in a batch
  async createBatch(callers, batch_id) {
    try {
      if (!Array.isArray(callers) || callers.length === 0) {
        throw AppError.validationError('No callers provided for batch creation');
      }

      const queries = callers.map(caller => ({
        sql: `
          INSERT INTO ${this.tableName} (name, email, phone, batch_id)
          VALUES (?, ?, ?, ?)
        `,
        params: [caller.name, caller.email, caller.phone, batch_id]
      }));

      const results = await this.transaction(queries);
      logger.upload(`Batch created successfully: ${callers.length} callers in batch ${batch_id}`);
      
      return results.map((result, index) => ({
        id: result.insertId,
        name: callers[index].name,
        email: callers[index].email,
        phone: callers[index].phone,
        batch_id,
        status: 'active',
        created_at: new Date()
      }));
    } catch (error) {
      logger.error('Error creating caller batch:', { batch_id, callerCount: callers.length, error: error.message });
      throw error;
    }
  }

  // Find caller by ID
  async findById(id) {
    try {
      const sql = `
        SELECT c.id, c.name, c.email, c.phone, c.assigned_to, c.assigned_at, 
               c.created_at, c.updated_at, c.status, c.batch_id,
               u.name as assigned_employee_name
        FROM ${this.tableName} c
        LEFT JOIN users u ON c.assigned_to = u.id
        WHERE c.id = ?
      `;
      
      const caller = await this.queryOne(sql, [id]);
      
      if (!caller) {
        throw AppError.notFoundError('Caller not found');
      }
      
      return caller;
    } catch (error) {
      logger.error('Error finding caller by ID:', { id, error: error.message });
      throw error;
    }
  }

  // Get all callers with pagination and filtering
  async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        status = null,
        assigned_to = null,
        batch_id = null,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = options;

      let whereClause = '';
      let params = [];

      // Build search conditions
      if (search) {
        whereClause = 'WHERE (c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)';
        params = [`%${search}%`, `%${search}%`, `%${search}%`];
      }

      // Add status filter
      if (status) {
        if (whereClause) {
          whereClause += ' AND c.status = ?';
        } else {
          whereClause = 'WHERE c.status = ?';
        }
        params.push(status);
      }

      // Add assignment filter
      if (assigned_to !== null) {
        if (assigned_to === 'unassigned') {
          if (whereClause) {
            whereClause += ' AND c.assigned_to IS NULL';
          } else {
            whereClause = 'WHERE c.assigned_to IS NULL';
          }
        } else {
          if (whereClause) {
            whereClause += ' AND c.assigned_to = ?';
          } else {
            whereClause = 'WHERE c.assigned_to = ?';
          }
          params.push(assigned_to);
        }
      }

      // Add batch filter
      if (batch_id) {
        if (whereClause) {
          whereClause += ' AND c.batch_id = ?';
        } else {
          whereClause = 'WHERE c.batch_id = ?';
        }
        params.push(batch_id);
      }

      // Count total records
      const countSql = `
        SELECT COUNT(*) as count
        FROM ${this.tableName} c
        ${whereClause}
      `;
      
      const totalCount = await this.queryCount(countSql, params);

      // Get paginated results
      const sql = `
        SELECT c.id, c.name, c.email, c.phone, c.assigned_to, c.assigned_at, 
               c.created_at, c.updated_at, c.status, c.batch_id,
               u.name as assigned_employee_name
        FROM ${this.tableName} c
        LEFT JOIN users u ON c.assigned_to = u.id
        ${whereClause}
        ORDER BY c.${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;
      
      const offset = (page - 1) * limit;
      const allParams = [...params, limit, offset];
      
      const callers = await this.query(sql, allParams);

      return {
        callers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      logger.error('Error finding all callers:', { options, error: error.message });
      throw error;
    }
  }

  // Get callers assigned to a specific employee
  async getAssignedToEmployee(employeeId) {
    try {
      const sql = `
        SELECT c.id, c.name, c.email, c.phone, c.assigned_at, 
               c.created_at, c.status, c.batch_id
        FROM ${this.tableName} c
        WHERE c.assigned_to = ? AND c.status = 'active'
        ORDER BY c.assigned_at ASC
      `;
      
      return await this.query(sql, [employeeId]);
    } catch (error) {
      logger.error('Error getting callers assigned to employee:', { employeeId, error: error.message });
      throw error;
    }
  }

  // Get unassigned callers
  async getUnassignedCallers(limit = 100) {
    try {
      const sql = `
        SELECT c.id, c.name, c.email, c.phone, c.created_at, c.batch_id
        FROM ${this.tableName} c
        WHERE c.assigned_to IS NULL AND c.status = 'active'
        ORDER BY c.created_at ASC
        LIMIT ?
      `;
      
      return await this.query(sql, [limit]);
    } catch (error) {
      logger.error('Error getting unassigned callers:', { limit, error: error.message });
      throw error;
    }
  }

  // Assign caller to employee
  async assignToEmployee(callerId, employeeId, assignedBy, method = 'manual') {
    try {
      // Check if caller exists and is not already assigned
      const caller = await this.findById(callerId);
      if (caller.assigned_to) {
        throw AppError.conflictError('This caller is already assigned to an employee', 'CALLER_ALREADY_ASSIGNED');
      }

      // Update caller assignment
      const updateSql = `
        UPDATE ${this.tableName}
        SET assigned_to = ?, assigned_at = NOW()
        WHERE id = ?
      `;
      
      await this.query(updateSql, [employeeId, callerId]);

      // Log the assignment
      const logSql = `
        INSERT INTO caller_assignment_log (caller_id, employee_id, assigned_by, method)
        VALUES (?, ?, ?, ?)
      `;
      
      await this.query(logSql, [callerId, employeeId, assignedBy, method]);

      logger.cron(`Caller ${callerId} assigned to employee ${employeeId} via ${method}`);
      
      return await this.findById(callerId);
    } catch (error) {
      logger.error('Error assigning caller to employee:', { callerId, employeeId, error: error.message });
      throw error;
    }
  }

  // Mark caller as called (remove assignment)
  async markAsCalled(callerId) {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET assigned_to = NULL, assigned_at = NULL, status = 'inactive'
        WHERE id = ?
      `;
      
      const result = await this.query(sql, [callerId]);
      
      if (result.affectedRows === 0) {
        throw AppError.notFoundError('Caller not found');
      }
      
      logger.upload(`Caller ${callerId} marked as called`);
      return true;
    } catch (error) {
      logger.error('Error marking caller as called:', { callerId, error: error.message });
      throw error;
    }
  }

  // Update caller
  async update(id, updateData) {
    try {
      const allowedFields = ['name', 'email', 'phone', 'status'];
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
        throw AppError.notFoundError('Caller not found');
      }
      
      logger.upload(`Caller updated successfully: ID ${id}`);
      return await this.findById(id);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.message.includes('email')) {
          throw AppError.conflictError('A caller with this email already exists', 'CALLER_EMAIL_EXISTS');
        } else if (error.message.includes('phone')) {
          throw AppError.conflictError('A caller with this phone number already exists', 'CALLER_PHONE_EXISTS');
        }
      }
      throw error;
    }
  }

  // Delete caller
  async delete(id) {
    try {
      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = await this.query(sql, [id]);
      
      if (result.affectedRows === 0) {
        throw AppError.notFoundError('Caller not found');
      }
      
      logger.upload(`Caller deleted successfully: ID ${id}`);
      return true;
    } catch (error) {
      logger.error('Error deleting caller:', { id, error: error.message });
      throw error;
    }
  }

  // Get caller statistics
  async getStats() {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_callers,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_callers,
          COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_callers,
          COUNT(CASE WHEN assigned_to IS NOT NULL THEN 1 END) as assigned_callers,
          COUNT(CASE WHEN assigned_to IS NULL AND status = 'active' THEN 1 END) as unassigned_callers
        FROM ${this.tableName}
      `;
      
      return await this.queryOne(sql);
    } catch (error) {
      logger.error('Error getting caller statistics:', error);
      throw error;
    }
  }

  // Get batch statistics
  async getBatchStats() {
    try {
      const sql = `
        SELECT 
          batch_id,
          COUNT(*) as total_callers,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_callers,
          COUNT(CASE WHEN assigned_to IS NOT NULL THEN 1 END) as assigned_callers,
          MIN(created_at) as batch_start,
          MAX(created_at) as batch_end
        FROM ${this.tableName}
        WHERE batch_id IS NOT NULL
        GROUP BY batch_id
        ORDER BY batch_start DESC
      `;
      
      return await this.query(sql);
    } catch (error) {
      logger.error('Error getting batch statistics:', error);
      throw error;
    }
  }

  // Check if caller exists
  async exists(conditions) {
    try {
      const { sql, params } = this.buildWhereClause(conditions);
      const fullSql = `SELECT COUNT(*) as count FROM ${this.tableName} ${sql}`;
      
      const result = await this.queryCount(fullSql, params);
      return result > 0;
    } catch (error) {
      logger.error('Error checking if caller exists:', { conditions, error: error.message });
      throw error;
    }
  }

  // Generate unique batch ID
  generateBatchId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `BATCH_${timestamp}_${random}`;
  }
}

// Create and export an instance
const callerModel = new Caller();
export default callerModel;
