const express = require('express');
const User = require('../models/User');
const AccessLog = require('../models/AccessLog');

const router = express.Router();

router.post('/', async (req, res) => {
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

    const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    await AccessLog.logAccess({
      userId: user._id,
      qrId: user.qrId,
      ipAddress: ip,
      userAgent,
      location: normalizeLocation(location),
      device: normalizeDevice(device, userAgent),
      referrer: req.headers.referer || req.headers.referrer || null,
      accessType: accessType || 'qr_scan'
    });

    user.qrScanCount = (user.qrScanCount || 0) + 1;
    await user.save();

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error('Scan log error:', error);
    return res.status(500).json({ success: false, message: 'Error logging scan' });
  }
});

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

module.exports = router;