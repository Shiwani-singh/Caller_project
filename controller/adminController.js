// Admin controller for the Call Manager application
// Handles super admin functionality including user and caller management

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import User from '../models/User.js';
import Caller from '../models/Caller.js';
import { validateData, sanitizeData, callerSchemas, assignmentSchemas, uploadSchemas } from '../utils/validation.js';
import csvHandler from '../utils/csvHandler.js';
import logger from '../utils/logger.js';
import AppError from '../utils/AppError.js';
import config from '../config/index.js';

class AdminController {
  constructor() {
    // Configure multer for file uploads
    this.storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'callers-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

    this.upload = multer({
      storage: this.storage,
      limits: {
        fileSize: config.upload.maxFileSize, // Use config for file size limit
        files: 1
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
          cb(null, true);
        } else {
          cb(new Error('Only CSV files are allowed'), false);
        }
      }
    });
  }

  // Get multer upload instance
  getUpload() {
    return this.upload;
  }

  // Show admin dashboard
  async showDashboard(req, res) {
    try {
      // Get system statistics
      const userStats = await User.getStats();
      const callerStats = await Caller.getStats();
      const batchStats = await Caller.getBatchStats();

      res.render('admin/dashboard', {
        title: 'Admin Dashboard - Call Manager',
        user: req.user,
        stats: {
          users: userStats,
          callers: callerStats[0],
          batches: batchStats
        }
      });
    } catch (error) {
      logger.error('Error loading admin dashboard:', error);
      req.flash('error', 'Failed to load dashboard');
      res.redirect('/v1/dashboard');
    }
  }

  // Show user management page
  async showUsers(req, res) {
    try {
      const { page, limit, search, role_id, sortBy, sortOrder } = req.query;
      
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        search: search || '',
        role_id: role_id || null,
        sortBy: sortBy || 'created_at',
        sortOrder: sortOrder || 'DESC'
      };

      const result = await User.findAll(options);
      
      res.render('admin/users', {
        title: 'User Management - Call Manager',
        user: req.user,
        users: result.users,
        pagination: result.pagination,
        filters: options
      });
    } catch (error) {
      logger.error('Error loading users:', error);
      req.flash('error', 'Failed to load users');
      res.redirect('/v1/admin/dashboard');
    }
  }

  // Show create user form
  showCreateUser(req, res) {
    res.render('admin/users/new', {
      title: 'Create User - Call Manager',
      user: req.user
    });
  }

  // Create new user
  async createUser(req, res) {
    try {
      // Validate input
      const validation = validateData(userSchemas.create, req.body);
      if (!validation.success) {
        req.flash('error', validation.errors[0].message);
        return res.redirect('/v1/admin/users/new');
      }

      const userData = validation.data;

      // Check if user already exists
      const existingUser = await User.findByEmail(userData.email);
      if (existingUser) {
        req.flash('error', 'A user with this email already exists');
        return res.redirect('/v1/admin/users/new');
      }

      const existingPhone = await User.findByPhone(userData.phone);
      if (existingPhone) {
        req.flash('error', 'A user with this phone number already exists');
        return res.redirect('/v1/admin/users/new');
      }

      // Create user
      const newUser = await User.create(userData);
      
      logger.auth(`New user created by ${req.user.email}: ${newUser.email} (${newUser.role_id})`);
      req.flash('success', `User ${newUser.name} has been created successfully`);
      
      res.redirect('/v1/admin/users');
    } catch (error) {
      logger.error('Error creating user:', error);
      
      if (error instanceof AppError) {
        req.flash('error', error.message);
      } else {
        req.flash('error', 'Failed to create user. Please try again.');
      }
      
      res.redirect('/v1/admin/users/new');
    }
  }

  // Show edit user form
  async showEditUser(req, res) {
    try {
      const userId = req.params.id;
      const user = await User.findById(userId);
      
      if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/v1/admin/users');
      }
      
      res.render('admin/users/edit', {
        title: 'Edit User - Call Manager',
        user: req.user,
        editUser: user
      });
    } catch (error) {
      logger.error('Error loading user for edit:', error);
      req.flash('error', 'Failed to load user');
      res.redirect('/v1/admin/users');
    }
  }

  // Update user
  async updateUser(req, res) {
    try {
      const userId = req.params.id;
      const updateData = req.body;
      
      // Validate input
      const validation = validateData(userSchemas.update, updateData);
      if (!validation.success) {
        req.flash('error', validation.errors[0].message);
        return res.redirect(`/v1/admin/users/${userId}/edit`);
      }

      const userData = validation.data;

      // Check if email is being changed and if it already exists
      if (userData.email) {
        const existingUser = await User.findByEmail(userData.email);
        if (existingUser && existingUser.id !== parseInt(userId)) {
          req.flash('error', 'A user with this email already exists');
          return res.redirect(`/v1/admin/users/${userId}/edit`);
        }
      }

      // Check if phone is being changed and if it already exists
      if (userData.phone) {
        const existingUser = await User.findByPhone(userData.phone);
        if (existingUser && existingUser.id !== parseInt(userId)) {
          req.flash('error', 'A user with this phone number already exists');
          return res.redirect(`/v1/admin/users/${userId}/edit`);
        }
      }

      // Update user
      const updatedUser = await User.update(userId, userData);
      
      logger.auth(`User updated by ${req.user.email}: ${updatedUser.email}`);
      req.flash('success', 'User updated successfully');
      
      res.redirect('/v1/admin/users');
    } catch (error) {
      logger.error('Error updating user:', error);
      
      if (error instanceof AppError) {
        req.flash('error', error.message);
      } else {
        req.flash('error', 'Failed to update user. Please try again.');
      }
      
      res.redirect(`/v1/admin/users/${req.params.id}/edit`);
    }
  }

  // Delete user
  async deleteUser(req, res) {
    try {
      const userId = req.params.id;
      await User.delete(userId);
      
      logger.auth(`User deleted by ${req.user.email}: ID ${userId}`);
      req.flash('success', 'User deleted successfully');
      
      res.redirect('/v1/admin/users');
    } catch (error) {
      logger.error('Error deleting user:', error);
      req.flash('error', 'Failed to delete user');
      res.redirect('/v1/admin/users');
    }
  }

  // Show caller management page
  async showCallers(req, res) {
    try {
      const { page, limit, search, status, assigned_to, batch_id, sortBy, sortOrder } = req.query;
      
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        search: search || '',
        status: status || null,
        assigned_to: assigned_to || null,
        batch_id: batch_id || null,
        sortBy: sortBy || 'created_at',
        sortOrder: sortOrder || 'DESC'
      };

      const result = await Caller.findAll(options);
      
      res.render('admin/callers', {
        title: 'Caller Management - Call Manager',
        user: req.user,
        callers: result.callers,
        pagination: result.pagination,
        filters: options
      });
    } catch (error) {
      logger.error('Error loading callers:', error);
      req.flash('error', 'Failed to load callers');
      res.redirect('/v1/admin/dashboard');
    }
  }

  // Show create caller form
  showCreateCaller(req, res) {
    res.render('admin/callers/new', {
      title: 'Create Caller - Call Manager',
      user: req.user
    });
  }

  // Create new caller
  async createCaller(req, res) {
    try {
      // Validate input
      const validation = validateData(callerSchemas.create, req.body);
      if (!validation.success) {
        req.flash('error', validation.errors[0].message);
        return res.redirect('/v1/admin/callers/new');
      }

      const callerData = validation.data;

      // Check if caller already exists
      const existingCaller = await Caller.findByEmail(callerData.email);
      if (existingCaller) {
        req.flash('error', 'A caller with this email already exists');
        return res.redirect('/v1/admin/callers/new');
      }

      const existingPhone = await Caller.exists({ phone: callerData.phone });
      if (existingPhone) {
        req.flash('error', 'A caller with this phone number already exists');
        return res.redirect('/v1/admin/callers/new');
      }

      // Create caller
      const newCaller = await Caller.create(callerData);
      
      logger.upload(`New caller created by ${req.user.email}: ${newCaller.email}`);
      req.flash('success', `Caller ${newCaller.name} has been created successfully`);
      
      res.redirect('/v1/admin/callers');
    } catch (error) {
      logger.error('Error creating caller:', error);
      
      if (error instanceof AppError) {
        req.flash('error', error.message);
      } else {
        req.flash('error', 'Failed to create caller. Please try again.');
      }
      
      res.redirect('/v1/admin/callers/new');
    }
  }

  // Show CSV upload form
  showUploadCallers(req, res) {
    res.render('admin/callers/upload', {
      title: 'Bulk Upload Callers - Call Manager',
      user: req.user
    });
  }

  // Handle CSV upload
  async handleCSVUpload(req, res) {
    try {
      if (!req.file) {
        req.flash('error', 'Please select a CSV file to upload');
        return res.redirect('/v1/admin/callers/upload');
      }

      // Validate file using CSV handler
      const fileValidation = csvHandler.validateCSVFile(req.file);
      if (!fileValidation.success) {
        req.flash('error', fileValidation.errors[0].message);
        csvHandler.cleanupTempFile(req.file.path);
        return res.redirect('/v1/admin/callers/upload');
      }

      // Process CSV file
      const result = await csvHandler.processCSVUpload(req.file);
      
      if (!result.success) {
        req.flash('error', `CSV processing failed: ${result.errors.length} errors found`);
        return res.redirect('/v1/admin/callers/upload');
      }

      // Create callers from valid data
      const createdCallers = [];
      for (const callerData of result.data) {
        try {
          const newCaller = await Caller.create(callerData);
          createdCallers.push(newCaller);
        } catch (error) {
          logger.error('Error creating caller from CSV:', { callerData, error: error.message });
        }
      }

      req.flash('success', `Successfully created ${createdCallers.length} callers from CSV`);
      res.redirect('/v1/admin/callers');
    } catch (error) {
      logger.error('Error processing CSV upload:', error);
      
      if (req.file) {
        csvHandler.cleanupTempFile(req.file.path);
      }
      
      req.flash('error', 'Failed to process CSV file. Please try again.');
      res.redirect('/v1/admin/callers/upload');
    }
  }

  // Download CSV template
  downloadCSVTemplate(req, res) {
    try {
      csvHandler.downloadTemplate(res);
    } catch (error) {
      logger.error('Error generating CSV template:', error);
      req.flash('error', 'Failed to generate template');
      res.redirect('/v1/admin/callers/upload');
    }
  }

  // Assign callers to employees
  async assignCallers(req, res) {
    try {
      // Validate input
      const validation = validateData(assignmentSchemas.assign, req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: validation.errors[0].message
        });
      }

      const { caller_ids, employee_id } = validation.data;

      // Assign callers
      const results = [];
      for (const callerId of caller_ids) {
        try {
          const result = await Caller.assignToEmployee(callerId, employee_id, req.user.id, 'manual');
          results.push({ callerId, success: true, data: result });
        } catch (error) {
          results.push({ callerId, success: false, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      logger.upload(`Caller assignment by ${req.user.email}: ${successCount} successful, ${failureCount} failed`);

      res.json({
        success: true,
        message: `Assignment complete: ${successCount} successful, ${failureCount} failed`,
        results
      });
    } catch (error) {
      logger.error('Error assigning callers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign callers'
      });
    }
  }

  // Show system administration page
  async showSystem(req, res) {
    try {
      // Get system information
      const systemInfo = {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        environment: config.app.environment,
        database: {
          host: config.database.host,
          database: config.database.database
        }
      };

      res.render('admin/system', {
        title: 'System Administration - Call Manager',
        user: req.user,
        systemInfo
      });
    } catch (error) {
      logger.error('Error loading system page:', error);
      req.flash('error', 'Failed to load system information');
      res.redirect('/v1/admin/dashboard');
    }
  }

  // Show reports page
  async showReports(req, res) {
    try {
      // Get report data
      const userStats = await User.getStats();
      const callerStats = await Caller.getStats();
      const batchStats = await Caller.getBatchStats();

      res.render('admin/reports', {
        title: 'Reports & Analytics - Call Manager',
        user: req.user,
        stats: {
          users: userStats,
          callers: callerStats,
          batches: batchStats
        }
      });
    } catch (error) {
      logger.error('Error loading reports:', error);
      req.flash('error', 'Failed to load reports');
      res.redirect('/v1/admin/dashboard');
    }
  }
}

export default new AdminController();


