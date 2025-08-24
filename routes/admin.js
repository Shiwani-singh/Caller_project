// Admin routes for the Call Manager application
// Handles super admin functionality including user and caller management

import express from 'express';
import { requireSuperAdmin, requireAuth } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import adminController from '../controller/adminController.js';
import csrf from 'csurf';

const csrfProtection = csrf();

const router = express.Router();

// Apply authentication middleware to all admin routes
router.use(requireAuth, requireSuperAdmin);

// GET /admin/dashboard - Super admin dashboard
router.get('/dashboard', asyncHandler(adminController.showDashboard));

// GET /admin/users - User management page
router.get('/users', asyncHandler(adminController.showUsers));

// GET /admin/users/new - Show create user form
router.get('/users/new', adminController.showCreateUser);

// POST /admin/users - Create new user
router.post('/users', asyncHandler(adminController.createUser));

// GET /admin/users/:id/edit - Show edit user form
router.get('/users/:id/edit', asyncHandler(adminController.showEditUser));

// PUT /admin/users/:id - Update user
router.put('/users/:id', asyncHandler(adminController.updateUser));

// DELETE /admin/users/:id - Delete user
router.delete('/users/:id', asyncHandler(adminController.deleteUser));

// GET /admin/callers - Caller management page
router.get('/callers', asyncHandler(adminController.showCallers));

// GET /admin/callers/new - Show create caller form
router.get('/callers/new', adminController.showCreateCaller);

// POST /admin/callers - Create new caller
router.post('/callers', asyncHandler(adminController.createCaller));

// GET /admin/callers/upload - Show CSV upload form
router.get(
  '/callers/upload',
//   csrfProtection,
  adminController.showUploadCallers
);

// POST /admin/callers/upload - Handle CSV upload
// router.post('/callers/upload', adminController.getUpload().single('csvFile'), csrfProtection, asyncHandler(adminController.handleCSVUpload));

router.post(
  '/callers/upload',
  adminController.getUpload().single('csvFile'), // parse file first
  csrfProtection, // then validate CSRF
  asyncHandler(adminController.handleCSVUpload)
);

// GET /admin/callers/download-template - Download CSV template
router.get('/callers/download-template', adminController.downloadCSVTemplate);

// POST /admin/callers/assign - Assign callers to employees
router.post('/callers/assign', asyncHandler(adminController.assignCallers));

// GET /admin/system - System administration page
router.get('/system', asyncHandler(adminController.showSystem));

// GET /admin/reports - Reports and analytics page
router.get('/reports', asyncHandler(adminController.showReports));

export default router;
