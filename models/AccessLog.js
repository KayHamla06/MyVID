const mongoose = require('mongoose');

/**
 * Access Log Model
 * Tracks who accesses QR codes for security and audit purposes
 * This is crucial for emergency situations and detecting misuse
 */
const accessLogSchema = new mongoose.Schema({
  // User whose profile was accessed
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // QR ID that was scanned
  qrId: {
    type: String,
    required: true,
    index: true
  },

  // Access Details
  accessedAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Request Information
  ipAddress: {
    type: String,
    required: true
  },

  userAgent: {
    type: String
  },

  // Geographic Information (if available)
  location: {
    country: String,
    region: String,
    city: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },

  // Device Information
  device: {
    type: String, // mobile, tablet, desktop
    os: String,
    browser: String
  },

  // Referrer (how they got to the page)
  referrer: String,

  // Access Type
  accessType: {
    type: String,
    enum: ['qr_scan', 'direct_link', 'search'],
    default: 'qr_scan'
  },

  // Emergency Context (optional)
  emergencyNote: String,

  // Session tracking
  sessionId: String
}, {
  timestamps: true
});

// Indexes for efficient querying
accessLogSchema.index({ userId: 1, accessedAt: -1 });
accessLogSchema.index({ qrId: 1, accessedAt: -1 });
accessLogSchema.index({ ipAddress: 1, accessedAt: -1 });

// Static method to log access
accessLogSchema.statics.logAccess = async function (data) {
  try {
    return await this.create({
      userId: data.userId,
      qrId: data.qrId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      location: data.location,
      device: data.device,
      referrer: data.referrer,
      accessType: data.accessType || 'qr_scan',
      sessionId: data.sessionId
    });
  } catch (error) {
    console.error('Failed to log access:', error);
    // Don't throw - logging failure shouldn't break the request
    return null;
  }
};

// Static method to get recent access logs for a user
accessLogSchema.statics.getRecentAccess = async function (userId, limit = 10) {
  return this.find({ userId })
    .sort({ accessedAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to detect suspicious access patterns
accessLogSchema.statics.detectSuspiciousActivity = async function (userId) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Get access count in last hour
  const recentAccessCount = await this.countDocuments({
    userId,
    accessedAt: { $gte: oneHourAgo }
  });

  // Flag if accessed more than 10 times in an hour
  if (recentAccessCount > 10) {
    return {
      suspicious: true,
      reason: 'High frequency access',
      count: recentAccessCount
    };
  }

  // Check for access from multiple IPs in short time
  const recentAccess = await this.find({
    userId,
    accessedAt: { $gte: oneHourAgo }
  }).select('ipAddress').lean();

  const uniqueIPs = new Set(recentAccess.map(log => log.ipAddress));

  if (uniqueIPs.size > 5) {
    return {
      suspicious: true,
      reason: 'Multiple IP addresses',
      count: uniqueIPs.size
    };
  }

  return { suspicious: false };
};

module.exports = mongoose.model('AccessLog', accessLogSchema);
