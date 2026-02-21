/**
 * Image Optimization Utility
 * Prepares image buffers for upload with size constraints
 */

/**
 * Optimize image buffer
 * Reduces file size by limiting dimensions and quality
 * @param {Buffer} buffer - Original image buffer
 * @param {Object} options - Compression options
 * @returns {Buffer} - Optimized image buffer
 */
exports.optimizeImageBuffer = (buffer, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024,  // 5MB
    quality = 0.8  // 80% quality
  } = options;

  // If buffer is already small enough, return as-is
  if (buffer.length <= maxSize) {
    return buffer;
  }

  // For very large files, we still return the buffer
  // Cloudinary will handle the heavy lifting
  // This utility prevents memory issues by validating size
  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error('Image file too large. Maximum 10MB allowed.');
  }

  // Buffer optimization would require sharp or jimp
  // Since we're using Cloudinary for upload, we let Cloudinary
  // handle the image optimization on their servers
  // This reduces server memory usage and CPU load
  return buffer;
};

/**
 * Validate image file
 * @param {Object} file - Multer file object
 * @returns {Object} - Validation result
 */
exports.validateImage = (file) => {
  const errors = [];

  // Check file exists
  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors };
  }

  // Check MIME type
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];

  if (!allowedMimes.includes(file.mimetype)) {
    errors.push(`Invalid image type: ${file.mimetype}. Allowed types: JPEG, PNG, GIF, WebP, SVG`);
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum of 5MB`);
  }

  // Check minimum file size (prevent empty files)
  if (file.size < 1024) {
    errors.push('File is too small. Minimum 1KB required.');
  }

  return {
    valid: errors.length === 0,
    errors,
    size: file.size,
    type: file.mimetype
  };
};

/**
 * Get Cloudinary upload options for profile photos
 * Optimizes for storage and bandwidth
 * @returns {Object} - Cloudinary options
 */
exports.getCloudinaryOptions = () => {
  return {
    folder: 'safepassid/profiles',
    resource_type: 'auto',
    eager: [
      {
        // Generate optimized thumbnail (100x100)
        width: 100,
        height: 100,
        crop: 'fill',
        format: 'webp',
        quality: 'auto'
      },
      {
        // Generate medium version (300x300)
        width: 300,
        height: 300,
        crop: 'fill',
        format: 'webp',
        quality: 'auto'
      }
    ],
    eager_async: true,
    transformation: [
      {
        quality: 'auto',
        fetch_format: 'auto' // Serve best format for client
      }
    ]
  };
};

/**
 * Get optimized image URL for display
 * Returns WebP format for modern browsers with fallback
 * @param {string} cloudinaryUrl - Original Cloudinary URL
 * @param {string} size - Size variant: 'thumbnail', 'medium', 'original'
 * @returns {string} - Optimized image URL
 */
exports.getOptimizedImageUrl = (cloudinaryUrl, size = 'medium') => {
  if (!cloudinaryUrl) return null;

  // Parse Cloudinary URL and apply transformations
  const sizeMap = {
    thumbnail: 'w_100,h_100,c_fill,f_auto,q_auto',
    medium: 'w_300,h_300,c_fill,f_auto,q_auto',
    original: 'f_auto,q_auto'
  };

  const transformation = sizeMap[size] || sizeMap.medium;

  // Insert transformation before the filename
  // URL format: https://res.cloudinary.com/cloud_name/image/upload/v.../filename
  if (cloudinaryUrl.includes('/upload/')) {
    return cloudinaryUrl.replace(
      '/upload/',
      `/upload/${transformation}/`
    );
  }

  return cloudinaryUrl;
};

/**
 * Estimate image complexity for optimization decisions
 * @param {Buffer} buffer - Image buffer
 * @returns {string} - Complexity level: 'low', 'medium', 'high'
 */
exports.estimateImageComplexity = (buffer) => {
  // Simple heuristic: larger files = potentially more complex
  const sizeKB = buffer.length / 1024;

  if (sizeKB < 50) return 'low';
  if (sizeKB < 500) return 'medium';
  return 'high';
};
