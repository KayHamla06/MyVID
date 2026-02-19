/**
 * Security Middleware Suite
 * Centralized security configuration and middleware
 */

const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const { rateLimiter, authRateLimiter } = require('./rateLimiter');
const { sanitizeInput, validateInput } = require('./validator');
const config = require('../config/environment');

/**
 * Apply all security middleware to Express app
 */
const applySecurity = (app) => {
  // Helmet - Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://www.google.com/recaptcha/',
          'https://www.gstatic.com/recaptcha/'
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'"],
        frameSrc: ['https://www.google.com/recaptcha/'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: config.isProduction ? [] : null
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));

  // CORS Configuration
  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        config.baseURL,
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000'
      ];

      // In production, add your production URLs
      if (config.isProduction) {
        allowedOrigins.push(
          process.env.BASE_URL,
          /\.onrender\.com$/,
          /safepassid\.co\.za$/
        );
      }

      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return allowed === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200
  };

  app.use(cors(corsOptions));

  // MongoDB Injection Protection
  app.use(mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`⚠️ Sanitized potentially malicious input: ${key}`);
    }
  }));

  // Global Rate Limiting
  app.use(rateLimiter);

  // Log security middleware applied
  if (config.env !== 'test') {
    console.log('🛡️  Security middleware applied');
  }
};

/**
 * Apply authentication-specific rate limiting
 */
const applyAuthSecurity = (router) => {
  router.use(authRateLimiter);
};

module.exports = {
  applySecurity,
  applyAuthSecurity,
  sanitizeInput,
  validateInput
};
