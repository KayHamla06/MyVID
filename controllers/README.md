# Controllers Folder

## Purpose
This folder contains business logic controllers that handle the core functionality of the application. Each controller processes requests and returns responses for specific features.

## Files

### `authController.js`
Handles all authentication-related operations.

**Key Functions:**
- `signup()` - User registration with reCAPTCHA validation
- `login()` - User login with JWT token generation and reCAPTCHA validation
- `logout()` - Clears user session
- `forgotPassword()` - Initiates password reset flow with identity verification
- `resetPassword()` - Completes password reset with verification code
- `verifyRecaptcha()` - Validates reCAPTCHA tokens with Google API

**Security Features:**
- Password hashing with bcryptjs
- JWT token generation (7-day expiration)
- reCAPTCHA v3 verification on signup/login
- Rate limiting on authentication attempts

### `Usercontroller.js`
Manages user profile and account operations.

**Key Functions:**
- `updateProfile()` - Updates user profile information
- `getUserProfile()` - Retrieves authenticated user's profile
- `deleteAccount()` - Deletes user account and related data
- `getPublicProfile()` - Gets user's public profile (limited data)

### `Qrcontroller.js`
Handles QR code generation and management.

**Key Functions:**
- `generateQR()` - Creates QR code for user
- `getQRCode()` - Retrieves user's existing QR code
- `validateQRAccess()` - Logs and validates QR code access

### `Uploadcontroller.js`
Manages file uploads to Cloudinary.

**Key Functions:**
- `uploadPhoto()` - Uploads user photo to Cloudinary
- `deletePhoto()` - Removes photo from Cloudinary
- `validateFile()` - Validates file type and size before upload

**Supported Formats:** JPG, JPEG, PNG, GIF, WEBP (Max 5MB)

## Request/Response Pattern
All controllers follow the standard pattern:
```javascript
(req, res) => {
  // Process request
  // Return res.status(code).json({success: boolean, message: string, data: any})
}
```

## Error Handling
Controllers use the global error handler middleware. Thrown errors are caught and formatted consistently.
