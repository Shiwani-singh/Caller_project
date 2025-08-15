// Authentication routes for the Call Manager application
// Handles user login, logout, and authentication-related functionality

import express from 'express';
import { requireGuest, requireAuth } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import authController from '../controller/authController.js';

const router = express.Router();

// GET /auth/login - Show login page
router.get('/login', requireGuest, authController.showLogin);

// POST /auth/login - Handle user login
router.post('/login', requireGuest, asyncHandler(authController.handleLogin));

// GET /auth/logout - Handle user logout
router.get('/logout', requireAuth, authController.handleLogout);

// GET /auth/profile - Show user profile
router.get('/profile', requireAuth, asyncHandler(authController.showProfile));

export default router;
