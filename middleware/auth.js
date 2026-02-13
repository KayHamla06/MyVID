const axios = require('axios');

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

/**
 * Protect routes - verify JWT token
 */
exports.protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};
