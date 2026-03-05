const express = require('express');
const router = express.Router();

/**
 * @route   GET /email/support
 * @desc    Redirect to email client with support email and pre-filled subject
 * @access  Public
 */
router.get('/support', (req, res) => {
  // Support email (stored securely on backend)
  const supportEmail = 'safepassid@bubble-tech.co.za';
  const subject = 'SafePass ID Support Request';
  const body = 'Hello SafePassID support team,\n\nI need assistance with:\n\n';
  
  // Encode subject and body for URL
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  
  // mailto link format
  const mailtoUrl = `mailto:${supportEmail}?subject=${encodedSubject}&body=${encodedBody}`;
  
  // Redirect to email client
  res.redirect(mailtoUrl);
});

module.exports = router;
