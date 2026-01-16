const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String },
  profilePhoto: { type: String },
  country: { type: String },
  emergencyContacts: [{
    name: String,
    phone: String,
    isPublic: { type: Boolean, default: false }
  }],
  medicalAlerts: [{ type: String }],
  medicalNotes: { type: String },
  fullDetails: {
    lastName: String,
    address: String,
    dob: Date
  },
  qrId: { type: String, unique: true },
  qrEnabled: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  this.updatedAt = Date.now();
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);