/**
 * Test Environment Setup
 * Configures Jest and database for testing
 */

const { connectDB, disconnectDB, clearDatabase } = require('../config/database');
let mongod;
// If running tests, prefer an in-memory MongoDB to avoid external dependencies
if (process.env.NODE_ENV === 'test') {
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    // Defer creation until beforeAll to avoid async at module load
    global.createInMemoryMongoServer = async () => {
      mongod = await MongoMemoryServer.create();
      process.env.MONGO_URI = mongod.getUri();
    };
  } catch (err) {
    // If mongodb-memory-server isn't installed, tests will try to use MONGO_URI
    console.warn('mongodb-memory-server not available, using MONGO_URI if set');
  }
}

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for database operations
jest.setTimeout(30000);

// Global setup - runs once before all tests
beforeAll(async () => {
  console.log('🧪 Setting up test environment...');
  
  // Start in-memory mongo (if available) and connect to test database
  if (global.createInMemoryMongoServer) await global.createInMemoryMongoServer();
  await connectDB();
  
  console.log('✅ Test environment ready');
});

// Global teardown - runs once after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Clear test database
  await clearDatabase();
  
  // Disconnect from database
  await disconnectDB();
  if (mongod) await mongod.stop();
  
  console.log('✅ Test environment cleaned up');
});

// Clear database before each test
beforeEach(async () => {
  await clearDatabase();
});

/**
 * Helper: Create test user
 */
global.createTestUser = async (overrides = {}) => {
  const User = require('../models/User');
  
  const userData = {
    email: 'test@example.com',
    password: 'Test1234',
    firstName: 'Test',
    lastName: 'User',
    dateOfBirth: new Date('1990-01-01'),
    ...overrides
  };
  
  const user = new User(userData);
  await user.save();
  
  return user;
};

/**
 * Helper: Create authenticated request
 */
global.createAuthToken = (userId) => {
  const jwt = require('jsonwebtoken');
  const config = require('../config/environment');
  
  return jwt.sign({ userId }, config.jwt.secret, {
    expiresIn: '1h'
  });
};

/**
 * Helper: Mock Cloudinary upload
 */
global.mockCloudinaryUpload = () => {
  jest.mock('cloudinary', () => ({
    v2: {
      config: jest.fn(),
      uploader: {
        upload: jest.fn().mockResolvedValue({
          secure_url: 'https://cloudinary.com/test-image.jpg',
          public_id: 'test-public-id'
        }),
        destroy: jest.fn().mockResolvedValue({ result: 'ok' })
      }
    }
  }));
};

/**
 * Helper: Mock reCAPTCHA verification
 */
global.mockRecaptcha = (shouldPass = true) => {
  // Use spyOn to avoid referencing out-of-scope vars inside jest.mock factory
  const axios = require('axios');
  if (axios && axios.post && jest.isMockFunction(axios.post)) {
    axios.post.mockResolvedValue({ data: { success: shouldPass, score: shouldPass ? 0.9 : 0.3 } });
  } else {
    // If axios.post is not yet mocked, spy on it
    jest.spyOn(axios, 'post').mockResolvedValue({ data: { success: shouldPass, score: shouldPass ? 0.9 : 0.3 } });
  }
};