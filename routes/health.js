const express = require('express');
const router = express.Router();
const { healthCheck, getConnectionStatus } = require('../config/Database');
const config = require('../config/environment');

router.get('/', async (req, res) => {
  try {
    const dbHealth = await healthCheck();
    const conn = getConnectionStatus();

    res.json({
      success: true,
      service: 'SafePass ID',
      env: config.env,
      baseURL: config.baseURL,
      database: dbHealth,
      connection: conn,
      uptime: process.uptime()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
