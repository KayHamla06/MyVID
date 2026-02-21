const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
/**
 * Authentication Controller
 * Handles all authentication logic with security best practices
 */

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ========================
// reCAPTCHA TEMPORARILY DISABLED - EVERYWHERE (dev, staging, production)
// ========================
// Verify Google reCAPTCHA v3
const verifyRecaptcha = async (token) => {
  // reCAPTCHA verification temporarily disabled for all environments
  // This disables bot protection in: development, staging, AND production
  // To re-enable, uncomment the code below
  console.warn('⚠️  reCAPTCHA verification disabled EVERYWHERE (temporarily)');
  return true;
  
  /* DISABLED CODE - KEPT FOR RE-ENABLING
  try {
    // Only verify in production
    if (process.env.NODE_ENV !== 'production') return true;

    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: token
        }
      }
    );

    // reCAPTCHA v3 returns a score between 0 and 1
    // 0.5 is a reasonable threshold
    return response.data.success && response.data.score >= 0.5;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    // In production, you might want to fail closed (return false)
    // For development, you might want to fail open
    return process.env.NODE_ENV !== 'production';
  }
  */
};

/**
 * SIGNUP
 * Creates new user account with security validation
 */
exports.signup = async (req, res) => {
  try {
    const {
      email,
      password,
      confirmPassword,
      firstName,
      lastName
    } = req.body;

    // Validate required fields
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, password, and password confirmation'
      });
    }

    // Verify passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain uppercase, lowercase, and numbers'
      });
    }

    // reCAPTCHA TEMPORARILY DISABLED - verification skipped
    /* DISABLED CODE - KEPT FOR RE-ENABLING
    if (recaptchaToken) {
      const isHuman = await verifyRecaptcha(recaptchaToken);
      if (!isHuman) {
        return res.status(400).json({
          success: false,
          message: 'reCAPTCHA verification failed. Please try again.'
        });
      }
    } else if (process.env.NODE_ENV === 'production') {
      return res.status(400).json({
        success: false,
        message: 'reCAPTCHA verification required'
      });
    }
    */

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      password, // Will be hashed by pre-save hook
      firstName,
      lastName
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });

  } catch (error) {
    console.error('Signup error:', error);

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Account creation failed. Please try again.'
    });
  }
};

/**
 * LOGIN
 * Authenticates user with email/phone number and password
 */
exports.login = async (req, res) => {
  try {
    const { loginIdentifier, password } = req.body;

    // Validate input
    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email or phone number and password'
      });
    }

    // Detect login type (email vs phone)
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginIdentifier);
    const isPhone = /^[\d\s\-\+\(\)]{10,}$/.test(loginIdentifier.trim());

    if (!isEmail && !isPhone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address or phone number'
      });
    }

    // reCAPTCHA TEMPORARILY DISABLED - verification skipped
    /* DISABLED CODE - KEPT FOR RE-ENABLING
    if (recaptchaToken) {
      const isHuman = await verifyRecaptcha(recaptchaToken);
      if (!isHuman) {
        return res.status(400).json({
          success: false,
          message: 'reCAPTCHA verification failed. Please try again.'
        });
      }
    }
    */

    // Find user by email or phone number
    let user;
    if (isEmail) {
      user = await User.findOne({ email: loginIdentifier.toLowerCase() });
    } else {
      user = await User.findOne({ phoneNumber: loginIdentifier.trim() });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${lockTimeRemaining} minutes.`,
        locked: true,
        lockUntil: user.lockUntil
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Increment failed login attempts
      await user.incLoginAttempts();

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Generate token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        phoneNumber: user.phoneNumber || null,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePhoto: user.profilePhoto
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

/**
 * FORGOT PASSWORD - Step 1: Identity Verification
 * Verifies user identity before allowing password reset
 * Includes rate limiting and detailed field validation
 */
exports.forgotPassword = async (req, res) => {
  try {
    const {
      email,
      firstName,
      lastName,
      dateOfBirth,
      emergencyContactName,
      emergencyContactPhone
    } = req.body;

    // Validate required fields
    if (!email || !firstName || !lastName || !dateOfBirth || !emergencyContactName || !emergencyContactPhone) {
      return res.status(400).json({
        success: false,
        message: 'All identity verification fields are required'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if email exists for security
      return res.status(400).json({
        success: false,
        message: 'The information provided does not match our records. Please verify your details and try again.',
        failedField: 'email'
      });
    }

    // Check if password reset is locked due to too many attempts
    if (user.isPasswordResetLocked) {
      const lockTimeRemaining = Math.ceil((user.passwordResetLockUntil - Date.now()) / 1000 / 60);
      return res.status(429).json({
        success: false,
        message: `Too many failed verification attempts. Please try again in ${lockTimeRemaining} minutes.`,
        locked: true,
        lockUntil: user.passwordResetLockUntil
      });
    }

    // Verify identity - now returns { success, failedField }
    const verificationResult = user.verifyIdentity({
      firstName,
      lastName,
      dateOfBirth,
      emergencyContactName,
      emergencyContactPhone
    });

    if (!verificationResult.success) {
      // Increment failed attempts
      await user.incPasswordResetAttempts();
      
      // Provide specific feedback about which field failed
      const fieldMessages = {
        firstName: 'The first name does not match our records.',
        lastName: 'The last name does not match our records.',
        dateOfBirth: 'The date of birth does not match our records.',
        emergencyContact: 'The emergency contact information does not match our records.'
      };

      const attemptsRemaining = 5 - (user.passwordResetAttempts + 1);
      
      return res.status(400).json({
        success: false,
        message: fieldMessages[verificationResult.failedField] || 'Identity verification failed.',
        failedField: verificationResult.failedField,
        attemptsRemaining: Math.max(0, attemptsRemaining),
        hint: attemptsRemaining <= 2 ? 'Please double-check your information carefully.' : undefined
      });
    }

    // Reset attempts on successful verification
    await user.resetPasswordResetAttempts();

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Save hashed token and expiry
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save();

    // Return token (in production, this would be sent via email/SMS)
    res.json({
      success: true,
      message: 'Identity verified successfully. You may now reset your password.',
      resetToken, // In production, don't send this in response - send via email
      userId: user._id
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset request failed. Please try again.'
    });
  }
};

/**
 * RESET PASSWORD - Step 2: Set New Password
 * Resets password using verified token
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    // Validate input
    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and passwords are required'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Hash token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired'
      });
    }

    // Set new password (will be hashed by pre-save hook)
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    // Reset login attempts
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    await user.save();

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed. Please try again.'
    });
  }
};

/**
 * VERIFY TOKEN
 * Validates JWT token and returns user data
 */
exports.verifyToken = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePhoto: user.profilePhoto
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
};
/**
 * @route   GET /api/auth/logout
 * @desc    Logout user and clear cookie
 * @access  Private
 */
exports.logout = async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};


module.exports = exports;
