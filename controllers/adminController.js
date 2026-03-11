const User = require('../models/User');
const Post = require('../models/Post');
const StoreItem = require('../models/StoreItem');
const AccessLog = require('../models/AccessLog');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { cloudinary } = require('../config/cloudinary');
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

    const activePost = await Post.findOne({ isActive: true }).select('title createdAt adminName').sort({ createdAt: -1 }).lean();
    const totalPosts = await Post.countDocuments({});
    const totalStoreItems = await StoreItem.countDocuments({ isActive: true });
    const totalScans = await AccessLog.countDocuments({});

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
        recentLogins,
        activePost,
        totalPosts,
        totalStoreItems,
        totalScans
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
      .select('email username firstName lastName phoneNumber country accountStatus qrEnabled qrScanCount createdAt lastLogin verified verifiedMethod')
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
    const user = await User.findById(userId).select('-password -passwordResetToken -passwordResetExpires');

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
      'lastName',
      'phoneNumber',
      'country',
      'accountStatus',
      'medicalAlerts',
      'bloodType',
      'allergies',
      'verified',
      'verifiedMethod'
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

/**
 * @route   GET /api/admin/posts
 * @desc    Get all posts for admin history
 * @access  Admin only
 */
exports.getPosts = async (req, res) => {
  try {
    const adminSecret = req.headers['x-admin-secret'];

    if (!isAdmin(adminSecret)) {
      return res.status(403).json({ success: false, message: 'Unauthorized - Invalid admin credentials' });
    }

    const posts = await Post.find({})
      .populate('reactions.userId', 'firstName lastName email username')
      .populate('comments.userId', 'firstName lastName email username')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: posts });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ success: false, message: 'Error fetching posts' });
  }
};

/**
 * @route   POST /api/admin/posts
 * @desc    Create a new admin announcement post and make it the latest active post
 * @access  Admin only
 */
exports.createPost = async (req, res) => {
  try {
    const adminSecret = req.headers['x-admin-secret'];

    if (!isAdmin(adminSecret)) {
      return res.status(403).json({ success: false, message: 'Unauthorized - Invalid admin credentials' });
    }

    const { title, content, adminName } = req.body;

    if (!title || !content || !adminName) {
      return res.status(400).json({ success: false, message: 'Title, content, and admin name are required' });
    }

    let imageUrl = null;
    if (req.file && req.file.buffer) {
      imageUrl = await uploadBuffer(req.file.buffer, 'admin-posts');
    }

    await Post.updateMany({ isActive: true }, { $set: { isActive: false } });

    const post = await Post.create({
      title: title.trim(),
      content: content.trim(),
      adminName: adminName.trim(),
      imageUrl,
      isActive: true
    });

    res.status(201).json({ success: true, data: post, message: 'Post created successfully' });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ success: false, message: 'Error creating post' });
  }
};

/**
 * @route   GET /api/admin/store-items
 * @desc    Get store items for admin
 * @access  Admin only
 */
exports.getStoreItems = async (req, res) => {
  try {
    const adminSecret = req.headers['x-admin-secret'];

    if (!isAdmin(adminSecret)) {
      return res.status(403).json({ success: false, message: 'Unauthorized - Invalid admin credentials' });
    }

    const items = await StoreItem.find({}).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error('Get store items error:', error);
    res.status(500).json({ success: false, message: 'Error fetching store items' });
  }
};

/**
 * @route   POST /api/admin/store-items
 * @desc    Create a new store item
 * @access  Admin only
 */
exports.createStoreItem = async (req, res) => {
  try {
    const adminSecret = req.headers['x-admin-secret'];

    if (!isAdmin(adminSecret)) {
      return res.status(403).json({ success: false, message: 'Unauthorized - Invalid admin credentials' });
    }

    const { name, description, price, category } = req.body;

    if (!name || !description || !price || !category) {
      return res.status(400).json({ success: false, message: 'Name, description, price, and category are required' });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'Item image is required' });
    }

    const imageUrl = await uploadBuffer(req.file.buffer, 'store-items');

    const item = await StoreItem.create({
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      category: category.trim(),
      imageUrl
    });

    res.status(201).json({ success: true, data: item, message: 'Store item created successfully' });
  } catch (error) {
    console.error('Create store item error:', error);
    res.status(500).json({ success: false, message: 'Error creating store item' });
  }
};

function uploadBuffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `safepassid/${folder}`,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result.secure_url);
      }
    );

    stream.end(buffer);
  });
}
