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

    await recordScan(req, user, 'qr_scan');

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

router.post('/scan-log', async (req, res) => {
  try {
    const { userId, qrId, location, device, accessType } = req.body || {};

    let user = null;
    if (userId) {
      user = await User.findById(userId);
    } else if (qrId) {
      user = await User.findOne({ qrId });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await recordScan(req, user, accessType || 'qr_scan', { location, device });
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Scan log error:', error);
    res.status(500).json({ success: false, message: 'Error logging scan' });
  }
});

async function recordScan(req, user, accessType = 'qr_scan', overrides = {}) {
  const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  await AccessLog.logAccess({
    userId: user._id,
    qrId: user.qrId,
    ipAddress: ip,
    userAgent,
    location: normalizeLocation(overrides.location),
    device: normalizeDevice(overrides.device, userAgent),
    referrer: req.headers.referer || req.headers.referrer || null,
    accessType
  });

  user.qrScanCount = (user.qrScanCount || 0) + 1;
  await user.save();
}

function normalizeLocation(location) {
  if (!location) {
    return { city: 'Unknown' };
  }

  if (typeof location === 'string') {
    return { city: location };
  }

  return {
    country: location.country || undefined,
    region: location.region || undefined,
    city: location.city || 'Unknown',
    coordinates: location.coordinates || undefined
  };
}

function normalizeDevice(device, userAgent) {
  if (device && typeof device === 'object') {
    return {
      type: device.type || detectDeviceType(userAgent),
      os: device.os || undefined,
      browser: device.browser || undefined
    };
  }

  return {
    type: detectDeviceType(userAgent),
    browser: typeof device === 'string' ? device : undefined
  };
}

function detectDeviceType(userAgent) {
  const source = String(userAgent || '').toLowerCase();
  if (source.includes('mobile')) return 'mobile';
  if (source.includes('tablet')) return 'tablet';
  return 'desktop';
}

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
