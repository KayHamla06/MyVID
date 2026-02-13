# SafePass ID - Quick Reference Guide

## 🚀 Quick Start Commands

```bash
# Development
npm run dev              # Start development server
npm test                 # Run all tests
npm run test:watch       # Test watch mode

# Testing specific areas
npm run test:auth        # Authentication tests
npm run test:db          # Database tests

# Production
NODE_ENV=production npm start
```

---

## 📁 File Locations

### Need to update configuration?
→ `config/environment.js`

### Need to adjust security?
→ `security/rateLimiter.js` (rate limits)
→ `security/validator.js` (validation rules)

### Need to add tests?
→ `tests/*.test.js`

### Need to update routes?
→ `routes/auth.js` (authentication)
→ `routes/user.js` (user operations)
→ `routes/public.js` (public access)

---

## 🔧 Common Tasks

### Change Rate Limits
**File:** `security/rateLimiter.js`
```javascript
// Line ~12
max: config.isProduction ? 100 : 1000
```

### Change Database Names
**File:** `.env`
```bash
MONGO_PROD_DB=SafePassID
MONGO_DEV_DB=SafePassID_Dev
MONGO_TEST_DB=SafePassID_Test
```

### Add Validation Rule
**File:** `security/validator.js`
```javascript
// Add to schemas object (line ~150)
yourSchema: (data) => {
  const errors = [];
  // Add validation logic
  return { valid: errors.length === 0, errors };
}
```

### Check Database Connection
```bash
curl http://localhost:3000/health
```

---

## 🌍 Environment Variables

### Required for All Environments
```bash
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### Production Only
```bash
NODE_ENV=production
APP_URL=https://your-app.vercel.app
RECAPTCHA_SITE_KEY=...
RECAPTCHA_SECRET_KEY=...
```

### Testing
```bash
NODE_ENV=test
```

---

## 🧪 Testing Shortcuts

```bash
# Test everything
npm test

# Test with coverage report
npm test -- --coverage

# Test specific file
npm test auth.test.js

# Debug test
node --inspect-brk node_modules/.bin/jest tests/auth.test.js
```

---

## 🐛 Debugging

### Server won't start
1. Check `.env` file exists
2. Verify MongoDB URI is correct
3. Check `NODE_ENV` is set
4. Run: `npm run dev` for detailed logs

### Tests failing
1. Ensure `NODE_ENV=test`
2. Check test database exists
3. Run tests individually: `npm run test:auth`
4. Clear test data: Database auto-clears between tests

### Vercel deployment issues
1. Check environment variables in Vercel dashboard
2. Review Vercel function logs
3. Ensure `vercel.json` is present
4. Verify `server.js` exports app

### Rate limiting blocking requests
1. Check environment: `config.isProduction`
2. Adjust limits in `security/rateLimiter.js`
3. Use development mode for testing

---

## 📊 Important Endpoints

```bash
# Health Check
GET /health

# Authentication
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/reset-password

# User Operations
GET  /api/user/profile
PUT  /api/user/profile
POST /api/user/upload-photo

# QR Code
POST /api/user/qr/generate
GET  /api/user/qr/download/png
GET  /api/user/qr/download/svg
PUT  /api/user/qr/toggle

# Public Access
GET  /p/:qrId
```

---

## 🔐 Security Checklist

Before deploying:
- [ ] All environment variables set
- [ ] reCAPTCHA configured
- [ ] Rate limits appropriate
- [ ] JWT secret is strong (64+ chars)
- [ ] HTTPS enabled (Vercel auto-handles)
- [ ] CORS origins configured
- [ ] MongoDB whitelist updated

---

## 🎯 Performance Tips

### Database
- Use connection pooling (already configured)
- Index frequently queried fields
- Avoid N+1 queries

### API
- Implement caching for static data
- Use pagination for large datasets
- Compress responses (gzip)

### Vercel
- Keep functions under 50MB
- Optimize dependencies
- Use Edge Functions when possible

---

## 📝 Code Snippets

### Add New Route with Security
```javascript
const { validateInput, sanitizeInput } = require('../security/validator');
const { rateLimiter } = require('../security/rateLimiter');

router.post('/your-route',
  rateLimiter,           // Rate limiting
  sanitizeInput,         // XSS protection
  validateInput('schema'), // Validation
  controller.handler     // Your logic
);
```

### Create Test User
```javascript
// In tests
const user = await createTestUser({
  email: 'test@example.com',
  password: 'Password123'
});
```

### Check Environment
```javascript
const config = require('./config/environment');

if (config.isProduction) {
  // Production-only code
}

if (config.isDevelopment) {
  // Development-only code
}
```

---

## 🆘 Emergency Procedures

### Production Database Accidentally Modified
1. Don't panic
2. Check backups in MongoDB Atlas
3. Restore from latest snapshot
4. Review database connection config

### Too Many Failed Logins
1. Check rate limiter logs
2. Verify it's not a real user
3. Temporarily adjust limits if needed
4. Investigate IP addresses

### Server Unresponsive
1. Check Vercel status
2. Review function logs
3. Check database connection
4. Verify environment variables

---

## 📞 Support Resources

- **MongoDB Atlas:** https://cloud.mongodb.com
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Cloudinary Console:** https://cloudinary.com/console
- **reCAPTCHA Admin:** https://www.google.com/recaptcha/admin

---

## 🎓 Learning Resources

### Understanding the Architecture
1. Read `REFACTORING_SUMMARY.md`
2. Review `MIGRATION_GUIDE.md`
3. Explore `config/environment.js`
4. Check test files for examples

### Security Best Practices
- OWASP Top 10: https://owasp.org/Top10/
- Express Security: https://expressjs.com/en/advanced/best-practice-security.html
- Helmet.js: https://helmetjs.github.io/

### Testing
- Jest Docs: https://jestjs.io/
- Supertest: https://github.com/visionmedia/supertest

---

## ✅ Daily Developer Checklist

**Before coding:**
- [ ] Pull latest changes: `git pull`
- [ ] Install dependencies: `npm install`
- [ ] Start dev server: `npm run dev`

**While coding:**
- [ ] Write tests for new features
- [ ] Use proper environment variables
- [ ] Follow security middleware patterns
- [ ] Test locally before pushing

**Before committing:**
- [ ] Run tests: `npm test`
- [ ] Check for console errors
- [ ] Verify .env is in .gitignore
- [ ] Update relevant documentation

**Before deploying:**
- [ ] All tests passing
- [ ] Environment variables set in Vercel
- [ ] Health check working
- [ ] Database connection verified

---

## 🎉 Success Indicators

Your refactored app is working when:
- ✅ `npm run dev` starts without errors
- ✅ `npm test` shows all tests passing
- ✅ `/health` endpoint returns healthy status
- ✅ Different databases used per environment
- ✅ Rate limiting prevents spam
- ✅ Vercel deployment successful

---

**Keep this guide handy for quick reference!**