const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const qrGenerator = require('../utils/qrGenerator');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  const updates = req.body;
  try {
    // Remove password from updates if present
    delete updates.password;
    delete updates.email;
    
    const user = await User.findByIdAndUpdate(
      req.userId, 
      { ...updates, updatedAt: Date.now() }, 
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Upload profile photo
router.post('/upload-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const photoUrl = `/uploads/${req.file.filename}`;
    
    const user = await User.findByIdAndUpdate(
      req.userId, 
      { profilePhoto: photoUrl, updatedAt: Date.now() }, 
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, data: user, photoUrl });
  } catch (err) {
    console.error('Upload photo error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Generate QR code
router.post('/qr/generate', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Generate QR ID if not exists
    if (!user.qrId) {
      user.qrId = uuidv4();
      await user.save();
    }
    
    // Generate the public URL
    const url = `${req.protocol}://${req.get('host')}/p/${user.qrId}`;
    
    // Generate QR code as data URL (always PNG for display)
    const qrDataUrl = await qrGenerator.generateQR(url);
    
    res.json({ 
      success: true, 
      qrDataUrl, 
      qrId: user.qrId,
      publicUrl: url
    });
  } catch (err) {
    console.error('QR generation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Download QR code
router.get('/qr/download/:format', async (req, res) => {
  const format = req.params.format;
  
  if (!['svg', 'png'].includes(format)) {
    return res.status(400).json({ success: false, message: 'Invalid format. Use svg or png.' });
  }
  
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (!user.qrId) {
      return res.status(404).json({ success: false, message: 'No QR code generated yet' });
    }
    
    const url = `${req.protocol}://${req.get('host')}/p/${user.qrId}`;
    const buffer = await qrGenerator.generateQRBuffer(url, format);
    
    res.type(`image/${format === 'svg' ? 'svg+xml' : 'png'}`);
    res.setHeader('Content-Disposition', `attachment; filename="safepass-qr.${format}"`);
    res.send(buffer);
  } catch (err) {
    console.error('QR download error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Toggle QR code enabled/disabled
router.put('/qr/toggle', async (req, res) => {
  const { enabled } = req.body;
  
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ success: false, message: 'enabled must be a boolean' });
  }
  
  try {
    const user = await User.findByIdAndUpdate(
      req.userId, 
      { qrEnabled: enabled, updatedAt: Date.now() }, 
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('QR toggle error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;