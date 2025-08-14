// Cron job utility for the Call Manager application
// Handles automatic caller assignment and other scheduled tasks

import cron from 'node-cron';
import User from '../models/User.js';
import Caller from '../models/Caller.js';
import logger from './logger.js';
import config from '../config/index.js';

class CronJobManager {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  // Initialize all cron jobs
  async init() {
    try {
      if (this.isRunning) {
        logger.warning('Cron jobs are already running');
        return;
      }

      // Start automatic caller assignment job
      this.startAutoAssignmentJob();

      // Start database health check job
      this.startHealthCheckJob();

      this.isRunning = true;
      logger.cron('All cron jobs initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize cron jobs:', error);
      throw error;
    }
  }

  // Start automatic caller assignment job
  startAutoAssignmentJob() {
    try {
      // Run every 5 minutes
      const job = cron.schedule('*/5 * * * *', async () => {
        await this.performAutoAssignment();
      }, {
        scheduled: true,
        timezone: 'UTC'
      });

      this.jobs.set('autoAssignment', job);
      logger.cron('Automatic caller assignment job started (every 5 minutes)');
    } catch (error) {
      logger.error('Failed to start auto assignment cron job:', error);
    }
  }

  // Start database health check job
  startHealthCheckJob() {
    try {
      // Run every 10 minutes
      const job = cron.schedule('*/10 * * * *', async () => {
        await this.performHealthCheck();
      }, {
        scheduled: true,
        timezone: 'UTC'
      });

      this.jobs.set('healthCheck', job);
      logger.cron('Database health check job started (every 10 minutes)');
    } catch (error) {
      logger.error('Failed to start health check cron job:', error);
    }
  }

  // Perform automatic caller assignment
  async performAutoAssignment() {
    try {
      logger.cron('Starting automatic caller assignment...');

      // Get employees with caller count
      const employees = await User.getEmployeesWithCallerCount();
      
      if (!employees || employees.length === 0) {
        logger.cron('No employees found for auto assignment');
        return;
      }

      // Get unassigned callers
      const unassignedCallers = await Caller.getUnassignedCallers(100);
      
      if (!unassignedCallers || unassignedCallers.length === 0) {
        logger.cron('No unassigned callers found for auto assignment');
        return;
      }

      let assignedCount = 0;
      let callerIndex = 0;

      // Assign callers to employees with the least callers
      for (const employee of employees) {
        if (callerIndex >= unassignedCallers.length) {
          break;
        }

        // If employee has 0 active callers, assign up to 100
        if (employee.caller_count === 0) {
          const callersToAssign = unassignedCallers.slice(callerIndex, callerIndex + 100);
          
          for (const caller of callersToAssign) {
            try {
              await Caller.assignToEmployee(
                caller.id, 
                employee.id, 
                1, // Super admin ID for system assignment
                'auto'
              );
              assignedCount++;
            } catch (error) {
              logger.error('Failed to auto-assign caller:', {
                callerId: caller.id,
                employeeId: employee.id,
                error: error.message
              });
            }
          }
          
          callerIndex += callersToAssign.length;
        }
      }

      logger.cron(`Automatic assignment completed: ${assignedCount} callers assigned`);
    } catch (error) {
      logger.error('Error during automatic caller assignment:', error);
    }
  }

  // Perform database health check
  async performHealthCheck() {
    try {
      logger.cron('Starting database health check...');

      // Test database connection
      const dbStatus = await User.testConnection();
      
      if (dbStatus) {
        logger.cron('Database health check passed');
      } else {
        logger.error('Database health check failed');
      }
    } catch (error) {
      logger.error('Error during database health check:', error);
    }
  }

  // Manually trigger auto assignment (for testing/admin use)
  async triggerAutoAssignment() {
    try {
      logger.cron('Manual trigger of auto assignment requested');
      await this.performAutoAssignment();
      return { success: true, message: 'Auto assignment completed' };
    } catch (error) {
      logger.error('Manual auto assignment failed:', error);
      return { success: false, message: error.message };
    }
  }

  // Manually trigger health check
  async triggerHealthCheck() {
    try {
      logger.cron('Manual trigger of health check requested');
      await this.performHealthCheck();
      return { success: true, message: 'Health check completed' };
    } catch (error) {
      logger.error('Manual health check failed:', error);
      return { success: false, message: error.message };
    }
  }

  // Get cron job status
  getJobStatus() {
    const status = {};
    
    for (const [jobName, job] of this.jobs) {
      status[jobName] = {
        running: job.running,
        nextRun: job.nextDate().toISOString(),
        lastRun: job.lastDate()?.toISOString() || null
      };
    }
    
    return {
      isRunning: this.isRunning,
      jobs: status
    };
  }

  // Stop a specific cron job
  stopJob(jobName) {
    try {
      const job = this.jobs.get(jobName);
      if (job) {
        job.stop();
        this.jobs.delete(jobName);
        logger.cron(`Cron job stopped: ${jobName}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Failed to stop cron job ${jobName}:`, error);
      return false;
    }
  }

  // Stop all cron jobs
  stopAllJobs() {
    try {
      for (const [jobName, job] of this.jobs) {
        job.stop();
        logger.cron(`Cron job stopped: ${jobName}`);
      }
      
      this.jobs.clear();
      this.isRunning = false;
      logger.cron('All cron jobs stopped');
    } catch (error) {
      logger.error('Failed to stop all cron jobs:', error);
    }
  }

  // Restart all cron jobs
  async restart() {
    try {
      logger.cron('Restarting all cron jobs...');
      this.stopAllJobs();
      await this.init();
      logger.cron('All cron jobs restarted successfully');
    } catch (error) {
      logger.error('Failed to restart cron jobs:', error);
      throw error;
    }
  }

  // Update cron job schedule
  updateSchedule(jobName, newSchedule) {
    try {
      const job = this.jobs.get(jobName);
      if (job) {
        job.stop();
        
        const newJob = cron.schedule(newSchedule, job.callback, {
          scheduled: true,
          timezone: 'UTC'
        });
        
        this.jobs.set(jobName, newJob);
        logger.cron(`Cron job schedule updated: ${jobName} -> ${newSchedule}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Failed to update cron job schedule for ${jobName}:`, error);
      return false;
    }
  }

  // Get next run times for all jobs
  getNextRunTimes() {
    const nextRuns = {};
    
    for (const [jobName, job] of this.jobs) {
      try {
        nextRuns[jobName] = job.nextDate().toISOString();
      } catch (error) {
        nextRuns[jobName] = 'Error calculating next run time';
      }
    }
    
    return nextRuns;
  }

  // Validate cron expression
  static validateCronExpression(expression) {
    try {
      cron.validate(expression);
      return { valid: true, message: 'Valid cron expression' };
    } catch (error) {
      return { valid: false, message: error.message };
    }
  }

  // Get cron job statistics
  async getStats() {
    try {
      const stats = {
        totalJobs: this.jobs.size,
        runningJobs: Array.from(this.jobs.values()).filter(job => job.running).length,
        isRunning: this.isRunning,
        nextRuns: this.getNextRunTimes(),
        lastRun: {}
      };

      // Get last run times
      for (const [jobName, job] of this.jobs) {
        try {
          stats.lastRun[jobName] = job.lastDate()?.toISOString() || 'Never';
        } catch (error) {
          stats.lastRun[jobName] = 'Error getting last run time';
        }
      }

      return stats;
    } catch (error) {
      logger.error('Error getting cron job statistics:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const cronManager = new CronJobManager();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, stopping cron jobs...');
  cronManager.stopAllJobs();
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, stopping cron jobs...');
  cronManager.stopAllJobs();
});

export default cronManager;
