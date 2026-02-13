const User = require('../models/User');

/**
 * @route   GET /api/user/profile
 * @desc    Get current user profile
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

    res.status(200).json({
      success: true,
      data: user.getSafeProfile()
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
};

/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile
 * @access  Private
 */
exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      'firstName',
      'country',
      'emergencyContacts',
      'medicalAlerts',
      'medicalNotes',
      'fullDetails'
    ];

    const updates = {};

    // Only allow specific fields to be updated
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`✅ Profile updated for user: ${user.email}`);

    res.status(200).json({
      success: true,
      data: user.getSafeProfile()
    });

  } catch (error) {
    console.error('Update profile error:', error);
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
 * @desc    Delete user account (soft delete)
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

    // Soft delete - deactivate account
    user.isActive = false;
    user.accountStatus = 'suspended';
    user.qrEnabled = false;
    await user.save();

    console.log(`⚠️  Account deleted: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account'
    });
  }
};
