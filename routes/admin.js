// Admin routes for the Call Manager application
// Handles super admin functionality including user and caller management

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Caller = require('../models/Caller');
const { validateData, sanitizeData } = require('../utils/validation');
const { callerSchemas, assignmentSchemas, filterSchemas } = require('../utils/validation');
const { requireSuperAdmin, requireAuth } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');
const csvHandler = require('../utils/csvHandler');
const cronManager = require('../utils/cronJobs');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
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

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
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

// Apply authentication middleware to all admin routes
router.use(requireAuth, requireSuperAdmin);

// GET /admin/dashboard - Super admin dashboard
router.get('/dashboard', asyncHandler(async (req, res) => {
  try {
    // Get system statistics
    const userStats = await User.getStats();
    const callerStats = await Caller.getStats();
    const batchStats = await Caller.getBatchStats();
    const cronStats = await cronManager.getStats();

    res.render('admin/dashboard', {
      title: 'Admin Dashboard - Call Manager',
      user: req.user,
      stats: {
        users: userStats,
        callers: callerStats,
        batches: batchStats,
        cron: cronStats
      }
    });
  } catch (error) {
    logger.error('Error loading admin dashboard:', error);
    req.flash('error', 'Failed to load dashboard');
    res.redirect('/dashboard');
  }
}));

// GET /admin/users - User management page
router.get('/users', asyncHandler(async (req, res) => {
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
    res.redirect('/admin/dashboard');
  }
}));

// GET /admin/users/new - Show create user form
router.get('/users/new', (req, res) => {
  res.render('admin/users/new', {
    title: 'Create New User - Call Manager',
    user: req.user
  });
});

// POST /admin/users - Create new user
router.post('/users', asyncHandler(async (req, res) => {
  try {
    // Validate input
    const validation = validateData(callerSchemas.create, req.body);
    if (!validation.success) {
      req.flash('error', validation.errors[0].message);
      return res.redirect('/admin/users/new');
    }

    const userData = validation.data;

    // Check if user already exists
    const existingUser = await User.findByEmail(userData.email);
    if (existingUser) {
      req.flash('error', 'A user with this email already exists');
      return res.redirect('/admin/users/new');
    }

    const existingPhone = await User.findByPhone(userData.phone);
    if (existingPhone) {
      req.flash('error', 'A user with this phone number already exists');
      return res.redirect('/admin/users/new');
    }

    // Create user
    const newUser = await User.create(userData);
    
    logger.auth(`New user created by admin ${req.user.email}: ${newUser.email}`);
    req.flash('success', `User ${newUser.name} has been created successfully`);
    
    res.redirect('/admin/users');
  } catch (error) {
    logger.error('Error creating user:', error);
    
    if (error instanceof AppError) {
      req.flash('error', error.message);
    } else {
      req.flash('error', 'Failed to create user. Please try again.');
    }
    
    res.redirect('/admin/users/new');
  }
}));

// GET /admin/users/:id/edit - Show edit user form
router.get('/users/:id/edit', asyncHandler(async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/admin/users');
    }
    
    res.render('admin/users/edit', {
      title: 'Edit User - Call Manager',
      user: req.user,
      editUser: user
    });
  } catch (error) {
    logger.error('Error loading user for edit:', error);
    req.flash('error', 'Failed to load user');
    res.redirect('/admin/users');
  }
}));

// PUT /admin/users/:id - Update user
router.put('/users/:id', asyncHandler(async (req, res) => {
  try {
    const userId = req.params.id;
    const updateData = req.body;
    
    // Validate input
    const validation = validateData(callerSchemas.update, updateData);
    if (!validation.success) {
      req.flash('error', validation.errors[0].message);
      return res.redirect(`/admin/users/${userId}/edit`);
    }

    // Update user
    await User.update(userId, validation.data);
    
    logger.auth(`User updated by admin ${req.user.email}: ID ${userId}`);
    req.flash('success', 'User updated successfully');
    
    res.redirect('/admin/users');
  } catch (error) {
    logger.error('Error updating user:', error);
    
    if (error instanceof AppError) {
      req.flash('error', error.message);
    } else {
      req.flash('error', 'Failed to update user. Please try again.');
    }
    
    res.redirect(`/admin/users/${req.params.id}/edit`);
  }
}));

// DELETE /admin/users/:id - Delete user
router.delete('/users/:id', asyncHandler(async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Don't allow admin to delete themselves
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }
    
    await User.delete(userId);
    
    logger.auth(`User deleted by admin ${req.user.email}: ID ${userId}`);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
}));

// GET /admin/callers - Caller management page
router.get('/callers', asyncHandler(async (req, res) => {
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
    const employees = await User.getEmployees();
    const batchStats = await Caller.getBatchStats();
    
    res.render('admin/callers', {
      title: 'Caller Management - Call Manager',
      user: req.user,
      callers: result.callers,
      pagination: result.pagination,
      filters: options,
      employees,
      batchStats
    });
  } catch (error) {
    logger.error('Error loading callers:', error);
    req.flash('error', 'Failed to load callers');
    res.redirect('/admin/dashboard');
  }
}));

// GET /admin/callers/new - Show create caller form
router.get('/callers/new', (req, res) => {
  res.render('admin/callers/new', {
    title: 'Add New Caller - Call Manager',
    user: req.user
  });
});

// POST /admin/callers - Create new caller
router.post('/callers', asyncHandler(async (req, res) => {
  try {
    // Validate input
    const validation = validateData(callerSchemas.create, req.body);
    if (!validation.success) {
      req.flash('error', validation.errors[0].message);
      return res.redirect('/admin/callers/new');
    }

    const callerData = validation.data;

    // Check if caller already exists
    const existingCaller = await Caller.exists({ email: callerData.email });
    if (existingCaller) {
      req.flash('error', 'A caller with this email already exists');
      return res.redirect('/admin/callers/new');
    }

    const existingPhone = await Caller.exists({ phone: callerData.phone });
    if (existingPhone) {
      req.flash('error', 'A caller with this phone number already exists');
      return res.redirect('/admin/callers/new');
    }

    // Create caller
    const newCaller = await Caller.create(callerData);
    
    logger.upload(`New caller created by admin ${req.user.email}: ${newCaller.email}`);
    req.flash('success', `Caller ${newCaller.name} has been created successfully`);
    
    res.redirect('/admin/callers');
  } catch (error) {
    logger.error('Error creating caller:', error);
    
    if (error instanceof AppError) {
      req.flash('error', error.message);
    } else {
      req.flash('error', 'Failed to create caller. Please try again.');
    }
    
    res.redirect('/admin/callers/new');
  }
}));

// GET /admin/callers/upload - Show CSV upload form
router.get('/callers/upload', (req, res) => {
  res.render('admin/callers/upload', {
    title: 'Bulk Upload Callers - Call Manager',
    user: req.user
  });
});

// POST /admin/callers/upload - Handle CSV upload
router.post('/callers/upload', upload.single('csvFile'), asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      req.flash('error', 'Please select a CSV file to upload');
      return res.redirect('/admin/callers/upload');
    }

    // Validate file
    const fileValidation = await csvHandler.validateCSVFile(req.file);
    if (!fileValidation.success) {
      req.flash('error', fileValidation.errors[0].message);
      return res.redirect('/admin/callers/upload');
    }

    // Process CSV file
    const result = await csvHandler.processCSV(req.file.path);
    
    if (result.success) {
      // All rows are valid, create callers
      const batchId = Caller.generateBatchId();
      const createdCallers = await Caller.createBatch(result.validRows, batchId);
      
      logger.upload(`Bulk upload completed by admin ${req.user.email}: ${createdCallers.length} callers created in batch ${batchId}`);
      req.flash('success', `Upload complete — ${createdCallers.length} callers added successfully`);
    } else {
      // Some rows have errors
      if (result.validRows.length > 0) {
        // Create valid callers
        const batchId = Caller.generateBatchId();
        const createdCallers = await Caller.createBatch(result.validRows, batchId);
        
        logger.upload(`Bulk upload partially completed by admin ${req.user.email}: ${createdCallers.length} valid callers created, ${result.invalidRows.length} errors`);
        req.flash('warning', `Upload complete — ${createdCallers.length} callers added, ${result.invalidRows.length} rows failed`);
      } else {
        req.flash('error', `Upload failed — ${result.invalidRows.length} rows have errors`);
      }
    }

    // Clean up uploaded file
    csvHandler.cleanupTempFile(req.file.path);
    
    res.redirect('/admin/callers');
  } catch (error) {
    logger.error('Error processing CSV upload:', error);
    
    // Clean up uploaded file
    if (req.file) {
      csvHandler.cleanupTempFile(req.file.path);
    }
    
    req.flash('error', 'Failed to process CSV file. Please try again.');
    res.redirect('/admin/callers/upload');
  }
}));

// GET /admin/callers/download-template - Download CSV template
router.get('/callers/download-template', (req, res) => {
  try {
    const csvContent = csvHandler.generateTemplate();
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="callers-template.csv"');
    
    csvContent.pipe(res);
  } catch (error) {
    logger.error('Error generating CSV template:', error);
    req.flash('error', 'Failed to generate template');
    res.redirect('/admin/callers/upload');
  }
});

// POST /admin/callers/assign - Assign callers to employees
router.post('/callers/assign', asyncHandler(async (req, res) => {
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
    let assignedCount = 0;
    for (const callerId of caller_ids) {
      try {
        await Caller.assignToEmployee(callerId, employee_id, req.user.id, 'manual');
        assignedCount++;
      } catch (error) {
        logger.error(`Failed to assign caller ${callerId}:`, error);
      }
    }

    logger.upload(`Manual assignment completed by admin ${req.user.email}: ${assignedCount} callers assigned to employee ${employee_id}`);
    
    res.json({
      success: true,
      message: `${assignedCount} callers assigned successfully`,
      assignedCount
    });
  } catch (error) {
    logger.error('Error assigning callers:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to assign callers'
    });
  }
}));

// GET /admin/system - System administration page
router.get('/system', asyncHandler(async (req, res) => {
  try {
    const cronStats = await cronManager.getStats();
    const dbStatus = await User.getPoolStatus();
    
    res.render('admin/system', {
      title: 'System Administration - Call Manager',
      user: req.user,
      cronStats,
      dbStatus
    });
  } catch (error) {
    logger.error('Error loading system page:', error);
    req.flash('error', 'Failed to load system information');
    res.redirect('/admin/dashboard');
  }
}));

// POST /admin/system/cron/trigger - Manually trigger cron jobs
router.post('/system/cron/trigger', asyncHandler(async (req, res) => {
  try {
    const { jobType } = req.body;
    
    let result;
    switch (jobType) {
      case 'autoAssignment':
        result = await cronManager.triggerAutoAssignment();
        break;
      case 'healthCheck':
        result = await cronManager.triggerHealthCheck();
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid job type'
        });
    }
    
    logger.cron(`Manual cron job trigger by admin ${req.user.email}: ${jobType}`);
    
    res.json(result);
  } catch (error) {
    logger.error('Error triggering cron job:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to trigger cron job'
    });
  }
}));

// GET /admin/reports - Reports and analytics page
router.get('/reports', asyncHandler(async (req, res) => {
  try {
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
    res.redirect('/admin/dashboard');
  }
}));

module.exports = router;
