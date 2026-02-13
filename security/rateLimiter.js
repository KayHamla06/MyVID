/**
 * Rate Limiting Configuration
 * Prevents brute force and DDoS attacks
 */

const rateLimit = require('express-rate-limit');
const config = require('../config/environment');

/**
 * Global API Rate Limiter
 * Applied to all routes
 */
const rateLimiter = rateLimit({
  windowMs: config.security.rateLimitWindow, // 15 minutes
  max: config.security.rateLimitMax, // requests per window
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in test environment
    return config.isTest;
  },
  handler: (req, res) => {
    console.warn(`⚠️ Rate limit exceeded: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(config.security.rateLimitWindow / 1000 / 60) // minutes
    });
  }
});

/**
 * Strict Rate Limiter for Authentication Routes
 * Prevents brute force login attempts
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.isProduction ? 5 : 20, // Stricter in production
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => config.isTest,
  handler: (req, res) => {
    console.warn(`⚠️ Auth rate limit exceeded: ${req.ip} - ${req.path}`);
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again in 15 minutes.',
      retryAfter: 15
    });
  }
});

/**
 * File Upload Rate Limiter
 * Prevents abuse of file upload endpoints
 */
const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: config.isProduction ? 10 : 50,
  message: {
    success: false,
    message: 'Too many file uploads. Please try again later.'
  },
  skip: (req) => config.isTest,
  handler: (req, res) => {
    console.warn(`⚠️ Upload rate limit exceeded: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Upload limit exceeded. Please try again in an hour.'
    });
  }
});

/**
 * Password Reset Rate Limiter
 * Prevents password reset spam
 */
const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: config.isProduction ? 3 : 10,
  message: {
    success: false,
    message: 'Too many password reset requests.'
  },
  skip: (req) => config.isTest,
  handler: (req, res) => {
    console.warn(`⚠️ Password reset limit exceeded: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many password reset attempts. Please try again in an hour.'
    });
  }
});

module.exports = {
  rateLimiter,
  authRateLimiter,
  uploadRateLimiter,
  passwordResetRateLimiter
};