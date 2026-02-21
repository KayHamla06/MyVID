const User = require('../models/User');
const { cloudinary, isConfigured } = require('../config/cloudinary');
const { validateImage, getCloudinaryOptions, getOptimizedImageUrl } = require('../utils/imageOptimization');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

/**
 * Multer middleware for single file upload
 */
exports.uploadMiddleware = upload.single('photo');

/**
 * @route   POST /api/user/upload-photo
 * @desc    Upload profile photo to Cloudinary with compression
 * @access  Private
 */
exports.uploadPhoto = async (req, res) => {
  try {
    // Check if Cloudinary is configured
    if (!isConfigured) {
      return res.status(503).json({
        success: false,
        message: 'Image upload service is not configured. Please contact support.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    // Validate image
    const validation = validateImage(req.file);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join('; ')
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete old photo from Cloudinary if exists
    if (user.profilePhoto) {
      try {
        // Extract public_id from Cloudinary URL
        const urlParts = user.profilePhoto.split('/');
        const publicIdWithExt = urlParts[urlParts.length - 1];
        const publicId = `safepassid/profiles/${publicIdWithExt.split('.')[0]}`;

        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        console.warn('Error deleting old photo:', error.message);
        // Continue even if deletion fails
      }
    }

    // Upload to Cloudinary using optimized buffer
    const uploadOptions = getCloudinaryOptions();
    
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(req.file.buffer);
    });

    const result = await uploadPromise;

    // Update user profile with Cloudinary URL
    user.profilePhoto = result.secure_url;
    await user.save();

    console.log(`✅ Photo uploaded for user: ${user.email} (${(validation.size / 1024 / 1024).toFixed(2)}MB)`);

    res.status(200).json({
      success: true,
      message: 'Photo uploaded successfully',
      photoUrl: result.secure_url,
      optimizedUrls: {
        thumbnail: getOptimizedImageUrl(result.secure_url, 'thumbnail'),
        medium: getOptimizedImageUrl(result.secure_url, 'medium'),
        original: result.secure_url
      }
    });

  } catch (error) {
    console.error('Upload photo error:', error);

    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({
        success: false,
        message: 'Only image files (JPG, PNG, GIF, WebP) are allowed'
      });
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error uploading photo. Please try again.'
    });
  }
};

/**
 * Handle multer errors
 */
exports.handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  next();
};
