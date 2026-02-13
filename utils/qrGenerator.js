const QRCode = require('qrcode');
const config = require('../config/environment');

// Helper to build public profile URL for a given QR id
exports.buildPublicUrl = (qrId) => `${config.baseURL.replace(/\/$/, '')}/p/${qrId}`;

/**
 * Generate QR code as data URL for display
 * @param {string} url - URL to encode in QR code
 * @returns {Promise<string>} - Base64 data URL
 */
exports.generateQR = async (url) => {
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H' // High error correction for better scanning
    });
    return dataUrl;
  } catch (err) {
    console.error('QR generation error:', err);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate QR code as buffer for download
 * @param {string} url - URL to encode in QR code
 * @param {string} format - 'svg' or 'png'
 * @returns {Promise<Buffer>} - File buffer
 */
exports.generateQRBuffer = async (url, format = 'png') => {
  try {
    if (format === 'svg') {
      const svgString = await QRCode.toString(url, {
        type: 'svg',
        width: 300,
        margin: 2,
        errorCorrectionLevel: 'H'
      });
      return Buffer.from(svgString);
    } else {
      const buffer = await QRCode.toBuffer(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H'
      });
      return buffer;
    }
  } catch (err) {
    console.error('QR buffer generation error:', err);
    throw new Error('Failed to generate QR code buffer');
  }
};
