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

module.exports = router;
