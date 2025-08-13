// Authentication routes for the Call Manager application
// Handles user login, logout, and authentication-related functionality

const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { validateData, sanitizeData } = require('../utils/validation');
const { userSchemas } = require('../utils/validation');
const { requireGuest, requireAuth, requireSuperAdmin } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

const router = express.Router();

// GET /auth/login - Show login page
router.get('/login', requireGuest, (req, res) => {
  res.render('auth/login', {
    title: 'Login - Call Manager',
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// POST /auth/login - Handle user login
router.post('/login', requireGuest, asyncHandler(async (req, res) => {
  try {
    // Validate input
    const validation = validateData(userSchemas.login, req.body);
    if (!validation.success) {
      req.flash('error', validation.errors[0].message);
      return res.redirect('/auth/login');
    }

    const { email, password } = validation.data;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      logger.auth(`Login failed: User not found - ${email}`);
      req.flash('error', 'Invalid email or password');
      return res.redirect('/auth/login');
    }

    // Verify password
    const isPasswordValid = await User.verifyPassword(user, password);
    if (!isPasswordValid) {
      logger.auth(`Login failed: Invalid password - ${email}`);
      req.flash('error', 'Invalid email or password');
      return res.redirect('/auth/login');
    }

    // Create session
    req.session.userId = user.id;
    req.session.userRole = user.role_name;

    logger.auth(`User logged in successfully: ${email} (${user.role_name})`);

    // Redirect based on role
    switch (user.role_name) {
      case 'super_admin':
        res.redirect('/admin/dashboard');
        break;
      case 'employee':
        res.redirect('/employee/dashboard');
        break;
      case 'caller':
        res.redirect('/caller/dashboard');
        break;
      default:
        res.redirect('/dashboard');
    }
  } catch (error) {
    logger.error('Login error:', error);
    req.flash('error', 'Login failed. Please try again.');
    res.redirect('/auth/login');
  }
}));

// GET /auth/logout - Handle user logout
router.get('/logout', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    req.session.destroy((err) => {
      if (err) {
        logger.error('Error destroying session:', err);
        req.flash('error', 'Logout failed');
        return res.redirect('/dashboard');
      }
      
      logger.auth(`User logged out successfully: ID ${userId}`);
      res.clearCookie('callmanager.sid');
      req.flash('success', 'You have been logged out successfully');
      res.redirect('/auth/login');
    });
  } catch (error) {
    logger.error('Logout error:', error);
    req.flash('error', 'Logout failed');
    res.redirect('/dashboard');
  }
});

// GET /auth/register - Show registration page (super admin only)
router.get('/register', requireAuth, requireSuperAdmin, (req, res) => {
  res.render('auth/register', {
    title: 'Register User - Call Manager',
    error: req.flash('error'),
    success: req.flash('success'),
    user: req.user
  });
});

// POST /auth/register - Handle user registration (super admin only)
router.post('/register', requireAuth, requireSuperAdmin, asyncHandler(async (req, res) => {
  try {
    // Validate input
    const validation = validateData(userSchemas.create, req.body);
    if (!validation.success) {
      req.flash('error', validation.errors[0].message);
      return res.redirect('/auth/register');
    }

    const userData = validation.data;

    // Check if user already exists
    const existingUser = await User.findByEmail(userData.email);
    if (existingUser) {
      req.flash('error', 'A user with this email already exists');
      return res.redirect('/auth/register');
    }

    const existingPhone = await User.findByPhone(userData.phone);
    if (existingPhone) {
      req.flash('error', 'A user with this phone number already exists');
      return res.redirect('/auth/register');
    }

    // Create user
    const newUser = await User.create(userData);
    
    logger.auth(`New user created by ${req.user.email}: ${newUser.email} (${newUser.role_id})`);
    req.flash('success', `User ${newUser.name} has been created successfully`);
    
    res.redirect('/admin/users');
  } catch (error) {
    logger.error('User registration error:', error);
    
    if (error instanceof AppError) {
      req.flash('error', error.message);
    } else {
      req.flash('error', 'Failed to create user. Please try again.');
    }
    
    res.redirect('/auth/register');
  }
}));

// GET /auth/profile - Show user profile
router.get('/profile', requireAuth, asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.render('auth/profile', {
      title: 'My Profile - Call Manager',
      user,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (error) {
    logger.error('Error loading user profile:', error);
    req.flash('error', 'Failed to load profile');
    res.redirect('/dashboard');
  }
}));

// POST /auth/profile - Update user profile
router.post('/profile', requireAuth, asyncHandler(async (req, res) => {
  try {
    // Validate input
    const validation = validateData(userSchemas.update, req.body);
    if (!validation.success) {
      req.flash('error', validation.errors[0].message);
      return res.redirect('/auth/profile');
    }

    const updateData = validation.data;

    // Check if email is being changed and if it already exists
    if (updateData.email && updateData.email !== req.user.email) {
      const existingUser = await User.findByEmail(updateData.email);
      if (existingUser) {
        req.flash('error', 'A user with this email already exists');
        return res.redirect('/auth/profile');
      }
    }

    // Check if phone is being changed and if it already exists
    if (updateData.phone && updateData.phone !== req.user.phone) {
      const existingUser = await User.findByPhone(updateData.phone);
      if (existingUser) {
        req.flash('error', 'A user with this phone number already exists');
        return res.redirect('/auth/profile');
      }
    }

    // Update user
    const updatedUser = await User.update(req.user.id, updateData);
    
    logger.auth(`User profile updated: ${req.user.email}`);
    req.flash('success', 'Profile updated successfully');
    
    // Update session user data
    req.user = updatedUser;
    
    res.redirect('/auth/profile');
  } catch (error) {
    logger.error('Profile update error:', error);
    
    if (error instanceof AppError) {
      req.flash('error', error.message);
    } else {
      req.flash('error', 'Failed to update profile. Please try again.');
    }
    
    res.redirect('/auth/profile');
  }
}));

// POST /auth/change-password - Change user password
router.post('/change-password', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      req.flash('error', 'All password fields are required');
      return res.redirect('/auth/profile');
    }

    if (newPassword !== confirmPassword) {
      req.flash('error', 'New passwords do not match');
      return res.redirect('/auth/profile');
    }

    if (newPassword.length < 8) {
      req.flash('error', 'New password must be at least 8 characters long');
      return res.redirect('/auth/profile');
    }

    // Verify current password
    const user = await User.findById(req.user.id);
    const isCurrentPasswordValid = await User.verifyPassword(user, currentPassword);
    
    if (!isCurrentPasswordValid) {
      req.flash('error', 'Current password is incorrect');
      return res.redirect('/auth/profile');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password
    await User.update(req.user.id, { password: hashedPassword });
    
    logger.auth(`Password changed for user: ${req.user.email}`);
    req.flash('success', 'Password changed successfully');
    
    res.redirect('/auth/profile');
  } catch (error) {
    logger.error('Password change error:', error);
    req.flash('error', 'Failed to change password. Please try again.');
    res.redirect('/auth/profile');
  }
}));

// GET /auth/forgot-password - Show forgot password page
router.get('/forgot-password', requireGuest, (req, res) => {
  res.render('auth/forgot-password', {
    title: 'Forgot Password - Call Manager',
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// POST /auth/forgot-password - Handle forgot password request
router.post('/forgot-password', requireGuest, asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      req.flash('error', 'Email is required');
      return res.redirect('/auth/forgot-password');
    }

    // Check if user exists
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not for security
      req.flash('success', 'If an account with that email exists, a password reset link has been sent.');
      return res.redirect('/auth/forgot-password');
    }

    // In a real application, you would send a password reset email here
    // For now, just show a success message
    logger.auth(`Password reset requested for: ${email}`);
    req.flash('success', 'If an account with that email exists, a password reset link has been sent.');
    
    res.redirect('/auth/forgot-password');
  } catch (error) {
    logger.error('Forgot password error:', error);
    req.flash('error', 'Failed to process request. Please try again.');
    res.redirect('/auth/forgot-password');
  }
}));

// GET /auth/reset-password/:token - Show reset password page
router.get('/reset-password/:token', requireGuest, (req, res) => {
  const { token } = req.params;
  
  res.render('auth/reset-password', {
    title: 'Reset Password - Call Manager',
    token,
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// POST /auth/reset-password/:token - Handle password reset
router.post('/reset-password/:token', requireGuest, asyncHandler(async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      req.flash('error', 'All password fields are required');
      return res.redirect(`/auth/reset-password/${token}`);
    }

    if (newPassword !== confirmPassword) {
      req.flash('error', 'Passwords do not match');
      return res.redirect(`/auth/reset-password/${token}`);
    }

    if (newPassword.length < 8) {
      req.flash('error', 'Password must be at least 8 characters long');
      return res.redirect(`/auth/reset-password/${token}`);
    }

    // In a real application, you would validate the token and find the user
    // For now, just show a success message
    logger.auth(`Password reset completed for token: ${token}`);
    req.flash('success', 'Password has been reset successfully. You can now log in with your new password.');
    
    res.redirect('/auth/login');
  } catch (error) {
    logger.error('Password reset error:', error);
    req.flash('error', 'Failed to reset password. Please try again.');
    res.redirect(`/auth/reset-password/${token}`);
  }
}));

module.exports = router;
