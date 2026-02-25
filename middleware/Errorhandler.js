/**
 * Error Handler Middleware - Production-safe error responses
 * Never exposes internal details or stack traces to clients
 */
exports.errorHandler = (err, req, res, _next) => {
  const crypto = require('crypto');
  const errorId = crypto.randomUUID();
  const isDev = process.env.NODE_ENV === 'development';
  
  // Safe error logging (internally only)
  if (isDev) {
    console.error(`[ERROR-${errorId}]`, err);
  } else {
    // Production: log safely without stack traces
    console.error(`[ERROR-${errorId}] ${err.name}: ${err.message}`);
  }

  // Prevent error response if headers already sent
  if (res.headersSent) {
    return;
  }

  // Determine status code
  let statusCode = 500;
  
  if (err.statusCode) {
    statusCode = err.statusCode;
  } else if (err.status) {
    statusCode = err.status;
  } else if (err.code === 11000) {
    statusCode = 400;
  } else if (err.name === 'CastError') {
    statusCode = 400;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
  }

  // Build safe response - no internal details exposed
  const response = {
    success: false,
    message: getClientMessage(statusCode, isDev, err),
    ...(isDev && { errorId }) // Error ID for dev troubleshooting
  };

  res.status(statusCode).json(response);
};

/**
 * Get safe client message based on error type
 */
function getClientMessage(statusCode, isDev, err) {
  // Safe messages for production
  const safeMessages = {
    400: 'Invalid request. Please check your input.',
    401: 'Unauthorized. Please log in.',
    403: 'Access denied.',
    404: 'Resource not found.',
    429: 'Too many requests. Please try again later.',
    500: 'Server error. Please try again later.',
    503: 'Service unavailable. Please try again later.'
  };

  // In development, expose some error details for debugging
  if (isDev && err.message) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)?.[0] || 'field';
      return `${field} already exists`;
    }
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors)
        .map(e => e.message)
        .join(', ');
      return errors || 'Validation failed';
    }
    if (err.name === 'CastError') {
      return 'Invalid resource ID';
    }
  }

  // Return safe message
  return safeMessages[statusCode] || 'An error occurred';
}

/**
 * 404 handler - Route not found
 */
exports.notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
};
