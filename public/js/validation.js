// Client-side validation utility for the Call Manager application
// Provides basic validation that mirrors the backend Zod schemas

class ValidationUtils {
  // Email validation
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && 
           email.length >= FrontendConfig.validation.email.minLength &&
           email.length <= FrontendConfig.validation.email.maxLength;
  }

  // Phone validation
  static isValidPhone(phone) {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,20}$/;
    return phoneRegex.test(phone) && 
           phone.length >= FrontendConfig.validation.phone.minLength &&
           phone.length <= FrontendConfig.validation.phone.maxLength;
  }

  // Password validation
  static isValidPassword(password) {
    return password.length >= FrontendConfig.validation.password.minLength && 
           password.length <= FrontendConfig.validation.password.maxLength &&
           /[a-z]/.test(password) && 
           /[A-Z]/.test(password) && 
           /\d/.test(password);
  }

  // Name validation
  static isValidName(name) {
    return name.trim().length >= FrontendConfig.validation.name.minLength && 
           name.trim().length <= FrontendConfig.validation.name.maxLength;
  }

  // File validation for CSV uploads
  static isValidCSVFile(file) {
    if (!file) return { valid: false, message: 'Please select a file' };
    
    if (!FrontendConfig.upload.allowedMimeTypes.includes(file.type) && 
        !FrontendConfig.upload.allowedExtensions.some(ext => file.name.endsWith(ext))) {
      return { valid: false, message: 'Only CSV files are allowed' };
    }
    
    if (file.size > FrontendConfig.upload.maxFileSize) {
      return { valid: false, message: `File size must be less than ${FrontendConfig.upload.maxFileSizeMB}MB` };
    }
    
    return { valid: true, message: 'File is valid' };
  }

  // Validate user creation form
  static validateUserForm(formData) {
    const errors = [];
    
    if (!this.isValidName(formData.name)) {
      errors.push({ field: 'name', message: `Name must be between ${FrontendConfig.validation.name.minLength} and ${FrontendConfig.validation.name.maxLength} characters` });
    }
    
    if (!this.isValidEmail(formData.email)) {
      errors.push({ field: 'email', message: `Email must be between ${FrontendConfig.validation.email.minLength} and ${FrontendConfig.validation.email.maxLength} characters and valid format` });
    }
    
    if (!this.isValidPhone(formData.phone)) {
      errors.push({ field: 'phone', message: `Phone must be between ${FrontendConfig.validation.phone.minLength} and ${FrontendConfig.validation.phone.maxLength} digits` });
    }
    
    if (!this.isValidPassword(formData.password)) {
      errors.push({ field: 'password', message: `Password must be between ${FrontendConfig.validation.password.minLength} and ${FrontendConfig.validation.password.maxLength} characters with uppercase, lowercase, and number` });
    }
    
    if (!formData.role_id || formData.role_id < 1 || formData.role_id > 2) {
      errors.push({ field: 'role_id', message: 'Valid role is required' });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate caller creation form
  static validateCallerForm(formData) {
    const errors = [];
    
    if (!this.isValidName(formData.name)) {
      errors.push({ field: 'name', message: `Name must be between ${FrontendConfig.validation.name.minLength} and ${FrontendConfig.validation.name.maxLength} characters` });
    }
    
    if (!this.isValidEmail(formData.email)) {
      errors.push({ field: 'email', message: `Email must be between ${FrontendConfig.validation.email.minLength} and ${FrontendConfig.validation.email.maxLength} characters and valid format` });
    }
    
    if (!this.isValidPhone(formData.phone)) {
      errors.push({ field: 'phone', message: `Phone must be between ${FrontendConfig.validation.phone.minLength} and ${FrontendConfig.validation.phone.maxLength} digits` });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate login form
  static validateLoginForm(formData) {
    const errors = [];
    
    if (!this.isValidEmail(formData.email)) {
      errors.push({ field: 'email', message: `Email must be between ${FrontendConfig.validation.email.minLength} and ${FrontendConfig.validation.email.maxLength} characters and valid format` });
    }
    
    if (!formData.password || formData.password.trim().length === 0) {
      errors.push({ field: 'password', message: 'Password is required' });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Display validation errors
  static displayErrors(errors, formElement) {
    // Clear previous errors
    formElement.querySelectorAll('.error-message').forEach(el => el.remove());
    formElement.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    
    errors.forEach(error => {
      const field = formElement.querySelector(`[name="${error.field}"]`);
      if (field) {
        field.classList.add('is-invalid');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message text-danger small mt-1';
        errorDiv.textContent = error.message;
        
        field.parentNode.appendChild(errorDiv);
      }
    });
  }

  // Clear validation errors
  static clearErrors(formElement) {
    formElement.querySelectorAll('.error-message').forEach(el => el.remove());
    formElement.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  }

  // Real-time validation for input fields
  static setupRealTimeValidation(formElement) {
    const inputs = formElement.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        this.validateField(input);
      });
      
      input.addEventListener('input', () => {
        if (input.classList.contains('is-invalid')) {
          this.validateField(input);
        }
      });
    });
  }

  // Validate individual field
  static validateField(field) {
    const fieldName = field.name;
    const value = field.value;
    let isValid = true;
    let message = '';
    
    switch (fieldName) {
      case 'name':
        isValid = this.isValidName(value);
        message = `Name must be between ${FrontendConfig.validation.name.minLength} and ${FrontendConfig.validation.name.maxLength} characters`;
        break;
      case 'email':
        isValid = this.isValidEmail(value);
        message = `Email must be between ${FrontendConfig.validation.email.minLength} and ${FrontendConfig.validation.email.maxLength} characters and valid format`;
        break;
      case 'phone':
        isValid = this.isValidPhone(value);
        message = `Phone must be between ${FrontendConfig.validation.phone.minLength} and ${FrontendConfig.validation.phone.maxLength} digits`;
        break;
      case 'password':
        if (value) {
          isValid = this.isValidPassword(value);
          message = `Password must be between ${FrontendConfig.validation.password.minLength} and ${FrontendConfig.validation.password.maxLength} characters with uppercase, lowercase, and number`;
        }
        break;
    }
    
    if (!isValid && value.trim()) {
      field.classList.add('is-invalid');
      this.showFieldError(field, message);
    } else {
      field.classList.remove('is-invalid');
      this.hideFieldError(field);
    }
  }

  // Show field error
  static showFieldError(field, message) {
    let errorDiv = field.parentNode.querySelector('.error-message');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'error-message text-danger small mt-1';
      field.parentNode.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
  }

  // Hide field error
  static hideFieldError(field) {
    const errorDiv = field.parentNode.querySelector('.error-message');
    if (errorDiv) {
      errorDiv.remove();
    }
  }
}

// Export for use in browser
window.ValidationUtils = ValidationUtils;
