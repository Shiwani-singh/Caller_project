// Authentication routes for the Call Manager application
// Handles user login, logout, and authentication-related functionality

import express from 'express';
import { requireGuest, requireAuth, requireSuperAdmin } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import authController from '../controller/authController.js';

const router = express.Router();

// GET /auth/login - Show login page
router.get('/login', requireGuest, authController.showLogin);

// POST /auth/login - Handle user login
router.post('/login', requireGuest, asyncHandler(authController.handleLogin.bind(authController)));

// GET /auth/logout - Handle user logout
router.get('/logout', requireAuth, authController.handleLogout);

// GET /auth/register - Show registration page (super admin only)
router.get('/register', requireAuth, requireSuperAdmin, authController.showRegister);

// POST /auth/register - Handle user registration (super admin only)
router.post('/register', requireAuth, requireSuperAdmin, asyncHandler(authController.handleRegister.bind(authController)));

// GET /auth/profile - Show user profile
router.get('/profile', requireAuth, asyncHandler(authController.showProfile.bind(authController)));

// POST /auth/profile - Update user profile
router.post('/profile', requireAuth, asyncHandler(authController.updateProfile.bind(authController)));

// POST /auth/change-password - Change user password
router.post('/change-password', requireAuth, asyncHandler(authController.changePassword.bind(authController)));

// GET /auth/forgot-password - Show forgot password page
router.get('/forgot-password', requireGuest, authController.showForgotPassword);

// POST /auth/forgot-password - Handle forgot password request
router.post('/forgot-password', requireGuest, asyncHandler(authController.handleForgotPassword.bind(authController)));

// GET /auth/reset-password/:token - Show reset password page
router.get('/reset-password/:token', requireGuest, authController.showResetPassword);

// POST /auth/reset-password/:token - Handle password reset
router.post('/reset-password/:token', requireGuest, asyncHandler(authController.handleResetPassword.bind(authController)));

export default router;
