const express = require('express');
const path = require('path');
const User = require('../models/User');

const router = express.Router();

router.get('/:qrId', async (req, res) => {
  try {
    const user = await User.findOne({ qrId: req.params.qrId });
    if (!user || !user.qrEnabled) {
      return res.sendFile(path.join(__dirname, '../public/disabled.html'));
    }
    res.sendFile(path.join(__dirname, '../public/public-profile.html'));
  } catch (err) {
    res.status(500).send('Server error');
  }
});

router.get('/data/:qrId', async (req, res) => {
  try {
    const user = await User.findOne({ qrId: req.params.qrId });
    if (!user || !user.qrEnabled) {
      return res.status(404).json({ success: false, message: 'QR disabled or not found' });
    }
    const publicContact = user.emergencyContacts.filter(c => c.isPublic);
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