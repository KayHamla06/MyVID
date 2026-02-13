const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const qrGenerator = require('../utils/qrGenerator');
const { cloudinary, upload } = require('../config/cloudinary');
const { uploadRateLimiter } = require('../security/rateLimiter');

const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  getQRAccessLogs,
  deleteAccount
} = require('../controllers/Usercontroller');
const userController = require('../controllers/Uploadcontroller');
const {
  generateQR,
  toggleQR,
  downloadQRSVG,
  downloadQRPNG
} = require('../controllers/Qrcontroller');
const {
  uploadMiddleware,
  uploadPhoto,
  handleUploadError
} = require('../controllers/Uploadcontroller');
const { uploadLimiter } = require('../middleware/Ratelimiter');

/**
 * Profile routes
 */
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.delete('/account', protect, deleteAccount);

/**
 * QR code routes
 */
router.post('/qr/generate', protect, generateQR);
router.put('/qr/toggle', protect, toggleQR);
router.get('/qr/download/svg', protect, downloadQRSVG);
router.get('/qr/download/png', protect, downloadQRPNG);
router.get('/qr/access-logs', protect, getQRAccessLogs);

/**
 * Upload routes
 */
router.post(
  '/upload-photo',
  protect,
  uploadLimiter,
  upload.single('photo'),
  userController.uploadPhoto
);
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
  } catch {
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
    // Remove sensitive fields from updates
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

// Upload profile photo to Cloudinary
router.post('/upload-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Get the user to delete old photo if exists
    const user = await User.findById(req.userId);

    // Delete old photo from Cloudinary if it exists
    if (user.profilePhoto && user.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(user.cloudinaryPublicId);
      } catch (err) {
        console.error('Error deleting old photo:', err);
        // Continue anyway
      }
    }

    // Cloudinary URL is in req.file.path
    const photoUrl = req.file.path;
    const publicId = req.file.filename;

    // Update user with new photo
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      {
        profilePhoto: photoUrl,
        cloudinaryPublicId: publicId,
        updatedAt: Date.now()
      },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: updatedUser,
      photoUrl: photoUrl
    });
  } catch (err) {
    console.error('Upload photo error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete profile photo
router.delete('/delete-photo', async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete from Cloudinary if exists
    if (user.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(user.cloudinaryPublicId);
      } catch (err) {
        console.error('Error deleting photo from Cloudinary:', err);
      }
    }

    // Update user
    user.profilePhoto = null;
    user.cloudinaryPublicId = null;
    user.updatedAt = Date.now();
    await user.save();

    res.json({ success: true, message: 'Photo deleted successfully' });
  } catch (err) {
    console.error('Delete photo error:', err);
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

    // Generate QR code as data URL
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
