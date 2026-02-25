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
const { signupLimiter, loginLimiter, passwordResetLimiter } = require('../middleware/Ratelimiter');

/**
 * @route   POST /api/auth/signup
 * @desc    Register new user with password confirmation and reCAPTCHA
 * @access  Public
 * @security Strict rate limiting (10 per hour) + reCAPTCHA validation
 */
router.post('/signup', signupLimiter, validateRecaptcha, signup);

/**
 * @route   POST /api/auth/login
 * @desc    Login user with secure password verification
 * @access  Public
 * @security Strict rate limiting (5 per 15min), prevents brute force attacks
 */
router.post('/login', loginLimiter, login);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Verify identity and initiate password reset
 * @access  Public
 * @security Very strict rate limiting (3 per hour), prevents enumeration attacks
 */
router.post('/forgot-password', passwordResetLimiter, forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 * @security Must provide valid reset token, rate limited
 */
router.post('/reset-password', passwordResetLimiter, resetPassword);

/**
 * @route   GET /api/auth/logout
 * @desc    Logout user and invalidate session
 * @access  Public
 */
router.get('/logout', logout);

module.exports = router;
