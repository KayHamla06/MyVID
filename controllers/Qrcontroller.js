const User = require('../models/User');
const { generateQR, generateQRBuffer, buildPublicUrl } = require('../utils/qrGenerator');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/environment');

/**
 * Generate a unique username from firstName
 * Format: profile_firstname_randomsuffix
 */
const generateUsername = async (firstName) => {
  const baseName = (firstName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
  const suffix = uuidv4().slice(0, 8);
  let username = `profile_${baseName}`;
  
  // Check if exists, add suffix if needed
  const existing = await User.findOne({ username });
  if (existing) {
    username = `profile_${baseName}_${suffix}`;
  }
  
  return username;
};

/**
 * @route   POST /api/user/qr/generate
 * @desc    Generate QR code for user
 * @access  Private
 */
exports.generateQR = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate unique username if doesn't exist
    if (!user.username) {
      user.username = await generateUsername(user.firstName);
      await user.save();
    }

    // Generate unique QR ID for backward compatibility
    if (!user.qrId) {
      user.qrId = uuidv4();
      await user.save();
    }

    // Generate QR code URL using username (new format)
    // URL: https://www.safepassid.co.za/publicinfo/profile_username
    const qrUrl = buildPublicUrl(user.username);

    // Generate QR code as data URL for display
    const qrDataUrl = await generateQR(qrUrl);

    console.log(`✅ QR code generated for user: ${user.email} - URL: ${qrUrl}`);

    res.status(200).json({
      success: true,
      qrDataUrl,
      qrId: user.qrId,
      username: user.username,
      publicUrl: qrUrl
    });

  } catch (error) {
    console.error('Generate QR error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating QR code'
    });
  }
};

/**
 * @route   PUT /api/user/qr/toggle
 * @desc    Enable/disable QR code
 * @access  Private
 */
exports.toggleQR = async (req, res) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Enabled status is required'
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.qrEnabled = enabled;
    await user.save();

    console.log(`✅ QR ${enabled ? 'enabled' : 'disabled'} for user: ${user.email}`);

    res.status(200).json({
      success: true,
      data: {
        qrEnabled: user.qrEnabled
      }
    });

  } catch (error) {
    console.error('Toggle QR error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling QR code'
    });
  }
};

/**
 * @route   GET /api/user/qr/download/svg
 * @desc    Download QR code as SVG
 * @access  Private
 */
exports.downloadQRSVG = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.username) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found. Please generate a QR code first.'
      });
    }

    const qrUrl = buildPublicUrl(user.username);
    const svgBuffer = await generateQRBuffer(qrUrl, 'svg');

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', 'attachment; filename=safepass-qr.svg');
    res.send(svgBuffer);

  } catch (error) {
    console.error('Download QR SVG error:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading QR code'
    });
  }
};

/**
 * @route   GET /api/user/qr/download/png
 * @desc    Download QR code as PNG
 * @access  Private
 */
exports.downloadQRPNG = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.username) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found. Please generate a QR code first.'
      });
    }

    const qrUrl = buildPublicUrl(user.username);
    const pngBuffer = await generateQRBuffer(qrUrl, 'png');

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'attachment; filename=safepass-qr.png');
    res.send(pngBuffer);

  } catch (error) {
    console.error('Download QR PNG error:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading QR code'
    });
  }
};

/**
 * @route   GET /p/data/:qrId
 * @desc    Get public profile by QR ID (with access logging)
 * @access  Public
 */
exports.getPublicProfile = async (req, res) => {
  try {
    const { qrId } = req.params;

    const user = await User.findOne({ qrId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Check if QR is enabled
    if (!user.qrEnabled) {
      return res.status(403).json({
        success: false,
        message: 'This QR code is currently disabled',
        disabled: true
      });
    }

    // Log access with IP and user agent
    const accessData = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      location: req.headers['x-forwarded-for'] || 'Unknown'
    };

    await user.logQRAccess(accessData);

    console.log(`📱 QR accessed for user: ${user.email} from IP: ${accessData.ipAddress}`);

    res.status(200).json({
      success: true,
      data: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
};
