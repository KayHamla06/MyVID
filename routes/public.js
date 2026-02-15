const express = require('express');
const path = require('path');
const User = require('../models/User');
const AccessLog = require('../models/AccessLog');

const router = express.Router();

// Render public profile server-side (tests expect populated HTML)
router.get('/:qrId', async (req, res) => {
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

    // Build a minimal server-rendered HTML containing the public fields
    const publicContacts = (user.emergencyContacts || []).filter(c => c.isPublic);
    const medicalHtml = (user.medicalAlerts || []).map(a => `<li>${a}</li>`).join('');
    const contact = publicContacts[0] ? `<a id="emergency-contact" class="call-btn">${publicContacts[0].name} - ${publicContacts[0].phone}</a>` : '';

    const html = `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Public Profile</title>
      </head>
      <body>
        <h1>${user.firstName || ''}</h1>
        <p>${user.country || ''}</p>
        <h2>Medical Alerts</h2>
        <ul>${medicalHtml}</ul>
        <h2>Emergency Contact</h2>
        ${contact}
      </body>
      </html>`;

    res.type('text/html').status(200).send(html);
  } catch (_err) {
    res.status(500).send('Server error');
  }
});

// JSON endpoint for frontend if needed
router.get('/data/:qrId', async (req, res) => {
  try {
    const user = await User.findOne({ qrId: req.params.qrId });
    if (!user || !user.qrEnabled) {
      return res.status(404).json({ success: false, message: 'QR disabled or not found' });
    }
    const publicContacts = user.emergencyContacts.filter(c => c.isPublic);
    const publicData = {
      firstName: user.firstName,
      profilePhoto: user.profilePhoto,
      country: user.country,
      medicalAlerts: user.medicalAlerts,
      emergencyContacts: publicContacts.map(c => ({ name: c.name, phone: c.phone }))
    };
    res.json({ success: true, data: publicData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
