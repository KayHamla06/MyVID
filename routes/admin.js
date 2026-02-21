const express = require('express');
const router = express.Router();
const {
  getStats,
  getUsers,
  getUserDetail,
  editUser,
  resetUserPassword,
  deleteUser
} = require('../controllers/adminController');

/**
 * Admin Routes
 * Protected by ADMIN_SECRET environment variable in X-Admin-Secret header
 */

/**
 * @route   GET /api/admin/stats
 * @desc    Get dashboard statistics
 * @access  Admin only
 */
router.get('/stats', getStats);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination
 * @access  Admin only
 */
router.get('/users', getUsers);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    Get specific user details
 * @access  Admin only
 */
router.get('/users/:userId', getUserDetail);

/**
 * @route   PUT /api/admin/users/:userId
 * @desc    Edit user details
 * @access  Admin only
 */
router.put('/users/:userId', editUser);

/**
 * @route   POST /api/admin/users/:userId/reset-password
 * @desc    Reset user password
 * @access  Admin only
 */
router.post('/users/:userId/reset-password', resetUserPassword);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete user account
 * @access  Admin only
 */
router.delete('/users/:userId', deleteUser);

module.exports = router;
