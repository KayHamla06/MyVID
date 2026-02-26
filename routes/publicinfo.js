const express = require('express');
const User = require('../models/User');
const AccessLog = require('../models/AccessLog');
const { qrScanLimiter } = require('../middleware/Ratelimiter');

const router = express.Router();

/**
 * @route   GET /publicinfo/:username
 * @desc    Get public profile by username - renders professional HTML
 * @access  Public
 * @security Rate limited (30 per minute) to prevent enumeration/abuse
 * 
 * Enforces server-side visibility filtering:
 * - Only shows fields marked visible = true in database
 * - Renders clean professional HTML (never returns raw JSON)
 * - Increments QR scan count
 * - Logs access for analytics
 */
router.get('/:username', qrScanLimiter, async (req, res) => {
  try {
    const { username } = req.params;

    if (!username || username.trim() === '') {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Profile Not Found</title></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI'; padding: 40px 20px; text-align: center;">
          <h1>❌ Profile Not Found</h1>
          <p>The profile you're looking for doesn't exist.</p>
        </body>
        </html>
      `);
    }

    // Find user by username (case-insensitive)
    const user = await User.findOne({ 
      username: username.toLowerCase() 
    });

    if (!user) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Profile Not Found</title></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI'; padding: 40px 20px; text-align: center;">
          <h1>❌ Profile Not Found</h1>
          <p>The profile you're looking for doesn't exist.</p>
        </body>
        </html>
      `);
    }

    // Check if QR/public profile is enabled
    if (!user.qrEnabled) {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Profile Disabled</title></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI'; padding: 40px 20px; text-align: center;">
          <h1>🔒 Profile Not Available</h1>
          <p>This profile is not publicly accessible.</p>
        </body>
        </html>
      `);
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

    // Get public profile data (server-side visibility enforcement)
    const publicData = user.getPublicProfile();

    // Build full name safely
    const firstName = publicData.firstName || '';
    const lastName = publicData.lastName || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Emergency Profile';

    // Build emergency contacts HTML
    const contactsHtml = (publicData.emergencyContacts || [])
      .map(c => `
        <a href="tel:${escapeHtml(c.phone)}" class="contact-link emergency-contact">
          <span class="contact-icon">📞</span>
          <div class="contact-info">
            <span class="contact-name">${escapeHtml(c.name)}</span>
            <span class="contact-phone">${escapeHtml(c.phone)}</span>
          </div>
        </a>
      `)
      .join('');

    // Build medical alerts HTML
    const medicalHtml = (publicData.medicalAlerts || [])
      .map(alert => `
        <div class="medical-alert-item">
          <span class="alert-icon">⚕️</span>
          <span>${escapeHtml(alert)}</span>
        </div>
      `)
      .join('');

    // Build country/location HTML
    const locationHtml = publicData.country 
      ? `<p class="profile-location">📍 ${escapeHtml(publicData.country)}</p>` 
      : '';

    // Build profile photo HTML
    const photoHtml = publicData.profilePhoto
      ? `<img src="${escapeHtml(publicData.profilePhoto)}" alt="Profile Photo" class="profile-photo">`
      : `<div class="profile-photo-placeholder">👤</div>`;

    // Render professional HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Emergency Profile - ${escapeHtml(fullName)}">
  <meta name="robots" content="noindex, follow">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <title>${escapeHtml(fullName)} - SafePass ID Emergency Profile</title>
  <link rel="stylesheet" href="/css/reset.css">
  <style>
    :root {
      --primary: #1f2937;
      --secondary: #6b7280;
      --danger: #dc2626;
      --success: #059669;
      --light: #f3f4f6;
      --border: #e5e7eb;
      --shadow: 0 1px 3px rgba(0,0,0,0.1);
      --shadow-lg: 0 10px 25px rgba(0,0,0,0.1);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, var(--light) 0%, #ffffff 100%);
      color: var(--primary);
      line-height: 1.6;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }

    .profile-card {
      background: white;
      border-radius: 12px;
      box-shadow: var(--shadow-lg);
      overflow: hidden;
      margin: 20px 0;
    }

    .profile-header {
      background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
      color: white;
      padding: 40px 24px;
      text-align: center;
      border-bottom: 4px solid var(--danger);
    }

    .emergency-badge {
      display: inline-block;
      background: rgba(220, 38, 38, 0.2);
      color: #fca5a5;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 12px;
      border: 1px solid rgba(220, 38, 38, 0.3);
    }

    .profile-photo {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid white;
      margin: 0 auto 16px;
      display: block;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .profile-photo-placeholder {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      margin: 0 auto 16px;
      border: 4px solid white;
    }

    .profile-name {
      font-size: 28px;
      font-weight: 700;
      margin: 12px 0;
      letter-spacing: -0.5px;
    }

    .profile-location {
      font-size: 14px;
      opacity: 0.9;
      margin: 8px 0 0;
    }

    .profile-content {
      padding: 32px 24px;
    }

    .section {
      margin-bottom: 32px;
    }

    .section:last-child {
      margin-bottom: 0;
    }

    .section-title {
      display: flex;
      align-items: center;
      font-size: 16px;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--light);
    }

    .section-icon {
      font-size: 20px;
      margin-right: 8px;
    }

    .contact-link {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: var(--light);
      border-radius: 8px;
      text-decoration: none;
      color: inherit;
      margin-bottom: 8px;
      border: 1px solid var(--border);
      transition: all 0.2s ease;
    }

    .contact-link:last-child {
      margin-bottom: 0;
    }

    .contact-link:hover {
      background: #e0f2fe;
      border-color: #0284c7;
      transform: translateY(-2px);
      box-shadow: var(--shadow);
    }

    .contact-icon {
      font-size: 20px;
      margin-right: 12px;
      flex-shrink: 0;
    }

    .contact-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }

    .contact-name {
      font-weight: 600;
      font-size: 14px;
      color: var(--primary);
    }

    .contact-phone {
      font-size: 13px;
      color: var(--secondary);
      margin-top: 2px;
      font-family: 'Monaco', 'Courier New', monospace;
    }

    .emergency-contact {
      background: rgba(220, 38, 38, 0.05);
      border: 1px solid rgba(220, 38, 38, 0.2);
    }

    .emergency-contact:hover {
      background: rgba(220, 38, 38, 0.1);
      border-color: rgba(220, 38, 38, 0.3);
    }

    .medical-alert-item {
      display: flex;
      align-items: flex-start;
      padding: 12px 16px;
      background: rgba(220, 38, 38, 0.05);
      border-left: 3px solid var(--danger);
      border-radius: 4px;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .medical-alert-item:last-child {
      margin-bottom: 0;
    }

    .alert-icon {
      font-size: 18px;
      margin-right: 12px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .alert-text {
      color: #7f1d1d;
      line-height: 1.5;
    }

    .emergency-services {
      background: var(--light);
      padding: 16px;
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    .emergency-service-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .emergency-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 12px;
      background: white;
      border: 1px solid var(--border);
      border-radius: 6px;
      text-decoration: none;
      color: var(--primary);
      font-size: 12px;
      font-weight: 600;
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .emergency-btn:hover {
      background: var(--danger);
      color: white;
      border-color: var(--danger);
      transform: scale(1.05);
    }

    .emergency-btn-icon {
      font-size: 24px;
      margin-bottom: 4px;
    }

    .empty-state {
      padding: 20px;
      text-align: center;
      color: var(--secondary);
      font-size: 14px;
    }

    .footer {
      padding: 24px;
      text-align: center;
      color: var(--secondary);
      font-size: 12px;
      border-top: 1px solid var(--border);
      background: var(--light);
    }

    .footer-text {
      margin: 4px 0;
    }

    @media (max-width: 640px) {
      .container {
        padding: 12px;
      }

      .profile-header {
        padding: 32px 20px;
      }

      .profile-name {
        font-size: 24px;
      }

      .profile-content {
        padding: 24px 20px;
      }

      .emergency-service-grid {
        grid-template-columns: 1fr 1fr 1fr;
      }

      .emergency-btn {
        padding: 10px;
        font-size: 11px;
      }

      .emergency-btn-icon {
        font-size: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="profile-card">
      <div class="profile-header">
        <div class="emergency-badge">🚨 EMERGENCY PROFILE</div>
        ${photoHtml}
        <h1 class="profile-name">${escapeHtml(fullName)}</h1>
        ${locationHtml}
      </div>

      <div class="profile-content">
        ${medicalHtml ? `
          <div class="section">
            <div class="section-title">
              <span class="section-icon">⚠️</span>
              Medical Alerts
            </div>
            ${medicalHtml}
          </div>
        ` : ''}

        ${contactsHtml ? `
          <div class="section">
            <div class="section-title">
              <span class="section-icon">📞</span>
              Emergency Contacts
            </div>
            ${contactsHtml}
          </div>
        ` : ''}

        <div class="section">
          <div class="section-title">
            <span class="section-icon">🚨</span>
            Emergency Services
          </div>
          <div class="emergency-services">
            <div class="emergency-service-grid">
              <a href="tel:10111" class="emergency-btn">
                <span class="emergency-btn-icon">🚔</span> Police
              </a>
              <a href="tel:107" class="emergency-btn">
                <span class="emergency-btn-icon">🚑</span> Ambulance
              </a>
              <a href="tel:10177" class="emergency-btn">
                <span class="emergency-btn-icon">🚒</span> Fire
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p class="footer-text">🛡️ SafePass ID - Emergency Information</p>
        <p class="footer-text">Information shown is limited to what the owner chose to share for emergencies.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    res.type('text/html').status(200).send(html);

  } catch (error) {
    console.error('Public profile error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Error</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI'; padding: 40px 20px; text-align: center;">
        <h1>❌ Server Error</h1>
        <p>Something went wrong. Please try again later.</p>
      </body>
      </html>
    `);
  }
});

/**
 * @route   GET /publicinfo/:username/data
 * @desc    Get public profile data as JSON (for API calls, with server-side filtering)
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

    // Return server-side filtered public data
    const publicData = user.getPublicProfile();
    res.json({ 
      success: true, 
      data: publicData,
      // Safe to include these metadata fields
      name: [publicData.firstName, publicData.lastName].filter(Boolean).join(' ') || 'User'
    });
  } catch (error) {
    console.error('Public profile data error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
});

/**
 * HTML escape utility - prevent XSS
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
