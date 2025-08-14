// Employee controller for the Call Manager application
// Handles employee functionality including viewing assigned callers and marking them as called

import Caller from '../models/Caller.js';
import { validateData } from '../utils/validation.js';
import { assignmentSchemas } from '../utils/validation.js';
import logger from '../utils/logger.js';
import AppError from '../utils/AppError.js';
import fastcsv from 'fast-csv';

class EmployeeController {
  // Show employee dashboard
  async showDashboard(req, res) {
    try {
      // Get callers assigned to this employee
      const assignedCallers = await Caller.getAssignedToEmployee(req.user.id);
      
      // Get employee statistics
      const stats = {
        totalAssigned: assignedCallers.length,
        activeCallers: assignedCallers.filter(c => c.status === 'active').length,
        completedCallers: assignedCallers.filter(c => c.status === 'inactive').length
      };
      
      res.render('employee/dashboard', {
        title: 'Employee Dashboard - Call Manager',
        user: req.user,
        callers: assignedCallers,
        stats
      });
    } catch (error) {
      logger.error('Error loading employee dashboard:', error);
      req.flash('error', 'Failed to load dashboard');
      res.redirect('/dashboard');
    }
  }

  // Show assigned callers
  async showCallers(req, res) {
    try {
      const { page = 1, limit = 10, status, sortBy = 'assigned_at', sortOrder = 'ASC' } = req.query;
      
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        assigned_to: req.user.id,
        status: status || null,
        sortBy,
        sortOrder
      };

      const result = await Caller.findAll(options);
      
      res.render('employee/callers', {
        title: 'My Assigned Callers - Call Manager',
        user: req.user,
        callers: result.callers,
        pagination: result.pagination,
        filters: options
      });
    } catch (error) {
      logger.error('Error loading employee callers:', error);
      req.flash('error', 'Failed to load callers');
      res.redirect('/employee/dashboard');
    }
  }

  // Show caller details
  async showCallerDetails(req, res) {
    try {
      const callerId = req.params.id;
      const caller = await Caller.findById(callerId);
      
      if (!caller) {
        req.flash('error', 'Caller not found');
        return res.redirect('/employee/callers');
      }
      
      // Check if caller is assigned to this employee
      if (caller.assigned_to !== req.user.id) {
        req.flash('error', 'You can only view callers assigned to you');
        return res.redirect('/employee/callers');
      }
      
      res.render('employee/callers/view', {
        title: `Caller: ${caller.name} - Call Manager`,
        user: req.user,
        caller
      });
    } catch (error) {
      logger.error('Error loading caller details:', error);
      req.flash('error', 'Failed to load caller details');
      res.redirect('/employee/callers');
    }
  }

  // Mark caller as called
  async markCallerAsCalled(req, res) {
    try {
      const callerId = req.params.id;
      
      // Validate input
      const validation = validateData(assignmentSchemas.markCalled, { caller_id: parseInt(callerId) });
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: validation.errors[0].message
        });
      }
      
      // Get caller to check ownership
      const caller = await Caller.findById(callerId);
      if (!caller) {
        return res.status(404).json({
          success: false,
          message: 'Caller not found'
        });
      }
      
      // Check if caller is assigned to this employee
      if (caller.assigned_to !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only mark callers assigned to you as called'
        });
      }
      
      // Mark caller as called
      await Caller.markAsCalled(callerId);
      
      logger.upload(`Caller marked as called by employee ${req.user.email}: ${caller.email}`);
      
      res.json({
        success: true,
        message: 'Caller marked as called successfully'
      });
    } catch (error) {
      logger.error('Error marking caller as called:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to mark caller as called'
      });
    }
  }

  // Show edit caller form
  async showEditCaller(req, res) {
    try {
      const callerId = req.params.id;
      const caller = await Caller.findById(callerId);
      
      if (!caller) {
        req.flash('error', 'Caller not found');
        return res.redirect('/employee/callers');
      }
      
      // Check if caller is assigned to this employee
      if (caller.assigned_to !== req.user.id) {
        req.flash('error', 'You can only edit callers assigned to you');
        return res.redirect('/employee/callers');
      }
      
      res.render('employee/callers/edit', {
        title: `Edit Caller: ${caller.name} - Call Manager`,
        user: req.user,
        caller
      });
    } catch (error) {
      logger.error('Error loading caller for edit:', error);
      req.flash('error', 'Failed to load caller');
      res.redirect('/employee/callers');
    }
  }

  // Update caller
  async updateCaller(req, res) {
    try {
      const callerId = req.params.id;
      const updateData = req.body;
      
      // Get caller to check ownership
      const caller = await Caller.findById(callerId);
      if (!caller) {
        req.flash('error', 'Caller not found');
        return res.redirect('/employee/callers');
      }
      
      // Check if caller is assigned to this employee
      if (caller.assigned_to !== req.user.id) {
        req.flash('error', 'You can only edit callers assigned to you');
        return res.redirect('/employee/callers');
      }
      
      // Update caller
      await Caller.update(callerId, updateData);
      
      logger.upload(`Caller updated by employee ${req.user.email}: ${caller.email}`);
      req.flash('success', 'Caller updated successfully');
      
      res.redirect('/employee/callers');
    } catch (error) {
      logger.error('Error updating caller:', error);
      
      if (error instanceof AppError) {
        req.flash('error', error.message);
      } else {
        req.flash('error', 'Failed to update caller. Please try again.');
      }
      
      res.redirect(`/employee/callers/${req.params.id}/edit`);
    }
  }

  // Show employee profile page
  showProfile(req, res) {
    res.render('employee/profile', {
      title: 'My Profile - Call Manager',
      user: req.user
    });
  }

  // Show employee reports page
  async showReports(req, res) {
    try {
      // Get callers assigned to this employee
      const assignedCallers = await Caller.getAssignedToEmployee(req.user.id);
      
      // Calculate statistics
      const stats = {
        totalAssigned: assignedCallers.length,
        activeCallers: assignedCallers.filter(c => c.status === 'active').length,
        completedCallers: assignedCallers.filter(c => c.status === 'inactive').length,
        completionRate: assignedCallers.length > 0 
          ? ((assignedCallers.filter(c => c.status === 'inactive').length / assignedCallers.length) * 100).toFixed(2)
          : 0
      };
      
      // Group callers by batch
      const callersByBatch = {};
      assignedCallers.forEach(caller => {
        const batch = caller.batch_id || 'No Batch';
        if (!callersByBatch[batch]) {
          callersByBatch[batch] = [];
        }
        callersByBatch[batch].push(caller);
      });
      
      res.render('employee/reports', {
        title: 'My Reports - Call Manager',
        user: req.user,
        stats,
        callersByBatch
      });
    } catch (error) {
      logger.error('Error loading employee reports:', error);
      req.flash('error', 'Failed to load reports');
      res.redirect('/employee/dashboard');
    }
  }

  // Export assigned callers to CSV
  async exportCallers(req, res) {
    try {
      // Get all callers assigned to this employee
      const assignedCallers = await Caller.getAssignedToEmployee(req.user.id);
      
      // Prepare CSV data
      const csvData = assignedCallers.map(caller => ({
        name: caller.name,
        email: caller.email,
        phone: caller.phone,
        status: caller.status,
        assigned_at: caller.assigned_at,
        batch_id: caller.batch_id || 'No Batch'
      }));
      
      // Set response headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="my-callers-${Date.now()}.csv"`);
      
      // Generate CSV content
      const csvContent = fastcsv.format({ headers: true });
      csvContent.pipe(res);
      
      // Write data to CSV
      csvData.forEach(row => csvContent.write(row));
      csvContent.end();
      
      logger.upload(`Callers exported by employee ${req.user.email}: ${csvData.length} records`);
    } catch (error) {
      logger.error('Error exporting callers:', error);
      req.flash('error', 'Failed to export callers');
      res.redirect('/employee/callers');
    }
  }

  // Show employee help page
  showHelp(req, res) {
    res.render('employee/help', {
      title: 'Help & Support - Call Manager',
      user: req.user
    });
  }

  // Add note to caller
  async addNoteToCaller(req, res) {
    try {
      const callerId = req.params.id;
      const { note } = req.body;
      
      if (!note || note.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Note content is required'
        });
      }
      
      // Get caller to check ownership
      const caller = await Caller.findById(callerId);
      if (!caller) {
        return res.status(404).json({
          success: false,
          message: 'Caller not found'
        });
      }
      
      // Check if caller is assigned to this employee
      if (caller.assigned_to !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only add notes to callers assigned to you'
        });
      }
      
      // In a real application, you would save the note to a separate table
      // For now, we'll just log it
      logger.upload(`Note added to caller ${caller.email} by employee ${req.user.email}: ${note}`);
      
      res.json({
        success: true,
        message: 'Note added successfully'
      });
    } catch (error) {
      logger.error('Error adding note to caller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to add note'
      });
    }
  }

  // Show caller call history
  async showCallerHistory(req, res) {
    try {
      const callerId = req.params.id;
      const caller = await Caller.findById(callerId);
      
      if (!caller) {
        req.flash('error', 'Caller not found');
        return res.redirect('/employee/callers');
      }
      
      // Check if caller is assigned to this employee
      if (caller.assigned_to !== req.user.id) {
        req.flash('error', 'You can only view history for callers assigned to you');
        return res.redirect('/employee/callers');
      }
      
      // In a real application, you would fetch call history from a separate table
      // For now, we'll just show the caller details
      res.render('employee/callers/history', {
        title: `Call History: ${caller.name} - Call Manager`,
        user: req.user,
        caller,
        callHistory: [] // Placeholder for actual call history
      });
    } catch (error) {
      logger.error('Error loading caller history:', error);
      req.flash('error', 'Failed to load caller history');
      res.redirect('/employee/callers');
    }
  }
}

export default new EmployeeController();


