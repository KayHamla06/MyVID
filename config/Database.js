const mongoose = require('mongoose');

// Cache mongoose connection in global to prevent multiple connections
const globalAny = global;
if (!globalAny._mongoose) globalAny._mongoose = { conn: null, promise: null };

// Connection retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const connectDB = async (retryCount = 0) => {
  // Re-read config each call so tests can mutate process.env between cases
  const config = require('./environment');

  if (globalAny._mongoose.conn && mongoose.connection.readyState === 1) {
    return globalAny._mongoose.conn;
  }

  // Reset if previous connection failed
  if (mongoose.connection.readyState === 0 && globalAny._mongoose.promise) {
    globalAny._mongoose.promise = null;
    globalAny._mongoose.conn = null;
  }

  if (!globalAny._mongoose.promise) {
    globalAny._mongoose.promise = mongoose
      .connect(config.mongodb.uri, config.mongodb.options)
      .then((m) => {
        console.log('✅ MongoDB connected successfully');
        return m.connection;
      })
      .catch(async (error) => {
        globalAny._mongoose.promise = null;
        globalAny._mongoose.conn = null;
        
        if (retryCount < MAX_RETRIES) {
          console.warn(`⚠️  MongoDB connection failed. Retrying in ${RETRY_DELAY/1000}s... (${retryCount + 1}/${MAX_RETRIES})`);
          await sleep(RETRY_DELAY);
          return connectDB(retryCount + 1);
        }
        
        console.error(`❌ MongoDB connection failed after ${MAX_RETRIES} retries:`, error.message);
        throw error;
      });
  }

  globalAny._mongoose.conn = await globalAny._mongoose.promise;

  mongoose.connection.on('error', (err) => {
    console.error(`❌ MongoDB connection error: ${err}`);
    globalAny._mongoose.conn = null;
    globalAny._mongoose.promise = null;
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected');
    globalAny._mongoose.conn = null;
    globalAny._mongoose.promise = null;
  });

  return globalAny._mongoose.conn;
};

// Middleware to ensure DB connection before operations
const ensureConnection = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    next();
  } catch (error) {
    console.error('Database connection check failed:', error.message);
    res.status(503).json({
      success: false,
      message: 'Database temporarily unavailable. Please try again later.'
    });
  }
};

const disconnectDB = async () => {
  if (globalAny._mongoose.conn) {
    await mongoose.connection.close();
    globalAny._mongoose.conn = null;
    globalAny._mongoose.promise = null;
  }
};

const clearDatabase = async () => {
  // Check runtime NODE_ENV so tests can toggle it
  if (process.env.NODE_ENV !== 'test') throw new Error('clearDatabase may only be used in test environment');
  const collections = mongoose.connection.collections;
  const promises = [];
  for (const key in collections) promises.push(collections[key].deleteMany({}));
  await Promise.all(promises);
};

const getConnectionStatus = () => {
  const state = mongoose.connection.readyState;
  return { isConnected: state === 1, readyState: state, dbName: mongoose.connection.name };
};

const healthCheck = async () => {
  const status = getConnectionStatus();
  return status.isConnected ? { healthy: true, message: 'Connected', database: status.dbName } : { healthy: false, message: 'Not connected' };
};

module.exports = { connectDB, disconnectDB, clearDatabase, getConnectionStatus, healthCheck, ensureConnection };
