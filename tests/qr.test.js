/**
 * QR Code Generation Tests
 * Tests for QR code creation and access
 */

const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const AccessLog = require('../models/AccessLog');

describe('QR Code Generation', () => {
  let authToken;
  let userId;
  
  beforeEach(async () => {
    // Create authenticated user
    const user = await createTestUser({
      email: 'qr@example.com',
      firstName: 'QR',
      lastName: 'Test'
    });
    
    userId = user._id;
    authToken = createAuthToken(userId);
  });
  
  describe('POST /api/user/qr/generate', () => {
    it('should generate QR code for authenticated user', async () => {
      const res = await request(app)
        .post('/api/user/qr/generate')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.qrDataUrl).toBeDefined();
      expect(res.body.qrId).toBeDefined();
      expect(res.body.publicUrl).toBeDefined();
      
      // Verify QR ID saved to user
      const user = await User.findById(userId);
      expect(user.qrId).toBe(res.body.qrId);
    });
    
    it('should return existing QR code if already generated', async () => {
      // Generate first time
      const res1 = await request(app)
        .post('/api/user/qr/generate')
        .set('Authorization', `Bearer ${authToken}`);
      
      const qrId1 = res1.body.qrId;
      
      // Generate second time
      const res2 = await request(app)
        .post('/api/user/qr/generate')
        .set('Authorization', `Bearer ${authToken}`);
      
      // Should return same QR ID
      expect(res2.body.qrId).toBe(qrId1);
    });
    
    it('should reject request without authentication', async () => {
      const res = await request(app)
        .post('/api/user/qr/generate');
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
    
    it('should include correct base URL in QR', async () => {
      const res = await request(app)
        .post('/api/user/qr/generate')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.body.publicUrl).toContain('/p/');
      expect(res.body.publicUrl).toMatch(/^http/);
    });
  });
  
  describe('GET /api/user/qr/download/:format', () => {
    let qrId;
    
    beforeEach(async () => {
      // Generate QR first
      const res = await request(app)
        .post('/api/user/qr/generate')
        .set('Authorization', `Bearer ${authToken}`);
      
      qrId = res.body.qrId;
    });
    
    it('should download QR as PNG', async () => {
      const res = await request(app)
        .get('/api/user/qr/download/png')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.type).toBe('image/png');
    });
    
    it('should download QR as SVG', async () => {
      const res = await request(app)
        .get('/api/user/qr/download/svg')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.type).toContain('svg');
    });
    
    it('should reject invalid format', async () => {
      const res = await request(app)
        .get('/api/user/qr/download/jpg')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(400);
    });
  });
  
  describe('PUT /api/user/qr/toggle', () => {
    beforeEach(async () => {
      // Generate QR first
      await request(app)
        .post('/api/user/qr/generate')
        .set('Authorization', `Bearer ${authToken}`);
    });
    
    it('should enable QR code', async () => {
      const res = await request(app)
        .put('/api/user/qr/toggle')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ enabled: true });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.qrEnabled).toBe(true);
    });
    
    it('should disable QR code', async () => {
      const res = await request(app)
        .put('/api/user/qr/toggle')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ enabled: false });
      
      expect(res.status).toBe(200);
      expect(res.body.data.qrEnabled).toBe(false);
    });
    
    it('should reject invalid boolean value', async () => {
      const res = await request(app)
        .put('/api/user/qr/toggle')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ enabled: 'yes' });
      
      expect(res.status).toBe(400);
    });
  });
  
  describe('GET /p/:qrId (Public Profile)', () => {
    let qrId;
    
    beforeEach(async () => {
      // Update user with profile data
      await User.findByIdAndUpdate(userId, {
        firstName: 'John',
        medicalAlerts: ['Allergic to penicillin'],
        emergencyContacts: [{
          name: 'Emergency Contact',
          phone: '+1234567890',
          isPublic: true
        }]
      });
      
      // Generate QR
      const res = await request(app)
        .post('/api/user/qr/generate')
        .set('Authorization', `Bearer ${authToken}`);
      
      qrId = res.body.qrId;
    });
    
    it('should display public profile when QR is scanned', async () => {
      const res = await request(app)
        .get(`/p/${qrId}`);
      
      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
      expect(res.text).toContain('John');
      expect(res.text).toContain('Allergic to penicillin');
    });
    
    it('should log access when profile is viewed', async () => {
      await request(app)
        .get(`/p/${qrId}`);
      
      // Check access log created
      const logs = await AccessLog.find({ qrId });
      expect(logs.length).toBe(1);
      expect(logs[0].userId.toString()).toBe(userId.toString());
    });
    
    it('should return 404 for invalid QR ID', async () => {
      const res = await request(app)
        .get('/p/invalid-qr-id');
      
      expect(res.status).toBe(404);
    });
    
    it('should return 403 when QR is disabled', async () => {
      // Disable QR
      await User.findByIdAndUpdate(userId, { qrEnabled: false });
      
      const res = await request(app)
        .get(`/p/${qrId}`);
      
      expect(res.status).toBe(403);
    });
  });
  
  describe('Access Logging', () => {
    let qrId;
    
    beforeEach(async () => {
      const res = await request(app)
        .post('/api/user/qr/generate')
        .set('Authorization', `Bearer ${authToken}`);
      
      qrId = res.body.qrId;
    });
    
    it('should log IP address on access', async () => {
      await request(app)
        .get(`/p/${qrId}`)
        .set('X-Forwarded-For', '192.168.1.1');
      
      const log = await AccessLog.findOne({ qrId });
      expect(log.ipAddress).toBeTruthy();
    });
    
    it('should log user agent on access', async () => {
      await request(app)
        .get(`/p/${qrId}`)
        .set('User-Agent', 'Mozilla/5.0 Test Browser');
      
      const log = await AccessLog.findOne({ qrId });
      expect(log.userAgent).toContain('Mozilla');
    });
    
    it('should increment access count', async () => {
      // Access multiple times
      await request(app).get(`/p/${qrId}`);
      await request(app).get(`/p/${qrId}`);
      await request(app).get(`/p/${qrId}`);
      
      const logs = await AccessLog.find({ qrId });
      expect(logs.length).toBe(3);
    });
  });
});