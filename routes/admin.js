// Admin routes for the Call Manager application
// Handles super admin functionality including user and caller management

import express from 'express';
import { requireSuperAdmin, requireAuth } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import adminController from '../controller/adminController.js';

const router = express.Router();

// Apply authentication middleware to all admin routes
router.use(requireAuth, requireSuperAdmin);

// GET /admin/dashboard - Super admin dashboard
router.get('/dashboard', asyncHandler(adminController.showDashboard.bind(adminController)));

// GET /admin/users - User management page
router.get('/users', asyncHandler(adminController.showUsers.bind(adminController)));

// GET /admin/users/new - Show create user form
router.get('/users/new', adminController.showCreateUser);

// POST /admin/users - Create new user
router.post('/users', asyncHandler(adminController.createUser.bind(adminController)));

// GET /admin/users/:id/edit - Show edit user form
router.get('/users/:id/edit', asyncHandler(adminController.showEditUser.bind(adminController)));

// PUT /admin/users/:id - Update user
router.put('/users/:id', asyncHandler(adminController.updateUser.bind(adminController)));

// DELETE /admin/users/:id - Delete user
router.delete('/users/:id', asyncHandler(adminController.deleteUser.bind(adminController)));

// GET /admin/callers - Caller management page
router.get('/callers', asyncHandler(adminController.showCallers.bind(adminController)));

// GET /admin/callers/new - Show create caller form
router.get('/callers/new', adminController.showCreateCaller);

// POST /admin/callers - Create new caller
router.post('/callers', asyncHandler(adminController.createCaller.bind(adminController)));

// GET /admin/callers/upload - Show CSV upload form
router.get('/callers/upload', adminController.showUploadCallers);

// POST /admin/callers/upload - Handle CSV upload
router.post('/callers/upload', adminController.getUpload().single('csvFile'), asyncHandler(adminController.handleCSVUpload.bind(adminController)));

// GET /admin/callers/download-template - Download CSV template
router.get('/callers/download-template', adminController.downloadCSVTemplate);

// POST /admin/callers/assign - Assign callers to employees
router.post('/callers/assign', asyncHandler(adminController.assignCallers.bind(adminController)));

// GET /admin/system - System administration page
router.get('/system', asyncHandler(adminController.showSystem.bind(adminController)));

// GET /admin/reports - Reports and analytics page
router.get('/reports', asyncHandler(adminController.showReports.bind(adminController)));

export default router;
