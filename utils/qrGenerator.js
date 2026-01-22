const QRCode = require('qrcode');

// Generate QR code as data URL for display
exports.generateQR = async (url, format = 'png') => {
  try {
    // Always use toDataURL for display (returns base64 data URL)
    const dataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return dataUrl;
  } catch (err) {
    console.error('QR generation error:', err);
    throw err;
  }
};

// Generate QR code as buffer for download
exports.generateQRBuffer = async (url, format = 'png') => {
  try {
    if (format === 'svg') {
      // For SVG, use toString
      const svgString = await QRCode.toString(url, {
        type: 'svg',
        width: 300,
        margin: 2
      });
      return Buffer.from(svgString);
    } else {
      // For PNG, use toBuffer
      const buffer = await QRCode.toBuffer(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return buffer;
    }
  } catch (err) {
    console.error('QR buffer generation error:', err);
    throw err;
  }
};