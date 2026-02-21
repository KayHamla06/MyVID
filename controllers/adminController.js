const User = require('../models/User');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendAdminPasswordReset } = require('../utils/emailService');

/**
 * Admin Controller
 * Handles all admin operations with strict authorization
 */

/**
 * Check if user is admin (uses ADMIN_SECRET in environment)
 */
const isAdmin = (adminSecret) => {
  return adminSecret === process.env.ADMIN_SECRET;
};

/**
 * @route   GET /api/admin/stats
 * @desc    Get dashboard statistics
 * @access  Admin only
 */
exports.getStats = async (req, res) => {
  try {
    const adminSecret = req.headers['x-admin-secret'];
    
    if (!isAdmin(adminSecret)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized - Invalid admin credentials'
      });
    }

    // Get statistics
    const totalProfiles = await User.countDocuments({ isActive: true });
    const activeQRProfiles = await User.countDocuments({ qrEnabled: true, isActive: true });
    const totalUsers = await User.countDocuments({});
    
    // Get users with at least one login (activity)
    const activeUsers = await User.countDocuments({ lastLogin: { $exists: true, $ne: null } });

    // Get recent logins
    const recentLogins = await User.find({ lastLogin: { $exists: true, $ne: null } })
      .select('email firstName lastLogin')
      .sort({ lastLogin: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        totalProfiles,
        activeQRProfiles,
        totalUsers,
        activeUsers,
        recentLogins
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
};

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination
 * @access  Admin only
 */
exports.getUsers = async (req, res) => {
  try {
    const adminSecret = req.headers['x-admin-secret'];
    
    if (!isAdmin(adminSecret)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized - Invalid admin credentials'
      });
    }

    const { page = 1, limit = 50, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build search query
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { email: new RegExp(search, 'i') },
          { firstName: new RegExp(search, 'i') },
          { phoneNumber: new RegExp(search, 'i') }
        ]
      };
    }

    const users = await User.find(searchQuery)
      .select('email firstName phoneNumber country accountStatus qrEnabled createdAt lastLogin')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
};

/**
 * @route   GET /api/admin/users/:userId
 * @desc    Get specific user details
 * @access  Admin only
 */
exports.getUserDetail = async (req, res) => {
  try {
    const adminSecret = req.headers['x-admin-secret'];
    
    if (!isAdmin(adminSecret)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized - Invalid admin credentials'
      });
    }

    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get user detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user details'
    });
  }
};

/**
 * @route   PUT /api/admin/users/:userId
 * @desc    Edit user details
 * @access  Admin only
 */
exports.editUser = async (req, res) => {
  try {
    const adminSecret = req.headers['x-admin-secret'];
    
    if (!isAdmin(adminSecret)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized - Invalid admin credentials'
      });
    }

    const { userId } = req.params;
    const allowedFields = [
      'firstName',
      'phoneNumber',
      'country',
      'accountStatus',
      'medicalAlerts',
      'fullDetails'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`📝 Admin updated user: ${user.email}`);

    res.status(200).json({
      success: true,
      data: user,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Edit user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user'
    });
  }
};

/**
 * @route   POST /api/admin/users/:userId/reset-password
 * @desc    Reset user password with temporary password
 * @access  Admin only
 */
exports.resetUserPassword = async (req, res) => {
  try {
    const adminSecret = req.headers['x-admin-secret'];
    
    if (!isAdmin(adminSecret)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized - Invalid admin credentials'
      });
    }

    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');

    // Hash password
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(tempPassword, salt);
    user.passwordResetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 minutes

    await user.save();

    // Send email notification
    await sendAdminPasswordReset(user.email, tempPassword);

    console.log(`🔐 Admin reset password for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. User will receive email with temporary password.',
      userId: user._id,
      email: user.email
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  }
};

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete user account
 * @access  Admin only
 */
exports.deleteUser = async (req, res) => {
  try {
    const adminSecret = req.headers['x-admin-secret'];
    
    if (!isAdmin(adminSecret)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized - Invalid admin credentials'
      });
    }

    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const email = user.email;
    await User.findByIdAndDelete(userId);

    console.log(`🗑️  Admin deleted user: ${email}`);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      email
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
};
