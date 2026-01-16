const QRCode = require('qrcode');

exports.generateQR = (url, format = 'svg') => {
  return new Promise((resolve, reject) => {
    QRCode.toDataURL(url, { type: format }, (err, dataUrl) => {
      if (err) reject(err);
      else resolve(dataUrl);
    });
  });
};

exports.generateQRBuffer = (url, format = 'svg') => {
  return new Promise((resolve, reject) => {
    const opts = { type: format };
    if (format === 'svg') opts.rendererOpts = { deflate: false };
    QRCode.toBuffer(url, opts, (err, buffer) => {
      if (err) reject(err);
      else resolve(buffer);
    });
  });
};