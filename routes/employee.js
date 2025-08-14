// Employee routes for the Call Manager application
// Handles employee functionality including viewing assigned callers and marking them as called

import express from 'express';
import { requireEmployee, requireAuth } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import employeeController from '../controller/employeeController.js';

const router = express.Router();

// Apply authentication middleware to all employee routes
router.use(requireAuth, requireEmployee);

// GET /employee/dashboard - Employee dashboard
router.get('/dashboard', asyncHandler(employeeController.showDashboard.bind(employeeController)));

// GET /employee/callers - View assigned callers
router.get('/callers', asyncHandler(employeeController.showCallers.bind(employeeController)));

// GET /employee/callers/:id - View caller details
router.get('/callers/:id', asyncHandler(employeeController.showCallerDetails.bind(employeeController)));

// POST /employee/callers/:id/mark-called - Mark caller as called
router.post('/callers/:id/mark-called', asyncHandler(employeeController.markCallerAsCalled.bind(employeeController)));

// GET /employee/callers/:id/edit - Show edit caller form
router.get('/callers/:id/edit', asyncHandler(employeeController.showEditCaller.bind(employeeController)));

// PUT /employee/callers/:id - Update caller
router.put('/callers/:id', asyncHandler(employeeController.updateCaller.bind(employeeController)));

// GET /employee/profile - Employee profile page
router.get('/profile', employeeController.showProfile);

// GET /employee/reports - Employee reports page
router.get('/reports', asyncHandler(employeeController.showReports.bind(employeeController)));

// GET /employee/export - Export assigned callers to CSV
router.get('/export', asyncHandler(employeeController.exportCallers.bind(employeeController)));

// GET /employee/help - Employee help page
router.get('/help', employeeController.showHelp);

// POST /employee/callers/:id/add-note - Add note to caller
router.post('/callers/:id/add-note', asyncHandler(employeeController.addNoteToCaller.bind(employeeController)));

// GET /employee/callers/:id/history - View caller call history
router.get('/callers/:id/history', asyncHandler(employeeController.showCallerHistory.bind(employeeController)));

export default router;
