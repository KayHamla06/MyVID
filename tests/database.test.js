/**
 * Database Connection Tests
 * Tests for MongoDB connection management
 */

const {
  connectDB,
  disconnectDB,
  clearDatabase,
  getConnectionStatus,
  healthCheck
} = require('../config/database');
const mongoose = require('mongoose');

describe('Database Connection', () => {

  describe('connectDB()', () => {
    it('should connect to test database', async () => {
      await connectDB();

      const status = getConnectionStatus();
      expect(status.isConnected).toBe(true);
      expect(status.readyState).toBe(1); // 1 = connected
      expect(status.dbName).toContain('Test');
    });

    it('should use singleton pattern (no duplicate connections)', async () => {
      // Connect multiple times
      await connectDB();
      await connectDB();
      await connectDB();

      // Should still have only one connection
      expect(mongoose.connections.length).toBeLessThanOrEqual(2); // Default + our connection
    });

    it('should handle connection errors gracefully', async () => {
      // Temporarily set invalid URI
      const originalURI = process.env.MONGO_URI;
      process.env.MONGO_URI = 'mongodb://invalid:27017/test';

      // Clear existing connection
      await disconnectDB();

      // Should throw error
      await expect(connectDB()).rejects.toThrow();

      // Restore original URI
      process.env.MONGO_URI = originalURI;

      // Reconnect for other tests
      await connectDB();
    });
  });

  describe('healthCheck()', () => {
    it('should return healthy status when connected', async () => {
      await connectDB();

      const health = await healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.message).toBe('Connected');
      expect(health.database).toBeTruthy();
    });

    it('should return unhealthy status when disconnected', async () => {
      await disconnectDB();

      const health = await healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.message).toBe('Not connected');

      // Reconnect for other tests
      await connectDB();
    });
  });

  describe('clearDatabase()', () => {
    it('should clear all collections in test database', async () => {
      const User = require('../models/User');

      // Create test data
      await User.create({
        email: 'test@example.com',
        password: 'Password123'
      });

      // Verify data exists
      let count = await User.countDocuments();
      expect(count).toBe(1);

      // Clear database
      await clearDatabase();

      // Verify data is cleared
      count = await User.countDocuments();
      expect(count).toBe(0);
    });

    it('should only work in test environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      await expect(clearDatabase()).rejects.toThrow('test environment');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Environment-based database selection', () => {
    it('should use test database in test environment', () => {
      const status = getConnectionStatus();
      expect(status.dbName).toContain('Test');
    });

    it('should include correct environment in database name', () => {
      const config = require('../config/environment');
      expect(config.env).toBe('test');
      expect(config.mongodb.uri).toContain('Test');
    });
  });

  describe('Connection state management', () => {
    it('should track connection state correctly', async () => {
      await connectDB();
      let status = getConnectionStatus();
      expect(status.isConnected).toBe(true);

      await disconnectDB();
      status = getConnectionStatus();
      expect(status.isConnected).toBe(false);

      // Reconnect for other tests
      await connectDB();
    });
  });
});
