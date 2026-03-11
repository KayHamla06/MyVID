const express = require('express');
const path = require('path');
const User = require('../models/User');
const { qrScanLimiter } = require('../middleware/Ratelimiter');

const router = express.Router();

router.get('/:username', qrScanLimiter, async (req, res) => {
  try {
    const user = await User.findOne({ username: String(req.params.username || '').toLowerCase() }).select('_id qrEnabled');

    if (!user) {
      return res.status(404).sendFile(path.join(__dirname, '../public/disabled.html'));
    }

    if (!user.qrEnabled) {
      return res.status(403).sendFile(path.join(__dirname, '../public/disabled.html'));
    }

    return res.sendFile(path.join(__dirname, '../public/public-profile.html'));
  } catch (error) {
    console.error('Public profile render error:', error);
    return res.status(500).send('Server error');
  }
});

router.get('/:username/data', qrScanLimiter, async (req, res) => {
  try {
    const username = String(req.params.username || '').toLowerCase().trim();
    const user = await User.findOne({ username });

    if (!user || !user.qrEnabled) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const profile = user.getPublicProfile();
    const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Emergency Profile';
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const canonicalUrl = `${baseUrl}/publicinfo/${encodeURIComponent(username)}`;

    return res.status(200).json({
      success: true,
      data: {
        ...profile,
        seo: {
          title: `SafePassID Profile - ${fullName}`,
          description: `Emergency and identity information for ${fullName}.`,
          url: canonicalUrl,
          image: profile.profilePhoto || `${baseUrl}/logo.jpeg`,
          type: 'profile'
        }
      }
    });
  } catch (error) {
    console.error('Public profile data error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching profile' });
  }
});

module.exports = router;
