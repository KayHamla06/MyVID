const nodemailer = require('nodemailer');
const config = require('../config/environment');

/**
 * Email Service
 * Handles all email notifications
 */

// Initialize transporter (uses environment variables for credentials)
const getTransporter = () => {
  // Gmail or custom SMTP configuration
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USERNAME || process.env.ADMIN_EMAIL,
      pass: process.env.EMAIL_PASSWORD || process.env.ADMIN_EMAIL_PASSWORD
    }
  });
};

/**
 * Send account deletion request notification to admin
 * @param {Object} user - User document
 * @returns {Promise<void>}
 */
exports.sendAccountDeletionRequest = async (user) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@safepassid.xyz';
    
    // Check if email credentials are configured
    if (!process.env.EMAIL_USERNAME && !adminEmail) {
      console.warn('⚠️  Email service not configured. Account deletion notification not sent.');
      return;
    }

    const transporter = getTransporter();

    const userDetails = `
User ID: ${user._id}
Email: ${user.email}
Phone: ${user.phoneNumber || 'Not provided'}
Name: ${user.firstName || ''} ${user.fullDetails?.lastName || ''}
Country: ${user.country || 'Not specified'}
Account Created: ${new Date(user.createdAt).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}
Last Login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}) : 'Never'}
QR Enabled: ${user.qrEnabled ? 'Yes' : 'No'}
    `;

    const mailOptions = {
      from: process.env.EMAIL_USERNAME || adminEmail,
      to: adminEmail,
      subject: `[URGENT] Account Deletion Request - ${user.email}`,
      html: `
        <h2>Account Deletion Request</h2>
        <p><strong>A user has requested to delete their account. Please review and take action:</strong></p>
        <pre>${userDetails}</pre>
        <hr>
        <p><strong>Required Actions:</strong></p>
        <ul>
          <li>Review user data for any compliance or legal requirements</li>
          <li>Back up important information if needed</li>
          <li>Delete the user account from database if approved</li>
          <li>Send confirmation email to user</li>
          <li>Update audit logs</li>
        </ul>
        <hr>
        <p>Timestamp: ${new Date().toISOString()}</p>
        <p>This is an automated message from SafePass ID.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Account deletion notification sent to ${adminEmail}`);

  } catch (error) {
    console.error('Error sending account deletion email:', error.message);
    // Don't throw - deletion request should proceed even if email fails
  }
};

/**
 * Send password reset email to user
 * @param {string} email - User email
 * @param {string} resetToken - Reset token
 * @returns {Promise<void>}
 */
exports.sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@safepassid.xyz';
    
    if (!process.env.EMAIL_USERNAME && !adminEmail) {
      console.warn('⚠️  Email service not configured. Password reset email not sent.');
      return;
    }

    const transporter = getTransporter();
    const baseURL = config.baseURL;

    const mailOptions = {
      from: process.env.EMAIL_USERNAME || adminEmail,
      to: email,
      subject: 'SafePass ID - Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. If you did not make this request, please ignore this email.</p>
        <p>Your password reset token: <strong>${resetToken}</strong></p>
        <p>This token will expire in 30 minutes.</p>
        <a href="${baseURL}/reset-password?token=${resetToken}" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Reset Password</a>
        <hr>
        <p>SafePass ID Team</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`);

  } catch (error) {
    console.error('Error sending password reset email:', error.message);
  }
};

/**
 * Send admin notification for admin password reset
 * @param {string} email - Admin email
 * @param {string} tempPassword - Temporary password
 * @returns {Promise<void>}
 */
exports.sendAdminPasswordReset = async (email, tempPassword) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@safepassid.xyz';
    
    if (!process.env.EMAIL_USERNAME) {
      console.warn('⚠️  Email service not configured. Admin notification not sent.');
      return;
    }

    const transporter = getTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: '[ADMIN] Your Password Has Been Reset',
      html: `
        <h2>Your Password Has Been Reset by an Administrator</h2>
        <p>Your temporary password is: <strong>${tempPassword}</strong></p>
        <p>Please log in and change your password immediately.</p>
        <p>For security, you will be forced to change your password on next login.</p>
        <hr>
        <p>SafePass ID Team</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Admin password reset notification sent to ${email}`);

  } catch (error) {
    console.error('Error sending admin password reset email:', error.message);
  }
};
