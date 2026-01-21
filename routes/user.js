const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const qrGenerator = require('../utils/qrGenerator');

const router = express.Router();

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

//module.exports = (upload) => {
  router.use(authMiddleware);

  router.get('/profile', async (req, res) => {
    try {
      const user = await User.findById(req.userId).select('-password');
      res.json({ success: true, data: user });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.put('/profile', async (req, res) => {
    const updates = req.body;
    try {
      const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select('-password');
      res.json({ success: true, data: user });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

 /* router.post('/upload-photo', upload.single('photo'), async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(req.userId, { profilePhoto: `/uploads/${req.file.filename}` }, { new: true }).select('-password');
      res.json({ success: true, data: user });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });*/

  router.post('/qr/generate', async (req, res) => {
    try {
      const user = await User.findById(req.userId);
      if (!user.qrId) {
        user.qrId = uuidv4();
        await user.save();
      }
      const url = `${req.protocol}://${req.get('host')}/p/${user.qrId}`;
      const qrDataUrl = await qrGenerator.generateQR(url, 'svg');
      res.json({ success: true, qrDataUrl, qrId: user.qrId });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.get('/qr/download/:format', async (req, res) => {
    const format = req.params.format;
    if (!['svg', 'png'].includes(format)) return res.status(400).json({ success: false, message: 'Invalid format' });
    try {
      const user = await User.findById(req.userId);
      if (!user.qrId) return res.status(404).json({ success: false, message: 'No QR generated' });
      const url = `${req.protocol}://${req.get('host')}/p/${user.qrId}`;
      const buffer = await qrGenerator.generateQRBuffer(url, format);
      res.type(`image/${format === 'svg' ? 'svg+xml' : 'png'}`);
      res.send(buffer);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.put('/qr/toggle', async (req, res) => {
    const { enabled } = req.body;
    try {
      const user = await User.findByIdAndUpdate(req.userId, { qrEnabled: enabled }, { new: true }).select('-password');
      res.json({ success: true, data: user });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  module.exports = router;
//;