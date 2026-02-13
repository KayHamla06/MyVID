const User = require('../models/User');
const { cloudinary } = require('../config/cloudinary');
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
 * @desc    Upload profile photo to Cloudinary
 * @access  Private
 */
exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
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
        const publicId = `safepass/${publicIdWithExt.split('.')[0]}`;

        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        console.warn('Error deleting old photo:', error.message);
        // Continue even if deletion fails
      }
    }

    // Upload to Cloudinary using buffer
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'safepass',
          transformation: [
            { width: 500, height: 500, crop: 'limit' },
            { quality: 'auto', fetch_format: 'auto' }
          ]
        },
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

    console.log(`✅ Photo uploaded for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Photo uploaded successfully',
      photoUrl: result.secure_url
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
