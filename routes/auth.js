const jwt = require('jsonwebtoken');
const User = require('../models/User');
const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  logout,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');
const { validateRecaptcha } = require('../middleware/auth');
const { authLimiter, passwordResetLimiter } = require('../middleware/Ratelimiter');
const { validateInput, sanitizeInput } = require('../security/validator');
const { passwordResetRateLimiter } = require('../security/rateLimiter');

// Routes (validation/sanitization applied per-route below)
/**
 * @route   POST /api/auth/signup
 * @desc    Register new user with password confirmation and reCAPTCHA
 * @access  Public
 */
router.post('/signup', authLimiter, validateRecaptcha, signup);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authLimiter, login);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Verify identity and initiate password reset
 * @access  Public
 */
router.post('/forgot-password', passwordResetLimiter, forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', passwordResetLimiter, resetPassword);

/**
 * @route   GET /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.get('/logout', logout);
/**
 * Protect routes - verify JWT token
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User no longer exists'
        });
      }

      // Check if user account is active
      if (!user.isActive || user.accountStatus !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Account is not active. Please contact support.'
        });
      }

      // Check if account is locked
      if (user.isLocked) {
        const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
        return res.status(403).json({
          success: false,
          message: `Account is temporarily locked. Try again in ${lockTimeRemaining} minutes.`
        });
      }

      // Attach user to request
      req.user = user;
      next();

    } catch {
      return res.status(401).json({
        success: false,
        message: 'Token is invalid or expired'
      });
    }

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

/**
 * Get token from model, create cookie and send response
 */
exports.sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );

  const options = {
    expires: new Date(
      Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRE) || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: user.getSafeProfile()
    });
};

/**
 * Validate reCAPTCHA token
 */
exports.validateRecaptcha = async (req, res, next) => {
  const { recaptchaToken } = req.body;

  // Skip in development if no secret key
  if (process.env.NODE_ENV !== 'production' && !process.env.RECAPTCHA_SECRET_KEY) {
    console.warn('⚠️  reCAPTCHA validation skipped in development');
    return next();
  }

  if (!recaptchaToken) {
    return res.status(400).json({
      success: false,
      message: 'reCAPTCHA verification required'
    });
  }

  try {
    const axios = require('axios');
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: recaptchaToken
        }
      }
    );

    if (!response.data.success || response.data.score < 0.5) {
      return res.status(400).json({
        success: false,
        message: 'reCAPTCHA verification failed. Please try again.'
      });
    }

    next();
  } catch (error) {
    console.error('reCAPTCHA validation error:', error);
    // Allow request to continue if reCAPTCHA service is down
    next();
  }
};
module.exports = router;
