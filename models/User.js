const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const UserSchema = new mongoose.Schema({
  // Authentication
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password by default
  },

  // Security features
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordResetAttempts: {
    type: Number,
    default: 0
  },
  passwordResetLockUntil: {
    type: Date
  },

  // Basic Profile Information
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  country: {
    type: String,
    trim: true,
    maxlength: [100, 'Country cannot exceed 100 characters']
  },
  profilePhoto: {
    type: String, // Cloudinary URL
    default: null
  },

  // Full Details (Private - for password recovery)
  fullDetails: {
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    address: {
      type: String,
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters']
    },
    dob: {
      type: Date
    }
  },

  // Emergency Contacts
  emergencyContacts: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Contact name cannot exceed 100 characters']
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[\d\s\-\+\(\)]+$/.test(v);
        },
        message: 'Please provide a valid phone number'
      }
    },
    isPublic: {
      type: Boolean,
      default: false
    }
  }],

  // Medical Information
  medicalAlerts: [{
    type: String,
    trim: true,
    maxlength: [200, 'Medical alert cannot exceed 200 characters']
  }],
  medicalNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Medical notes cannot exceed 1000 characters']
  },

  // QR Code Configuration
  qrId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values
  },
  qrEnabled: {
    type: Boolean,
    default: false
  },
  qrAccessLogs: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String,
    location: String
  }],

  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  accountStatus: {
    type: String,
    enum: ['active', 'locked', 'suspended'],
    default: 'active'
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Virtual for account locked status
UserSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Indexes for performance (email and qrId already indexed via unique: true)
UserSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
UserSchema.pre('save', async function (next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch {
    throw new Error('Password comparison failed');
  }
};

// Method to increment login attempts
UserSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }

  // Otherwise, increment attempts
  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after max attempts
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
  const lockTime = parseInt(process.env.LOCKOUT_TIME) || 900000; // 15 minutes

  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }

  return this.updateOne(updates);
};

// Method to reset login attempts
UserSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// Virtual for password reset locked status
UserSchema.virtual('isPasswordResetLocked').get(function () {
  return !!(this.passwordResetLockUntil && this.passwordResetLockUntil > Date.now());
});

// Method to increment password reset attempts
UserSchema.methods.incPasswordResetAttempts = function () {
  const maxAttempts = 5;
  const lockTime = 30 * 60 * 1000; // 30 minutes

  // If previous lock expired, reset counter
  if (this.passwordResetLockUntil && this.passwordResetLockUntil < Date.now()) {
    return this.updateOne({
      $set: { passwordResetAttempts: 1 },
      $unset: { passwordResetLockUntil: 1 }
    });
  }

  const updates = { $inc: { passwordResetAttempts: 1 } };

  if (this.passwordResetAttempts + 1 >= maxAttempts && !this.isPasswordResetLocked) {
    updates.$set = { passwordResetLockUntil: Date.now() + lockTime };
  }

  return this.updateOne(updates);
};

// Method to reset password reset attempts
UserSchema.methods.resetPasswordResetAttempts = function () {
  return this.updateOne({
    $set: { passwordResetAttempts: 0 },
    $unset: { passwordResetLockUntil: 1 }
  });
};

// Method to get safe user data (no sensitive info)
UserSchema.methods.getSafeProfile = function () {
  return {
    id: this._id,
    email: this.email,
    firstName: this.firstName,
    country: this.country,
    profilePhoto: this.profilePhoto,
    emergencyContacts: this.emergencyContacts,
    medicalAlerts: this.medicalAlerts,
    medicalNotes: this.medicalNotes,
    fullDetails: this.fullDetails,
    qrId: this.qrId,
    qrEnabled: this.qrEnabled,
    createdAt: this.createdAt,
    lastLogin: this.lastLogin
  };
};

// Method to get public profile data (for QR code access)
UserSchema.methods.getPublicProfile = function () {
  const publicContacts = this.emergencyContacts.filter(c => c.isPublic);

  return {
    firstName: this.firstName,
    country: this.country,
    profilePhoto: this.profilePhoto,
    medicalAlerts: this.medicalAlerts,
    emergencyContacts: publicContacts.map(c => ({
      name: c.name,
      phone: c.phone
    }))
  };
};

// Method to log QR access
UserSchema.methods.logQRAccess = async function (accessData) {
  this.qrAccessLogs.push({
    timestamp: new Date(),
    ipAddress: accessData.ipAddress,
    userAgent: accessData.userAgent,
    location: accessData.location || 'Unknown'
  });

  // Keep only last 100 logs
  if (this.qrAccessLogs.length > 100) {
    this.qrAccessLogs = this.qrAccessLogs.slice(-100);
  }

  await this.save();
};

// Method to verify identity information for password reset flows
// Returns { success: boolean, failedField?: string } to indicate which field failed
UserSchema.methods.verifyIdentity = function (info = {}) {
  try {
    const providedFirst = (info.firstName || '').toString().trim().toLowerCase();
    const providedLast = (info.lastName || '').toString().trim().toLowerCase();
    const providedDob = info.dateOfBirth ? new Date(info.dateOfBirth).toISOString().slice(0,10) : null;
    const providedContactName = (info.emergencyContactName || '').toString().trim().toLowerCase();
    const providedContactPhone = (info.emergencyContactPhone || '').toString().trim().replace(/\s+/g, '');

    const userFirst = (this.firstName || '').toString().trim().toLowerCase();
    const userLast = (this.fullDetails && this.fullDetails.lastName) ? this.fullDetails.lastName.toString().trim().toLowerCase() : '';
    const userDob = (this.fullDetails && this.fullDetails.dob) ? new Date(this.fullDetails.dob).toISOString().slice(0,10) : null;

    // Check first name
    if (!userFirst || providedFirst !== userFirst) {
      return { success: false, failedField: 'firstName' };
    }

    // Check last name
    if (!userLast || providedLast !== userLast) {
      return { success: false, failedField: 'lastName' };
    }

    // Check date of birth
    if (!userDob || !providedDob || providedDob !== userDob) {
      return { success: false, failedField: 'dateOfBirth' };
    }

    // Check emergency contact (must have at least one contact to verify against)
    if (!this.emergencyContacts || this.emergencyContacts.length === 0) {
      return { success: false, failedField: 'emergencyContact', reason: 'No emergency contacts on file' };
    }

    const contactMatch = this.emergencyContacts.some(c => {
      const storedName = (c.name || '').toString().trim().toLowerCase();
      const storedPhone = (c.phone || '').toString().trim().replace(/\s+/g, '');
      return storedName === providedContactName && storedPhone === providedContactPhone;
    });

    if (!contactMatch) {
      return { success: false, failedField: 'emergencyContact' };
    }

    return { success: true };
  } catch (_err) {
    return { success: false, failedField: 'unknown', reason: 'Verification error' };
  }
};

module.exports = mongoose.model('User', UserSchema);
