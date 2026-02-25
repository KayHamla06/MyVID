# Backend Security Architecture - Quick Reference

## Key Security Patterns

### 1. Visibility Filtering (Always Done Server-Side)

**Pattern Used In:**
- `models/User.js` - `getPublicProfile()` method
- `routes/publicinfo.js` - HTML rendering
- `routes/public.js` - Public profile endpoints

**How It Works:**
```javascript
// User's visibility preferences
User {
  firstName: "John",
  firstNameVisible: true,
  phoneNumber: "+1234567890",
  phoneVisible: false  // Hidden from public
}

// When someone views public profile:
user.getPublicProfile() // Returns:
{
  firstName: "John",  // ✅ Shown (visible = true)
  phoneNumber: null   // ❌ Filtered (visible = false)
}
```

**Key Rule:** Frontend visibility toggles are UI ONLY. Backend ALWAYS applies its own filtering.

---

### 2. Whitelist Validation (Controllers)

**Pattern Used In:**
- `controllers/Usercontroller.js` - `updateProfile()`
- `controllers/authController.js` - Field handling

**How It Works:**
```javascript
// Allowed fields for profile update
const ALLOWED_FIELDS = [
  'firstName', 'lastName', 'email', 'phoneNumber',
  'country', 'address', 'dob', 'medicalAlerts',
  'emergencyContacts', 'firstNameVisible', 'phoneVisible',
  'countryVisible', 'addressVisible', 'dobVisible',
  'emergencyContactsVisible'
];

// Any other fields in request are silently dropped
const update = {};
ALLOWED_FIELDS.forEach(field => {
  if (field in req.body) {
    update[field] = req.body[field];
  }
});

user.updateOne(update); // Only whitelisted fields saved
```

**Key Rule:** Explicitly define what CAN be modified, reject everything else.

---

### 3. Rate Limiting Hierarchy

**Application Order (Strictest to Loosest):**

| Endpoint | Limiter | Limit | Purpose |
|----------|---------|-------|---------|
| `/api/auth/login` | `loginLimiter` | 5/15min | Brute-force prevention |
| `/api/auth/forgot-password` | `passwordResetLimiter` | 3/1hr | Reset enumeration prevention |
| `/api/auth/reset-password` | `passwordResetLimiter` | 3/1hr | Token reuse prevention |
| `/p/:qrId` | `qrScanLimiter` | 30/1min | QR abuse prevention |
| `/publicinfo/:username` | `qrScanLimiter` | 30/1min | Profile enumeration prevention |
| `/api/user/upload-photo` | `uploadLimiter` | 10/15min | Disk exhaustion prevention |
| `/api/*` (all others) | `apiLimiter` | 100/15min | General API protection |

**Key Rule:** More sensitive operations have tighter limits.

---

### 4. User Enumeration Prevention

**Pattern Used In:**
- `controllers/authController.js` - `login()`
- `routes/publicinfo.js` - Username lookup

**How It Works:**
```javascript
// WRONG - Exposes users
if (!user) return res.status(404).json({ message: "User not found" });
if (!isPasswordValid) return res.status(401).json({ message: "Wrong password" });

// CORRECT - Same message both cases
if (!user || !isPasswordValid) {
  return res.status(401).json({ message: "Invalid credentials" });
}
```

**Key Rule:** Attackers cannot determine if user exists without knowing password.

---

### 5. Password Security

**Pattern Used In:**
- `models/User.js` - Pre-save hashing, `comparePassword()`
- `controllers/authController.js` - Password validation

**Key Points:**
```javascript
// 1. On save: Automatically hashed with bcryptRounds: 12
const user = new User({ password: "SecurePass123" });
await user.save(); // Hashed internally

// 2. On login: Requires EXPLICIT select
const user = await User
  .findOne({ email })
  .select('+password'); // Needed because password field has select: false

// 3. Comparison is SAFE (async bcrypt, try/catch)
try {
  const isValid = await user.comparePassword(inputPassword);
} catch (err) {
  // Safe error handling
}
```

**Key Rule:** Password is `select: false` by default, must explicitly retrieve with `.select('+password')`.

---

### 6. Public Data Security

**Pattern Used In:**
- `routes/publicinfo.js` - Server-side HTML render
- `routes/public.js` - Public QR endpoint

**HTML Rendering:**
```javascript
// All output MUST be escaped
const escapeHtml = (text) => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Usage:
html = `<h1>${escapeHtml(user.firstName)}</h1>`; // Safe
html = `<h1>${user.firstName}</h1>`;              // DANGEROUS - XSS possible
```

**Key Rule:** Never output user data without escaping for the target context (HTML, JSON, SQL, etc.).

---

### 7. Error Handling Safety

**Pattern Used In:**
- `middleware/Errorhandler.js` - Global error handler
- All route error catches

**Safe Error Response:**
```javascript
// Development (DEBUG=true only):
res.json({
  success: false,
  message: "Email validation failed: invalid format",
  errorId: "550e8400-e29b-41d4-a716-446655440000" // For debugging
});

// Production:
res.json({
  success: false,
  message: "Invalid request",
  // No errorId, no stack trace, no details
});

// Never send to client:
// - Stack traces
// - File paths
// - Database queries
// - Internal error messages
```

**Key Rule:** In production, generic messages prevent information leakage.

---

## File-to-Pattern Mapping

| File | Pattern | Key Function |
|------|---------|---------------|
| `models/User.js` | Visibility Filter | `getPublicProfile()` |
| `models/User.js` | Password Security | `comparePassword()`, pre-save hashing |
| `controllers/Usercontroller.js` | Whitelist Validation | `updateProfile()` |
| `controllers/authController.js` | Enum Prevention | `login()` - same error both cases |
| `middleware/Ratelimiter.js` | Rate Limiting | 6 limiters defined |
| `middleware/Errorhandler.js` | Safe Errors | Generic messages + error ID |
| `middleware/auth.js` | JWT Protection | `protect` middleware for authenticated routes |
| `routes/auth.js` | Login Protection | Rate limiters on `/signup`, `/login`, `/forgot-password` |
| `routes/publicinfo.js` | Public Profile | `getPublicProfile()` + HTML escape |
| `routes/public.js` | QR Profile | HTML render with visibility filtering |
| `routes/user.js` | Authenticated Routes | `protect` middleware on all endpoints |
| `config/environment.js` | Config Security | Security constants, production checks |
| `server.js` | Security Headers | Helmet, CORS, mongoSanitize, xss middleware |

---

## Common Security Mistakes to Avoid

### ❌ WRONG: Trusting Frontend Visibility
```javascript
// Frontend sends: { firstName: "John", show_firstName: false }
// Wrong approach:
if (req.body.show_firstName) { /* show it */ }

// Correct approach:
const profile = user.getPublicProfile(); // Server decides visibility
```

### ❌ WRONG: Exposing Password Hash
```javascript
// Don't:
const user = await User.findOne({ email }); // password loaded
res.json(user); // Sends password hash to client!

// Do:
const user = await User.findOne({ email }).select('-password');
res.json(user); // No password sent
```

### ❌ WRONG: Generic User Enumeration
```javascript
// Don't:
if (!user) return res.status(404).json({ message: "User not found" }); // Leaks info
if (!passwordValid) return res.status(401).json({ message: "Wrong password" }); // Leaks info

// Do:
if (!user || !passwordValid) {
  return res.status(401).json({ message: "Invalid credentials" }); // Same message
}
```

### ❌ WRONG: Unescaped Output
```javascript
// Don't - XSS vulnerability:
html = `<h1>${user.firstName}</h1>`;

// Do - Always escape:
html = `<h1>${escapeHtml(user.firstName)}</h1>`;
```

### ❌ WRONG: Logs with Sensitive Data
```javascript
// Don't:
console.log('User password:', user.password);
console.error('Stack trace:', err.stack); // Don't send to client

// Do:
console.error('[ERROR-id]', err.message); // Generic logging
```

### ❌ WRONG: Rate Limit Bypass
```javascript
// Don't - X-Forwarded-For easily spoofed:
const ip = req.headers['x-forwarded-for'];

// Do - Use library with fallbacks:
const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
```

---

## Adding New Endpoints

### Checklist for Secure New Endpoint:

1. **Authentication**: Use `protect` middleware if requires auth
   ```javascript
   router.post('/secret', protect, handler);
   ```

2. **Rate Limiting**: Apply appropriate limiter
   ```javascript
   router.post('/auth/action', loginLimiter, handler);
   router.get('/public/action', qrScanLimiter, handler);
   ```

3. **Input Validation**: Validate all inputs before use
   ```javascript
   if (!req.body.email || !/^.+@.+$/.test(req.body.email)) {
     return res.status(400).json({ message: "Invalid email" });
   }
   ```

4. **Whitelist Update**: If modifying data, use whitelist
   ```javascript
   const allowed = ['field1', 'field2'];
   const update = {};
   allowed.forEach(f => { if (f in req.body) update[f] = req.body[f]; });
   ```

5. **Error Handling**: Never expose internals
   ```javascript
   try {
     // operation
   } catch (err) {
     console.error('Internal error:', err);
     res.status(500).json({ message: "Failed to process request" });
   }
   ```

6. **Output Security**: Escape all outputs
   ```javascript
   // For HTML:
   html = `<p>${escapeHtml(userData)}</p>`;
   
   // For JSON in public endpoints:
   const safe = user.getPublicProfile(); // Already filtered
   res.json(safe);
   ```

---

## Monitoring & Testing

### Security Tests to Run Regularly:

1. **Rate Limiting Test**:
   ```bash
   # Try more than 5 logins in 15 minutes - should get 429
   for i in {1..10}; do
     curl -X POST http://localhost:3000/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"loginIdentifier":"test","password":"wrong"}'
   done
   ```

2. **Error Safety Test**:
   ```bash
   # Check errors don't leak info
   curl http://localhost:3000/api/invalid/route
   # Should return: {"success":false,"message":"Route not found"}
   ```

3. **Password Selection Test**:
   ```bash
   # Login and get user - should NOT have password
   curl http://localhost:3000/api/user/profile \
     -H "Authorization: Bearer TOKEN"
   # User object should have password: undefined
   ```

4. **Visibility Filter Test**:
   ```bash
   # Set phone as private, view public profile - should be empty
   curl http://localhost:3000/publicinfo/username
   # Response should not contain phoneNumber
   ```

---

## Performance vs Security Trade-offs

| Feature | Performance Impact | Security Benefit | Recommendation |
|---------|-------------------|------------------|-----------------|
| Rate Limiting | Low (in-memory) | High (prevents abuse) | ✅ Keep enabled |
| bcryptRounds: 12 | Medium (crypto cost) | High (strong hashing) | ✅ Keep at 12 |
| HTML Escape | Low | High (prevents XSS) | ✅ Use always |
| Visibility Filter | Very Low (DB filter) | High (data protection) | ✅ Use always |
| Error Details (Dev) | None | Low (better debugging) | ✅ Dev only |

---

## Configuration for Different Environments

### Development (`.env.development`):
```
NODE_ENV=development
JWT_SECRET=dev-secret-key-not-for-prod
MONGODB_URI=mongodb://localhost:27017
RATE_LIMIT_MAX=1000  # Loose for testing
DEBUG=true            # Show error details
```

### Production (`.env.production`):
```
NODE_ENV=production
JWT_SECRET=<strong-random-value>
MONGODB_URI=<production-connection>
RATE_LIMIT_MAX=100    # Strict for production
DEBUG=false           # Generic error messages
SENTRY_DSN=<logging-service>
```

---

## External Monitoring

Recommended setup for production:
- **Error Tracking**: Sentry, Rollbar, or DataDog
- **Rate Limiting Alerts**: Alert when threshold exceeded
- **Access Logging**: Request/response logging to external service
- **Database Backups**: Automated nightly backups
- **Security Headers Check**: Monitor CSP violations

---

**Last Updated:** 2026-02-13
**Maintained By:** Development Team
**Questions?** Refer to SECURITY_HARDENING_COMPLETE.md for details
