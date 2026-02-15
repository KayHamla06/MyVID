const mongoose = require('mongoose');

// Cache mongoose connection in global to prevent multiple connections
const globalAny = global;
if (!globalAny._mongoose) globalAny._mongoose = { conn: null, promise: null };

const connectDB = async () => {
  // Re-read config each call so tests can mutate process.env between cases
  const config = require('./environment');

  if (globalAny._mongoose.conn) return globalAny._mongoose.conn;

  if (!globalAny._mongoose.promise) {
    globalAny._mongoose.promise = mongoose
      .connect(config.mongodb.uri, config.mongodb.options)
      .then((m) => m.connection);
  }

  globalAny._mongoose.conn = await globalAny._mongoose.promise;

  mongoose.connection.on('error', (err) => {
    console.error(`❌ MongoDB connection error: ${err}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected');
  });

  return globalAny._mongoose.conn;
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

module.exports = { connectDB, disconnectDB, clearDatabase, getConnectionStatus, healthCheck };
