const User = require('../models/User');
const { sendAccountDeletionRequest } = require('../utils/emailService');

/**
 * @route   GET /api/user/profile
 * @desc    Get current user profile (safe, filtered data)
 * @access  Private
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return only safe profile data (backend determines what's safe)
    res.status(200).json({
      success: true,
      data: user.getSafeProfile()
    });

  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
};

/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile with strict field validation
 * @access  Private
 */
exports.updateProfile = async (req, res) => {
  try {
    // WHITELIST APPROACH: Only allow specific fields to be updated
    const allowedFields = [
      'firstName',
      'firstNameVisible',
      'lastName',
      'lastNameVisible',
      'phoneNumber',
      'phoneVisible',
      'country',
      'countryVisible',
      'emergencyContacts',
      'emergencyContactsVisible',
      'medicalAlerts',
      'medicalAlertsVisible',
      'medicalNotes',
      'medicalNotesVisible',
      'fullDetails',
      'addressVisible',
      'dobVisible'
    ];

    // Build updates object with only whitelisted fields
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        // Sanitize and validate
        if (key === 'phoneNumber' && req.body[key]) {
          updates[key] = String(req.body[key]).trim();
        } else if (typeof req.body[key] === 'boolean') {
          updates[key] = Boolean(req.body[key]);
        } else if (Array.isArray(req.body[key])) {
          updates[key] = req.body[key];
        } else if (key === 'fullDetails' && typeof req.body[key] === 'object') {
          updates[key] = req.body[key];
        } else {
          updates[key] = req.body[key];
        }
      }
    });

    // Always verify user ownership before updating
    let user;
    try {
      user = await User.findByIdAndUpdate(
        req.user.id,
        updates,
        { new: true, runValidators: true }
      );
    } catch (updateError) {
      console.error('Database update error:', updateError.message);
      
      if (updateError.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'This value is already in use'
        });
      }
      
      if (updateError.name === 'ValidationError') {
        const messages = Object.values(updateError.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: messages.join('. ')
        });
      }
      
      throw updateError;
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`✅ Profile updated for user: ${user.email}`);

    // Return only safe profile data
    res.status(200).json({
      success: true,
      data: user.getSafeProfile()
    });

  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
};

/**
 * @route   GET /api/user/qr/access-logs
 * @desc    Get QR code access logs
 * @access  Private
 */
exports.getQRAccessLogs = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return only safe log data
    const logs = (user.qrAccessLogs || []).map(log => ({
      timestamp: log.timestamp,
      ipAddress: maskIpAddress(log.ipAddress),
      userAgent: log.userAgent ? log.userAgent.substring(0, 100) : 'Unknown' // Truncate for privacy
    }));

    res.status(200).json({
      success: true,
      data: logs,
      total: logs.length
    });

  } catch (error) {
    console.error('Get access logs error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching access logs'
    });
  }
};

/**
 * Mask IP address for privacy (e.g., 192.168.*.*)  
 */
function maskIpAddress(ip) {
  if (!ip) return 'Unknown';
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.* `;
  }
  return ip;
}

module.exports = exports;

/**
 * @route   GET /api/user/qr/access-logs
 * @desc    Get QR code access logs
 * @access  Private
 */
exports.getQRAccessLogs = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return last 50 access logs
    const logs = user.qrAccessLogs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);

    res.status(200).json({
      success: true,
      data: logs
    });

  } catch (error) {
    console.error('Get QR access logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching access logs'
    });
  }
};

/**
 * @route   DELETE /api/user/account
 * @desc    Request account deletion (sends email to admin for review)
 * @access  Private
 */
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to delete account'
      });
    }

    // Verify password
    const user = await User.findById(req.user.id).select('+password');
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Mark account for deletion (pending admin approval)
    user.accountStatus = 'pending_deletion';
    user.qrEnabled = false; // Disable QR immediately
    await user.save();

    // Send email notification to admin
    await sendAccountDeletionRequest(user);

    console.log(`📧 Account deletion request submitted: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Your account deletion request has been submitted. An administrator will review and process your request shortly.'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing account deletion request'
    });
  }
};
