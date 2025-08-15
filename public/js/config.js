// Frontend configuration for the Call Manager application
// This file provides configuration values that can be used in the browser

const FrontendConfig = {
  // File upload limits
  upload: {
    maxFileSize: 1 * 1024 * 1024, // 1MB in bytes
    maxFileSizeMB: 1, // 1MB in human readable format
    allowedMimeTypes: ['text/csv'],
    allowedExtensions: ['.csv']
  },

  // Validation rules
  validation: {
    name: {
      minLength: 2,
      maxLength: 100
    },
    email: {
      minLength: 5,
      maxLength: 255
    },
    phone: {
      minLength: 10,
      maxLength: 20
    },
    password: {
      minLength: 8,
      maxLength: 100
    }
  },

  // API endpoints
  api: {
    baseUrl: '/v1',
    auth: '/v1/auth',
    admin: '/v1/admin',
    employee: '/v1/employee'
  },

  // UI configuration
  ui: {
    showDebugInfo: false, // Set to true to show debug information
    autoHideAlerts: true, // Auto-hide flash messages
    alertTimeout: 5000 // Timeout for auto-hiding alerts in milliseconds
  }
};

// Export for use in browser
window.FrontendConfig = FrontendConfig;

