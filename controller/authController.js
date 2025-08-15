// Authentication controller for the Call Manager application
// Handles user login, logout, and authentication-related functionality

import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { validateData, sanitizeData, userSchemas } from '../utils/validation.js';
import logger from '../utils/logger.js';
import AppError from '../utils/AppError.js';

class AuthController {
  // Show login page
  showLogin(req, res) {
    res.render('auth/login', {
      title: 'Login - Call Manager',
      error: req.flash('error'),
      success: req.flash('success'),
      path: '/auth/login'
    });
  }

  // Handle user login
  async handleLogin(req, res) {
    try {
      logger.info('Login attempt:', { email: req.body.email });
      
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
        default:
          res.redirect('/dashboard');
      }
    } catch (error) {
      logger.error('Login error:', error);
      req.flash('error', 'Login failed. Please try again.');
      res.redirect('/auth/login');
    }
  }

  // Handle user logout
  handleLogout(req, res) {
    try {
      if (req.session) {
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
      } else {
        // No session, just redirect
        res.clearCookie('callmanager.sid');
        req.flash('success', 'You have been logged out successfully');
        res.redirect('/auth/login');
      }
    } catch (error) {
      logger.error('Logout error:', error);
      req.flash('error', 'Logout failed');
      res.redirect('/dashboard');
    }
  }



  // Show user profile
  async showProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      
      res.render('auth/profile', {
        title: 'My Profile - Call Manager',
        user,
        error: req.flash('error'),
        success: req.flash('success'),
        path: '/auth/profile'
      });
    } catch (error) {
      logger.error('Error loading user profile:', error);
      req.flash('error', 'Failed to load profile');
      res.redirect('/dashboard');
    }
  }






}

export default new AuthController();


