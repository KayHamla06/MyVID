const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Validate Cloudinary environment variables
const validateCloudinaryConfig = () => {
  const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`❌ Missing Cloudinary config: ${missing.join(', ')}`);
    return false;
  }
  return true;
};

// Configure Cloudinary
const isConfigured = validateCloudinaryConfig();

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('☁️  Cloudinary configured');
} else {
  console.warn('⚠️  Cloudinary not configured - uploads will fail');
}

// Health check for Cloudinary
const checkCloudinaryHealth = async () => {
  if (!isConfigured) {
    return { healthy: false, message: 'Not configured' };
  }
  try {
    const result = await cloudinary.api.ping();
    return { healthy: result.status === 'ok', message: 'Connected' };
  } catch (error) {
    return { healthy: false, message: error.message };
  }
};

// Use multer memory storage and upload buffer to Cloudinary in controller
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
  }
});

module.exports = { cloudinary, upload, checkCloudinaryHealth, isConfigured };
