# Middleware Folder

## Purpose
This folder contains middleware functions that process requests, manage security, handle errors, and enforce rate limiting across the application.

## Files

### `auth.js`
Handles authentication and security verification middleware.

**Key Functions:**
- `validateRecaptcha(req, res, next)` - Validates reCAPTCHA tokens with Google API
  - Extracts token from request body
  - Sends token to Google reCAPTCHA API
  - Returns 401 if score < 0.5 (likely bot activity)
  - Moves to next middleware if valid

- `protect(req, res, next)` - JWT authentication middleware
  - Extracts JWT token from Authorization header
  - Verifies token signature using JWT_SECRET
  - Attaches `req.userId` for use in protected routes
  - Returns 401 if token missing or invalid
  - Moves to next middleware if authenticated

**Usage:**
```javascript
// In routes:
router.post('/protected-route', protect, controllerFunction);
router.post('/auth-route', validateRecaptcha, controllerFunction);
```

### `Errorhandler.js`
Global error handling middleware for the entire application.

**Key Features:**
- Catches all thrown errors and exceptions
- Formats consistent error responses
- Handles specific error types:
  - **CastError** - Invalid MongoDB object IDs
  - **ValidationError** - Schema validation failures
  - **Duplicate Key Error** - Violation of unique constraints
  - **JWT Errors** - Invalid or expired tokens
  - **Custom AppError** - Application-specific errors

**Error Response Format:**
```json
{
  "success": false,
  "message": "Error description",
  "status": "error"
}
```

### `Ratelimiter.js`
Implements rate limiting to prevent abuse and brute-force attacks.

**Key Limiters:**
- `authLimiter` - 10 requests per 15 minutes (signup/login/forgot-password)
- `passwordResetLimiter` - 3 requests per 1 hour (password reset attempts)
- `generalLimiter` - 100 requests per 15 minutes (general API)

**Usage:**
```javascript
router.post('/signup', authLimiter, controller);
router.post('/reset-password', passwordResetLimiter, controller);
```

**Returns 429 (Too Many Requests)** when limit exceeded

## Middleware Order
In `server.js`, middleware is applied in this order:
1. Body and URL parsers (express.json, express.urlencoded)
2. Security headers (helmet, sanitization, XSS protection)
3. CORS and static files
4. Route handlers
5. Error handler (catches all errors from above)

## Custom Error Classes
Application uses custom AppError class:
```javascript
throw new AppError('Error message', statusCode);
```
