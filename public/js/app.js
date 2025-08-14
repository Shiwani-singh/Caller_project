// Call Manager Application JavaScript

// Utility functions
const App = {
  // Initialize the application
  init() {
    this.setupEventListeners();
    this.initializeTooltips();
    this.initializeModals();
    this.setupFormValidation();
    this.setupDataTables();
  },

  // Setup global event listeners
  setupEventListeners() {
    // Auto-hide alerts after 5 seconds
    setTimeout(() => {
      const alerts = document.querySelectorAll('.alert');
      alerts.forEach(alert => {
        const bsAlert = new bootstrap.Alert(alert);
        bsAlert.close();
      });
    }, 5000);

    // Confirm delete actions
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-confirm]')) {
        e.preventDefault();
        const message = e.target.dataset.confirm;
        if (confirm(message)) {
          const href = e.target.href;
          if (href) {
            window.location.href = href;
          }
        }
      }
    });

    // Form submission with loading state
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (form.classList.contains('loading-form')) {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';
        }
      }
    });
  },

  // Initialize Bootstrap tooltips
  initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  },

  // Initialize Bootstrap modals
  initializeModals() {
    const modalTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="modal"]'));
    modalTriggerList.map(function (modalTriggerEl) {
      return new bootstrap.Modal(modalTriggerEl);
    });
  },

  // Setup form validation
  setupFormValidation() {
    const forms = document.querySelectorAll('.needs-validation');
    forms.forEach(form => {
      form.addEventListener('submit', (e) => {
        if (!form.checkValidity()) {
          e.preventDefault();
          e.stopPropagation();
        }
        form.classList.add('was-validated');
      });
    });
  },

  // Setup data tables with search and pagination
  setupDataTables() {
    const tables = document.querySelectorAll('.data-table');
    tables.forEach(table => {
      this.initializeTable(table);
    });
  },

  // Initialize a single table
  initializeTable(table) {
    const searchInput = table.querySelector('.table-search');
    const rows = table.querySelectorAll('tbody tr');
    
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        this.filterTableRows(table, searchTerm);
      });
    }
  },

  // Filter table rows based on search term
  filterTableRows(table, searchTerm) {
    const rows = table.querySelectorAll('tbody tr');
    let visibleCount = 0;

    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      if (text.includes(searchTerm)) {
        row.style.display = '';
        visibleCount++;
      } else {
        row.style.display = 'none';
      }
    });

    // Show/hide no results message
    const noResultsRow = table.querySelector('.no-results');
    if (noResultsRow) {
      noResultsRow.style.display = visibleCount === 0 ? '' : 'none';
    }
  },

  // Show loading spinner
  showLoading(element) {
    if (element) {
      element.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    }
  },

  // Hide loading spinner
  hideLoading(element, content) {
    if (element && content) {
      element.innerHTML = content;
    }
  },

  // Show success message
  showSuccess(message, duration = 3000) {
    this.showMessage(message, 'success', duration);
  },

  // Show error message
  showError(message, duration = 5000) {
    this.showMessage(message, 'danger', duration);
  },

  // Show info message
  showInfo(message, duration = 3000) {
    this.showMessage(message, 'info', duration);
  },

  // Show message with toast notification
  showMessage(message, type, duration) {
    const toastContainer = document.getElementById('toast-container') || this.createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;
    
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast, { delay: duration });
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
      toast.remove();
    });
  },

  // Create toast container if it doesn't exist
  createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
  },

  // Format phone number
  formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return phone;
  },

  // Format date
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  // Format currency
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  },

  // Debounce function for search inputs
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Copy to clipboard
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showSuccess('Copied to clipboard!');
    } catch (err) {
      this.showError('Failed to copy to clipboard');
    }
  },

  // Export table to CSV
  exportTableToCSV(table, filename = 'export.csv') {
    const rows = table.querySelectorAll('tr');
    let csv = [];
    
    rows.forEach(row => {
      const cols = row.querySelectorAll('td, th');
      const rowData = [];
      cols.forEach(col => {
        rowData.push(`"${col.textContent.trim()}"`);
      });
      csv.push(rowData.join(','));
    });
    
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Export for use in other modules
export default App;


