/**
 * Input Validation and Sanitization
 * Protects against XSS, injection attacks, and malformed data
 */

const validator = require('validator');

/**
 * Sanitize string input
 * Removes potentially harmful characters
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;

  // Trim whitespace
  str = str.trim();

  // Escape HTML to prevent XSS
  str = validator.escape(str);

  return str;
};

/**
 * Sanitize object recursively
 * Cleans all string values in nested objects
 */
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
};

/**
 * Middleware: Sanitize request body, query, and params
 */
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return validator.isEmail(email);
};

/**
 * Validate password strength
 */
const isValidPassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain lowercase letters' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain uppercase letters' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain numbers' };
  }

  return { valid: true };
};

/**
 * Validate phone number
 */
const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;

  // Remove common separators
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Check if it's a valid phone number (basic validation)
  return /^\+?[1-9]\d{1,14}$/.test(cleaned);
};

/**
 * Validate ObjectId (MongoDB)
 */
const isValidObjectId = (id) => {
  if (!id) return false;
  return validator.isMongoId(id.toString());
};

/**
 * Validate URL
 */
const isValidURL = (url) => {
  if (!url || typeof url !== 'string') return false;
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true
  });
};

/**
 * Validate date
 */
const isValidDate = (date) => {
  if (!date) return false;
  const parsed = new Date(date);
  return parsed instanceof Date && !isNaN(parsed);
};

/**
 * Validate date is in the past
 */
const isDateInPast = (date) => {
  if (!isValidDate(date)) return false;
  return new Date(date) < new Date();
};

/**
 * Validation schemas for common inputs
 */
const schemas = {
  signup: (data) => {
    const errors = [];

    if (!data.email || !isValidEmail(data.email)) {
      errors.push('Valid email is required');
    }

    const passwordCheck = isValidPassword(data.password);
    if (!passwordCheck.valid) {
      errors.push(passwordCheck.message);
    }

    if (data.password !== data.confirmPassword) {
      errors.push('Passwords do not match');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  login: (data) => {
    const errors = [];

    if (!data.email || !isValidEmail(data.email)) {
      errors.push('Valid email is required');
    }

    if (!data.password) {
      errors.push('Password is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  forgotPassword: (data) => {
    const errors = [];

    if (!data.email || !isValidEmail(data.email)) {
      errors.push('Valid email is required');
    }

    if (!data.firstName || !data.lastName) {
      errors.push('Full name is required');
    }

    if (!data.dateOfBirth || !isValidDate(data.dateOfBirth)) {
      errors.push('Valid date of birth is required');
    }

    if (!data.emergencyContactName || !data.emergencyContactPhone) {
      errors.push('Emergency contact information is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  resetPassword: (data) => {
    const errors = [];

    if (!data.token) {
      errors.push('Reset token is required');
    }

    const passwordCheck = isValidPassword(data.password);
    if (!passwordCheck.valid) {
      errors.push(passwordCheck.message);
    }

    if (data.password !== data.confirmPassword) {
      errors.push('Passwords do not match');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
};

/**
 * Middleware: Validate input against schema
 */
const validateInput = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];

    if (!schema) {
      console.error(`Validation schema '${schemaName}' not found`);
      return next();
    }

    const validation = schema(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    next();
  };
};

module.exports = {
  sanitizeInput,
  sanitizeString,
  sanitizeObject,
  isValidEmail,
  isValidPassword,
  isValidPhone,
  isValidObjectId,
  isValidURL,
  isValidDate,
  isDateInPast,
  validateInput,
  schemas
};
