/**
 * SafePass ID - Global Utilities
 * Button loading states, API helpers, and common functions
 */

// API Base URL
const API_BASE = window.location.origin;

/**
 * BUTTON LOADING STATE MANAGER
 * Handles loading states for all buttons globally
 */
class ButtonLoader {
  constructor(button) {
    this.button = button;
    this.originalText = button.innerHTML;
    this.originalDisabled = button.disabled;
  }
  
  start(loadingText = 'Loading...') {
    // Disable button
    this.button.disabled = true;
    this.button.classList.add('loading');
    
    // Create spinner
    const spinner = document.createElement('span');
    spinner.className = 'button-spinner';
    spinner.innerHTML = `
      <svg class="spinner-icon" viewBox="0 0 50 50">
        <circle class="spinner-path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
      </svg>
      <span class="spinner-text">${loadingText}</span>
    `;
    
    // Replace content with spinner
    this.button.innerHTML = '';
    this.button.appendChild(spinner);
  }
  
  stop() {
    // Re-enable button
    this.button.disabled = this.originalDisabled;
    this.button.classList.remove('loading');
    
    // Restore original content
    this.button.innerHTML = this.originalText;
  }
  
  error(errorText = 'Error') {
    this.button.classList.remove('loading');
    this.button.classList.add('error');
    this.button.innerHTML = `❌ ${errorText}`;
    
    // Reset after 3 seconds
    setTimeout(() => {
      this.stop();
      this.button.classList.remove('error');
    }, 3000);
  }
  
  success(successText = 'Success') {
    this.button.classList.remove('loading');
    this.button.classList.add('success');
    this.button.innerHTML = `✓ ${successText}`;
    
    // Reset after 2 seconds
    setTimeout(() => {
      this.stop();
      this.button.classList.remove('success');
    }, 2000);
  }
}

/**
 * API REQUEST HELPER
 * Makes API requests with automatic error handling and loading states
 */
async function apiRequest(url, options = {}, button = null) {
  let loader = null;
  
  // Start button loading if button provided
  if (button) {
    loader = new ButtonLoader(button);
    loader.start(options.loadingText);
  }
  
  try {
    // Get auth token if exists
    const token = localStorage.getItem('token');
    
    // Set default headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    // Add authorization if token exists
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    // Make request
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers
    });
    
    // Parse response
    const data = await response.json();
    
    // Handle response
    if (response.ok && data.success !== false) {
      if (loader) {
        if (options.successText) {
          loader.success(options.successText);
        } else {
          loader.stop();
        }
      }
      return { success: true, data };
    } else {
      // API error
      if (loader) {
        loader.error();
      }
      
      // Show error notification
      showNotification(data.message || 'An error occurred', 'error');
      
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
      
      return { success: false, error: data.message, data };
    }
    
  } catch (error) {
    console.error('API Request Error:', error);
    
    if (loader) {
      loader.error();
    }
    
    showNotification('Network error. Please check your connection.', 'error');
    
    return { success: false, error: error.message };
  }
}

/**
 * NOTIFICATION SYSTEM
 * Shows toast notifications to the user
 */
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existing = document.querySelectorAll('.toast-notification');
  existing.forEach(n => n.remove());
  
  // Create notification
  const notification = document.createElement('div');
  notification.className = `toast-notification toast-${type}`;
  
  // Icon based on type
  let icon = 'ℹ️';
  if (type === 'success') icon = '✓';
  if (type === 'error') icon = '✗';
  if (type === 'warning') icon = '⚠';
  
  notification.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-message">${message}</div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => notification.classList.add('show'), 10);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

/**
 * FORM VALIDATION
 * Validates form inputs with visual feedback
 */
function validateForm(formElement) {
  let isValid = true;
  
  // Get all required inputs
  const inputs = formElement.querySelectorAll('[required]');
  
  inputs.forEach(input => {
    const value = input.value.trim();
    
    // Remove previous error
    input.classList.remove('input-error');
    const errorDiv = input.parentElement.querySelector('.field-error');
    if (errorDiv) errorDiv.remove();
    
    // Check if empty
    if (!value) {
      isValid = false;
      showFieldError(input, 'This field is required');
      return;
    }
    
    // Email validation
    if (input.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        isValid = false;
        showFieldError(input, 'Please enter a valid email');
      }
    }
    
    // Password validation
    if (input.type === 'password' && input.id === 'password') {
      if (value.length < 8) {
        isValid = false;
        showFieldError(input, 'Password must be at least 8 characters');
      }
    }
    
    // Password confirmation
    if (input.id === 'confirmPassword') {
      const password = formElement.querySelector('#password').value;
      if (value !== password) {
        isValid = false;
        showFieldError(input, 'Passwords do not match');
      }
    }
  });
  
  return isValid;
}

function showFieldError(input, message) {
  input.classList.add('input-error');
  
  const error = document.createElement('div');
  error.className = 'field-error';
  error.textContent = message;
  
  input.parentElement.appendChild(error);
  
  // Shake animation
  input.classList.add('shake');
  setTimeout(() => input.classList.remove('shake'), 500);
}

/**
 * AUTH HELPERS
 * Check if user is authenticated
 */
function isAuthenticated() {
  return !!localStorage.getItem('token');
}

function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = '/login';
    return false;
  }
  return true;
}

function logout() {
  localStorage.removeItem('token');
  showNotification('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = '/';
  }, 1000);
}

/**
 * FILE UPLOAD HELPER
 * Handles file uploads with progress
 */
async function uploadFile(file, button = null) {
  const formData = new FormData();
  formData.append('photo', file);
  
  let loader = null;
  if (button) {
    loader = new ButtonLoader(button);
    loader.start('Uploading...');
  }
  
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE}/api/user/upload-photo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      if (loader) loader.success('Uploaded!');
      return { success: true, data };
    } else {
      if (loader) loader.error();
      showNotification(data.message || 'Upload failed', 'error');
      return { success: false, error: data.message };
    }
    
  } catch (error) {
    console.error('Upload error:', error);
    if (loader) loader.error();
    showNotification('Upload failed. Please try again.', 'error');
    return { success: false, error: error.message };
  }
}

/**
 * DATE FORMATTING
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

/**
 * RECAPTCHA HELPER
 * Gets reCAPTCHA token for form submission
 */
async function getRecaptchaToken(action = 'submit') {
  if (typeof grecaptcha === 'undefined') {
    console.warn('reCAPTCHA not loaded');
    return null;
  }
  
  try {
    const token = await grecaptcha.execute(
      window.RECAPTCHA_SITE_KEY, 
      { action }
    );
    return token;
  } catch (error) {
    console.error('reCAPTCHA error:', error);
    return null;
  }
}

/**
 * DEBOUNCE
 * Limits function execution rate
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Export for use in other scripts
window.ButtonLoader = ButtonLoader;
window.apiRequest = apiRequest;
window.showNotification = showNotification;
window.validateForm = validateForm;
window.isAuthenticated = isAuthenticated;
window.requireAuth = requireAuth;
window.logout = logout;
window.uploadFile = uploadFile;
window.formatDate = formatDate;
window.getRecaptchaToken = getRecaptchaToken;
window.debounce = debounce;