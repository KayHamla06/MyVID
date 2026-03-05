const express = require('express');
const router = express.Router();

/**
 * @route   GET /whatsapp/support
 * @desc    Redirect to WhatsApp support with pre-filled message
 * @access  Public
 */
router.get('/support', (req, res) => {
  // WhatsApp support number (stored securely on backend)
  const supportNumber = '27768514048'; // Format: country code + number
  const message = 'Hello SafePassID support team, can you please assist me with this?';
  
  // Encode the message for URL
  const encodedMessage = encodeURIComponent(message);
  
  // WhatsApp API URL format: https://wa.me/[number]?text=[message]
  const whatsappUrl = `https://wa.me/${supportNumber}?text=${encodedMessage}`;
  
  // Redirect to WhatsApp
  res.redirect(whatsappUrl);
});

module.exports = router;
