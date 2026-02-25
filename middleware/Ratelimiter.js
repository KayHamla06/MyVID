const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter - All endpoints
 * Default: 100 requests per 15 minutes
 */
exports.apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.ip || req.connection.remoteAddress || '0.0.0.0'
});

/**
 * Login rate limiter - Strict limit to prevent brute force
 * 5 attempts per 15 minutes per IP
 */
exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.ip || req.connection.remoteAddress || '0.0.0.0',
  skipSuccessfulRequests: false, // Count both successful and failed
  skipFailedRequests: false
});

/**
 * Signup rate limiter - Prevent account creation spam
 * 10 attempts per hour per IP
 */
exports.signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    message: 'Too many signup attempts. Please try again in 1 hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.ip || req.connection.remoteAddress || '0.0.0.0',
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});

/**
 * Password reset limiter - Very strict
 * 3 attempts per hour per IP
 */
exports.passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again in 1 hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.ip || req.connection.remoteAddress || '0.0.0.0',
  skip: () => process.env.NODE_ENV !== 'production'
});

/**
 * QR Scan rate limiter - Prevent QR endpoint abuse
 * 30 scans per minute per IP
 */
exports.qrScanLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    success: false,
    message: 'Too many QR scans. Please try again in 1 minute.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.ip || req.connection.remoteAddress || '0.0.0.0'
});

/**
 * Upload limiter - Prevent upload spam
 * 10 uploads per 15 minutes per IP
 */
exports.uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many uploads. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.ip || req.connection.remoteAddress || '0.0.0.0'
});
