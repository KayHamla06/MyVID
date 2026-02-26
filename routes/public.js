const express = require('express');
const path = require('path');
const User = require('../models/User');
const AccessLog = require('../models/AccessLog');
const { qrScanLimiter } = require('../middleware/Ratelimiter');

const router = express.Router();

/**
 * @route   GET /p/:qrId
 * @desc    Get public profile via QR code - Server-side rendered HTML
 * @access  Public
 * @security Rate limited (30 per minute) to prevent scanning abuse
 */
router.get('/:qrId', qrScanLimiter, async (req, res) => {
  try {
    const user = await User.findOne({ qrId: req.params.qrId });

    if (!user) {
      return res.status(404).send('Profile not found');
    }

    if (!user.qrEnabled) {
      return res.status(403).sendFile(path.join(__dirname, '../public/disabled.html'));
    }

    // Log access
    const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    await AccessLog.logAccess({
      userId: user._id,
      qrId: user.qrId,
      ipAddress: ip,
      userAgent
    });

    res.type('text/html').status(200).sendFile(
      path.join(__dirname, '../public/public-profile.html')
    );
  } catch (_err) {
    res.status(500).send('Server error');
  }
});

/**
 * @route   GET /p/data/:qrId
 * @desc    Get public profile data as JSON (for frontend consumption)
 * @access  Public
 * @security Rate limited (30 per minute) to prevent API abuse
 * @note    All sensitive fields filtered by getPublicProfile()
 */
router.get('/data/:qrId', qrScanLimiter, async (req, res) => {
  try {
    const user = await User.findOne({ qrId: req.params.qrId });
    if (!user || !user.qrEnabled) {
      return res.status(404).json({ success: false, message: 'QR disabled or not found' });
    }
    const publicData = user.getPublicProfile();
    res.json({ success: true, data: publicData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const str = String(text);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = router;
