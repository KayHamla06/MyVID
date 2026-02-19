/**
 * Environment Configuration
 * Centralized environment variable management with validation
 */

const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Determine current environment
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate required environment variables
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

// Only require reCAPTCHA in production
// reCAPTCHA temporarily disabled - commented out requirement
/* DISABLED - KEPT FOR RE-ENABLING
if (NODE_ENV === 'production') {
  requiredEnvVars.push('RECAPTCHA_SITE_KEY', 'RECAPTCHA_SECRET_KEY');
}
*/

// Validate environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  if (NODE_ENV === 'production') {
    process.exit(1);
  }
}

/**
 * Get MongoDB URI based on environment
 * Test, Development, and Production use separate databases
 */
const getMongoURI = () => {
  const baseURI = process.env.MONGO_URI;

  if (!baseURI) {
    throw new Error('MONGO_URI environment variable is required');
  }

  // Determine database name based on environment
  let dbName;
  switch (NODE_ENV) {
  case 'test':
    dbName = process.env.MONGO_TEST_DB || 'SafePassID_Test';
    break;
  case 'development':
    dbName = process.env.MONGO_DEV_DB || 'SafePassID_Dev';
    break;
  case 'production':
    dbName = process.env.MONGO_PROD_DB || 'SafePassID';
    break;
  default:
    dbName = 'SafePassID_Dev';
  }

  // Construct URI: remove trailing slash and append database name
  const cleanURI = baseURI.endsWith('/') ? baseURI.slice(0, -1) : baseURI;
  const finalURI = `${cleanURI}/${dbName}`;

  console.log(`🗄️  MongoDB URI constructed: ${finalURI}`);

  return finalURI;
};

/**
 * Get base URL for the application
 * Used for QR code generation and redirects
 */
const getBaseURL = () => {
  // Production: use BASE_URL environment variable
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.replace(/\/$/, ''); // Remove trailing slash
  }

  // Development fallback
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}`;
};

/**
 * Environment Configuration Object
 */
const config = {
  // Environment
  env: NODE_ENV,
  isDevelopment: NODE_ENV === 'development',
  isProduction: NODE_ENV === 'production',
  isTest: NODE_ENV === 'test',

  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  baseURL: getBaseURL(),

  // Database
  mongodb: {
    uri: getMongoURI(),
    options: {
      maxPoolSize: NODE_ENV === 'production' ? 10 : 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    }
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    algorithm: 'HS256'
  },

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },

  // reCAPTCHA
  // ⚠️ reCAPTCHA TEMPORARILY DISABLED - EVERYWHERE (dev, staging, production)
  recaptcha: {
    siteKey: process.env.RECAPTCHA_SITE_KEY || '',
    secretKey: process.env.RECAPTCHA_SECRET_KEY || '',
    enabled: false, // DISABLED FOR ALL ENVIRONMENTS - change to NODE_ENV === 'production' to re-enable for production only
    scoreThreshold: parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD || '0.5')
  },

  // Security
  security: {
    bcryptRounds: 12,
    maxLoginAttempts: 5,
    lockoutDuration: 30 * 60 * 1000, // 30 minutes
    passwordResetExpiry: 30 * 60 * 1000, // 30 minutes
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: NODE_ENV === 'production' ? 100 : 1000
  },

  // File Upload
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug'),
    prettyPrint: NODE_ENV !== 'production'
  }
};

// Log configuration (non-sensitive info only)
if (NODE_ENV !== 'test') {
  console.log('🔧 Environment Configuration:');
  console.log(`   - Environment: ${config.env}`);
  console.log(`   - Base URL: ${config.baseURL}`);
  console.log(`   - Database: ${config.mongodb.uri.split('@')[1]?.split('/')[1] || 'configured'}`);
  console.log(`   - reCAPTCHA: ${config.recaptcha.enabled ? 'enabled' : 'disabled'}`);
}

module.exports = config;
