/**
 * Authentication Tests
 * Tests for signup, login, password reset flows
 */

const request = require('supertest');
const app = require('../server');
const User = require('../models/User');

describe('Authentication Routes', () => {
  
  describe('POST /api/auth/signup', () => {
    it('should create a new user with valid data', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
          firstName: 'John',
          lastName: 'Doe'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('newuser@example.com');
      
      // Verify user in database
      const user = await User.findOne({ email: 'newuser@example.com' });
      expect(user).toBeTruthy();
      expect(user.firstName).toBe('John');
    });
    
    it('should reject signup with weak password', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'weak',
          confirmPassword: 'weak'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('password');
    });
    
    it('should reject signup with mismatched passwords', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'Password123',
          confirmPassword: 'Different123'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('match');
    });
    
    it('should reject signup with duplicate email', async () => {
      // Create first user
      await createTestUser({ email: 'duplicate@example.com' });
      
      // Try to create second user with same email
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123',
          confirmPassword: 'Password123'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('exists');
    });
    
    it('should reject signup with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'Password123',
          confirmPassword: 'Password123'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
  
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user for login tests
      await createTestUser({
        email: 'login@example.com',
        password: 'Password123'
      });
    });
    
    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password123'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('login@example.com');
    });
    
    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword123'
        });
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
    
    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'notexist@example.com',
          password: 'Password123'
        });
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
    
    it('should lock account after 5 failed attempts', async () => {
      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'login@example.com',
            password: 'WrongPassword'
          });
      }
      
      // 6th attempt should be locked
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password123'
        });
      
      expect(res.status).toBe(423);
      expect(res.body.locked).toBe(true);
      expect(res.body.message).toContain('locked');
    });
  });
  
  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      await createTestUser({
        email: 'reset@example.com',
        firstName: 'Reset',
        lastName: 'User',
        dateOfBirth: new Date('1990-05-15'),
        emergencyContacts: [{
          name: 'Emergency Contact',
          phone: '+1234567890',
          isPublic: true
        }]
      });
    });
    
    it('should verify identity with correct information', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'reset@example.com',
          firstName: 'Reset',
          lastName: 'User',
          dateOfBirth: '1990-05-15',
          emergencyContactName: 'Emergency Contact',
          emergencyContactPhone: '+1234567890'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.resetToken).toBeDefined();
    });
    
    it('should reject with incorrect identity information', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'reset@example.com',
          firstName: 'Wrong',
          lastName: 'Name',
          dateOfBirth: '1990-05-15',
          emergencyContactName: 'Emergency Contact',
          emergencyContactPhone: '+1234567890'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('verify');
    });
  });
  
  describe('POST /api/auth/reset-password', () => {
    let resetToken;
    
    beforeEach(async () => {
      const user = await createTestUser({
        email: 'reset@example.com',
        firstName: 'Reset',
        lastName: 'User',
        dateOfBirth: new Date('1990-05-15'),
        emergencyContacts: [{
          name: 'Emergency Contact',
          phone: '+1234567890'
        }]
      });
      
      // Get reset token
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'reset@example.com',
          firstName: 'Reset',
          lastName: 'User',
          dateOfBirth: '1990-05-15',
          emergencyContactName: 'Emergency Contact',
          emergencyContactPhone: '+1234567890'
        });
      
      resetToken = res.body.resetToken;
    });
    
    it('should reset password with valid token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'NewPassword123',
          confirmPassword: 'NewPassword123'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Verify can login with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'reset@example.com',
          password: 'NewPassword123'
        });
      
      expect(loginRes.status).toBe(200);
    });
    
    it('should reject with invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123',
          confirmPassword: 'NewPassword123'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});