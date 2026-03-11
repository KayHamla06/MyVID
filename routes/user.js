const express = require('express');
const User = require('../models/User');
const { cloudinary, upload } = require('../config/cloudinary');

const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  getQRAccessLogs,
  deleteAccount,
  getDashboardFeed,
  reactToPost,
  commentOnPost
} = require('../controllers/Usercontroller');
const userController = require('../controllers/Uploadcontroller');
const {
  generateQR,
  toggleQR,
  downloadQRSVG,
  downloadQRPNG
} = require('../controllers/Qrcontroller');
const { uploadLimiter } = require('../middleware/Ratelimiter');

/**
 * Profile routes
 */
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.delete('/account', protect, deleteAccount);
router.get('/dashboard-feed', protect, getDashboardFeed);
router.post('/posts/:postId/reactions', protect, reactToPost);
router.post('/posts/:postId/comments', protect, commentOnPost);

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

module.exports = router;
