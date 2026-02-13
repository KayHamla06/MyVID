# Models Folder

## Purpose
This folder contains Mongoose schema definitions that define the structure, validation rules, and methods for data stored in MongoDB.

## Files

### `User.js`
Defines the User data model - the core schema for all user accounts.

**Schema Fields:**
- `email` (String, unique, required) - User's email address
- `password` (String, required) - Hashed password (bcryptjs with salt rounds 10)
- `firstName` (String) - User's first name
- `lastName` (String) - User's last name
- `phoneNumber` (String) - Contact phone number
- `dateOfBirth` (Date) - User's date of birth
- `qrId` (String, unique, sparse) - Unique QR code identifier
- `profilePhoto` (String) - Cloudinary URL to profile picture
- `medicalAlerts` (Array) - Health/medical alert information
- `emergencyContacts` (Array) - Emergency contact information
- `publicContacts` (Array) - Public-facing contact details
- `qrAccessLogs` (Array) - Log of QR code scans
- `resetPasswordToken` (String) - Token for password reset flow
- `resetPasswordExpires` (Date) - Expiration time for reset token
- `createdAt` (Date, indexed) - Account creation timestamp

**Instance Methods:**
- `comparePassword(candidatePassword)` - Validates password against hashed password
- `verifyIdentity(identityData)` - Verifies user identity during password reset
- `logQRAccess(accessInfo)` - Records QR code scan event
- `getSafeProfile()` - Returns user profile without sensitive data
- `getPublicProfile()` - Returns public-facing profile (name, photo, public contacts)

**Pre-save Middleware:**
- Automatically hashes password if modified before saving
- Only runs if `isModified('password')` to avoid rehashing

**Indexes:**
- `email` (unique) - Fast email lookups
- `qrId` (unique, sparse) - Fast QR code lookups
- `createdAt` - Efficient sorting by creation date

**Validation:**
- Email format validation using regex
- Password required on signup
- Unique constraint on email and qrId

### `AccessLog.js`
Records access events when users' QR codes are scanned.

**Schema Fields:**
- `userId` (ObjectId, required) - Reference to User who owns the QR code
- `accessorId` (ObjectId) - Reference to User who scanned the code
- `accessorType` (String) - Type of accessor (e.g., "public", "emergency", "medical")
- `timestamp` (Date, default: now) - When the access occurred
- `location` (Object) - Geographic location of access (latitude, longitude)
- `deviceInfo` (String) - Device/browser that scanned the code
- `accessReason` (String) - Reason for accessing the QR code

**Indexes:**
- `userId` (ascending) - Fast lookups of who accessed this user's QR
- `timestamp` (descending) - Efficient chronological sorting
- `userId + timestamp` (compound) - Combined query optimization

**Purpose:**
- Audit trail for QR code access
- Security monitoring for unauthorized access attempts
- Analytics on QR code usage patterns

## Mongoose Configuration
- Version: mongoose 8.0.0
- Connection managed in `config/Database.js`
- Validation errors provide detailed field-level feedback
- Pre-save hooks for automatic field processing

## Database Indexes
All indexes are created automatically on Mongoose connection. Key indexes:
- User email (unique)
- User qrId (unique, sparse)
- AccessLog userId (ascending)
- AccessLog timestamp (descending)

This ensures optimal query performance for common lookups.
