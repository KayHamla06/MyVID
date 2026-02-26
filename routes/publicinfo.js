const express = require('express');
const path = require('path');
const User = require('../models/User');
const AccessLog = require('../models/AccessLog');
const { qrScanLimiter } = require('../middleware/Ratelimiter');

const router = express.Router();

/**
 * @route   GET /publicinfo/:username
 * @desc    Get public profile by username with server-side rendered HTML
 * @access  Public
 * @security Rate limited (30 per minute) to prevent enumeration/abuse
 * 
 * Returns PUBLIC-ONLY data respecting visibility flags:
 * - Only shows fields marked as visible by user
 * - No email, password, tokens, or private data exposed
 * - All output HTML-escaped to prevent XSS
 */
router.get('/:username', qrScanLimiter, async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    // Find user by username (case-insensitive)
    const user = await User.findOne({ 
      username: username.toLowerCase() 
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Check if QR/public profile is enabled
    if (!user.qrEnabled) {
      return res.status(403).json({
        success: false,
        message: 'This profile is not publicly accessible'
      });
    }

    // Log access for analytics
    try {
      const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      await AccessLog.logAccess({
        userId: user._id,
        qrId: user.qrId,
        username: user.username,
        ipAddress: ip,
        userAgent
      });

      // Increment QR scan count
      user.qrScanCount = (user.qrScanCount || 0) + 1;
      await user.save();
    } catch (logError) {
      console.warn('Failed to log access:', logError.message);
      // Continue even if logging fails
    }

    res.type('text/html').status(200).sendFile(
      path.join(__dirname, '../public/public-profile.html')
    );

  } catch (error) {
    console.error('Public profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

/**
 * @route   GET /publicinfo/:username/data
 * @desc    Get public profile data as JSON (for frontend rendering)
 * @access  Public
 */
router.get('/:username/data', qrScanLimiter, async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({
      username: username.toLowerCase()
    });

    if (!user || !user.qrEnabled) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const publicData = user.getPublicProfile();
    res.json({ success: true, data: publicData });
  } catch (error) {
    console.error('Public profile data error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
});

/**
 * @route   GET /publicinfo/:username/html
 * @desc    Get public profile as HTML page (for direct QR scan viewing)
 * @access  Public
 */
router.get('/:username/html', async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ 
      username: username.toLowerCase() 
    });

    if (!user) {
      return res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
    }

    if (!user.qrEnabled) {
      return res.status(403).sendFile(path.join(__dirname, '../public/disabled.html'));
    }

    // Log access
    try {
      const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      await AccessLog.logAccess({
        userId: user._id,
        qrId: user.qrId,
        username: user.username,
        ipAddress: ip,
        userAgent
      });

      // Increment QR scan count
      user.qrScanCount = (user.qrScanCount || 0) + 1;
      await user.save();
    } catch (logError) {
      console.warn('Failed to log access:', logError.message);
    }

    // Build public contacts list
    const publicContacts = (user.emergencyContacts || []).filter(c => c.isPublic);
    
    // Generate HTML
    const medicalHtml = (user.medicalAlerts || [])
      .map(alert => `<li class="medical-alert">${escapeHtml(alert)}</li>`)
      .join('');

    const contactsHtml = publicContacts
      .map(c => `<a href="tel:${escapeHtml(c.phone)}" class="contact-btn">${escapeHtml(c.name)} - ${escapeHtml(c.phone)}</a>`)
      .join('');

    const photoHtml = user.profilePhoto 
      ? `<img src="${escapeHtml(user.profilePhoto)}" alt="Profile Photo" class="profile-photo">` 
      : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(user.firstName || 'SafePass')} - Emergency Info</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 400px; margin: 0 auto; background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .profile-photo { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; display: block; margin: 0 auto 16px; }
    h1 { text-align: center; color: #333; margin-bottom: 8px; }
    .country { text-align: center; color: #666; margin-bottom: 24px; }
    h2 { color: #d32f2f; font-size: 16px; margin: 16px 0 8px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
    .medical-alert { background: #ffebee; padding: 8px 12px; border-radius: 6px; margin: 8px 0; color: #c62828; list-style: none; }
    .contact-btn { display: block; background: #4caf50; color: white; padding: 12px 16px; border-radius: 8px; text-decoration: none; text-align: center; margin: 8px 0; font-weight: 500; }
    .contact-btn:hover { background: #43a047; }
    .footer { text-align: center; margin-top: 24px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    ${photoHtml}
    <h1>${escapeHtml(user.firstName || 'Emergency Info')}</h1>
    <p class="country">${escapeHtml(user.country || '')}</p>
    
    ${medicalHtml ? `<h2>⚠️ Medical Alerts</h2><ul>${medicalHtml}</ul>` : ''}
    
    ${contactsHtml ? `<h2>📞 Emergency Contacts</h2>${contactsHtml}` : ''}
    
    <p class="footer">Powered by SafePass ID</p>
  </div>
</body>
</html>`;

    res.type('text/html').status(200).send(html);

  } catch (error) {
    console.error('Public profile HTML error:', error);
    res.status(500).send('Server error');
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
