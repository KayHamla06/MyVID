# Routes Folder

## Purpose
This folder contains all API endpoint definitions (routes) organized by feature. Each route file groups related endpoints and applies appropriate middleware for authentication, validation, and rate limiting.

## Files

### `auth.js`
Authentication-related API endpoints.

**Endpoints:**

| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| POST | `/api/auth/signup` | `authLimiter`, `validateRecaptcha` | Register new user with reCAPTCHA verification |
| POST | `/api/auth/login` | `authLimiter`, `validateRecaptcha` | Authenticate user and return JWT token with reCAPTCHA verification |
| POST | `/api/auth/logout` | `protect` | Clear user session |
| POST | `/api/auth/forgot-password` | `authLimiter`, `validateRecaptcha` | Initiate password reset with identity verification |
| POST | `/api/auth/reset-password` | `passwordResetLimiter` | Complete password reset with verification code |

**Request/Response Examples:**

```javascript
// POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "recaptchaToken": "token_from_google"
}
// Response: { success: true, token: "jwt_token", user: { id, email } }
```

```javascript
// POST /api/auth/forgot-password
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "emergencyContactName": "Jane Doe",
  "emergencyContactPhone": "555-1234",
  "recaptchaToken": "token_from_google"
}
// Response: { success: true, message: "Password reset code sent to email" }
```

---

### `user.js`
User profile and account management endpoints (requires authentication).

**Endpoints:**

| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| GET | `/api/user/profile` | `protect` | Get authenticated user's full profile |
| GET | `/api/user/public-profile/:userId` | None | Get public profile of any user (limited data) |
| PUT | `/api/user/profile` | `protect` | Update user profile information |
| DELETE | `/api/user/account` | `protect`, `authLimiter` | Delete user account and all data |
| POST | `/api/user/upload-photo` | `protect`, `upload.single('photo')` | Upload profile photo to Cloudinary |
| DELETE | `/api/user/delete-photo` | `protect` | Remove profile photo |
| GET | `/api/user/qr-code` | `protect` | Get user's QR code |
| POST | `/api/user/generate-qr` | `protect`, `authLimiter` | Generate new QR code |
| GET | `/api/user/access-logs` | `protect` | Get log of QR code accesses |

---

### `public.js`
Public-facing endpoints (no authentication required).

**Endpoints:**

| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| GET | `/api/public/profile/:qrId` | None | Retrieve public profile by QR ID |
| GET | `/api/public/contacts/:qrId` | None | Get public contacts for a QR ID |
| POST | `/api/public/log-access` | `generalLimiter` | Log QR code scan event |
| GET | `/` | None | Serve landing page |
| GET | `/signup` | None | Serve signup page |
| GET | `/login` | None | Serve login page |
| GET | `/forgot-password` | None | Serve password reset page |
| GET | `/dashboard` | None | Serve dashboard page |
| GET | `/public-profile/:userId` | None | Serve public profile page |

---

## Middleware Usage

### Rate Limiting
- `authLimiter` - 10 requests/15 min (signup, login, forgot-password, delete-account, generate-qr)
- `passwordResetLimiter` - 3 requests/1 hour (reset-password)
- `generalLimiter` - 100 requests/15 min (public endpoints)

### Authentication
- `protect` - Validates JWT token, extracts userId
  - Required for all `/api/user/*` routes
  - Optional for some profile routes

### Validation
- `validateRecaptcha` - Verifies reCAPTCHA token with Google
  - Required on signup, login, forgot-password

### File Upload
- `upload.single('photo')` - Multer middleware for single file upload
  - Max size: 5MB
  - Allowed types: jpg, jpeg, png, gif, webp
  - Uploads to Cloudinary

---

## HTTP Methods & Status Codes

**Success Responses:**
- `200 OK` - Request succeeded
- `201 Created` - Resource created (signup, generate-qr)

**Client Errors:**
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing/invalid authentication token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded

**Server Errors:**
- `500 Internal Server Error` - Server error

---

## Response Format

All endpoints follow consistent response format:

```javascript
// Success
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}

// Error
{
  "success": false,
  "message": "Error description",
  "status": "error"
}
```

---

## Authentication Details

### JWT Token
- **Format:** Bearer token in Authorization header
- **Header:** `Authorization: Bearer <jwt_token>`
- **Expiration:** 7 days
- **Payload:** Contains userId

### reCAPTCHA Validation
- **Service:** Google reCAPTCHA v3
- **Threshold:** Score < 0.5 returns 401
- **Validation:** Happens server-side at `/api/auth/endpoints`
- **Token Source:** Collected on frontend, sent in request body

---

## Route Organization

Routes are modular for maintainability:
1. Each file groups related functionality
2. Middleware applied at route level for security
3. Controllers contain business logic (in `/controllers`)
4. Models define data validation (in `/models`)
5. All routes start with `/api/` except static pages
