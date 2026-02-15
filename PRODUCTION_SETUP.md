# SafePass ID - Production Setup & Testing Guide

## 🚀 Quick Start

### Development Mode
```bash
npm install
npm run dev
```
Runs on `http://localhost:3000` pointing to `SafePassID_Dev` database.

### Production Mode (Local Testing)
```bash
npm install
npm run start:prod
```
This sets `NODE_ENV=production` and requires all production environment variables to be set.

---

## 🔧 Production Environment Setup

### Step 1: Copy Production Config
```bash
cp .env.production.example .env.production
```

### Step 2: Fill in Production Values
Edit `.env.production` and replace placeholders:
- `MONGO_URI` - Your production MongoDB connection string
- `MONGO_PROD_DB` - Production database name (default: SafePassID)
- `JWT_SECRET` - Generate a strong random secret (min 32 chars)
- `CLOUDINARY_*` - Your Cloudinary API credentials
- `RECAPTCHA_*` - Your reCAPTCHA v3 keys
- `APP_URL` - Your production domain (e.g., https://safepass-id.vercel.app)

### Step 3: Test Locally with Production Config
```bash
npx dotenv -e .env.production -- npm run start:prod
```

---

## 🧪 Testing Production Mode

### Health Check
```bash
# Check app and database health
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "success": true,
  "service": "SafePass ID",
  "env": "production",
  "baseURL": "http://localhost:3000",
  "database": {
    "healthy": true,
    "message": "Connected",
    "database": "SafePassID"
  },
  "uptime": 42.5
}
```

### Test Endpoints
```bash
# Landing page
curl http://localhost:3000/

# Auth (should work)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'

# Security features active
# ✅ Rate limiting enabled
# ✅ reCAPTCHA verification required
# ✅ Helmet security headers active
# ✅ MongoDB sanitization active
# ✅ CORS restricted to APP_URL
```

---

## 📦 Deployment to Vercel

### 1. Push to GitHub
```bash
git add .
git commit -m "Add production config and health endpoint"
git push origin main
```

### 2. Set Environment Variables on Vercel
Go to Vercel Dashboard → Project → Settings → Environment Variables

Add these variables:
```
NODE_ENV = production
MONGO_URI = (your production MongoDB URI)
MONGO_PROD_DB = SafePassID
JWT_SECRET = (strong random string)
CLOUDINARY_CLOUD_NAME = (your value)
CLOUDINARY_API_KEY = (your value)
CLOUDINARY_API_SECRET = (your value)
RECAPTCHA_SITE_KEY = (your value)
RECAPTCHA_SECRET_KEY = (your value)
APP_URL = (your Vercel domain or custom domain)
```

### 3. Deploy
Vercel auto-deploys on push, or use:
```bash
vercel deploy --prod
```

### 4. Verify Production Deployment
```bash
# Replace with your Vercel URL
curl https://your-project.vercel.app/api/health
```

---

## ✅ Production Checklist

- [ ] `NODE_ENV=production` set in Vercel
- [ ] All required environment variables set
- [ ] Production database prepared (SafePassID)
- [ ] JWT_SECRET is strong and secret
- [ ] Cloudinary credentials set
- [ ] reCAPTCHA keys set
- [ ] Health endpoint responds correctly
- [ ] API endpoints working as expected
- [ ] Rate limiting active
- [ ] Security headers active (Helmet)
- [ ] CORS properly configured
- [ ] Database backups enabled

---

## 🐛 Troubleshooting

### App exits immediately with "Missing required environment variables"
**Fix:** Ensure all vars in `.env.production` are filled correctly. Check `config/environment.js` for required vars list.

### "Too many password reset attempts" (429)
**Fix:** This is expected in production (3 attempts per hour). For testing, temporarily set `NODE_ENV=development`.

### Database connection fails
**Fix:** Verify `MONGO_URI` is correct and production database exists. Ensure IP whitelist on MongoDB Atlas includes Vercel IPs.

### reCAPTCHA validation fails
**Fix:** Ensure `RECAPTCHA_SECRET_KEY` matches your site key domain. In development, reCAPTCHA is skipped unless explicitly provided.

### Health endpoint returns unhealthy
**Fix:** Check database connection status. Verify MongoDB URI and credentials. See server logs in Vercel dashboard.

---

## 📊 Environment Comparison

| Feature | Development | Production |
|---------|-------------|-----------|
| Database | SafePassID_Dev | SafePassID |
| Rate Limit | 1000/15min | 100/15min |
| reCAPTCHA | Optional | Required |
| Security Headers | Basic | Full (Helmet) |
| CORS | Permissive | Restricted |
| Password Reset Limit | Unlimited (dev) | 3/hour |
| Logging | Debug | Info |

---

## 🔒 Security Notes

1. **Never commit `.env.production`** — Use `.gitignore` (already configured)
2. **Rotate JWT_SECRET** periodically
3. **Keep credentials secure** — Use Vercel's environment variable UI
4. **Enable MongoDB IP whitelist** — Only allow Vercel IPs
5. **Use HTTPS only** — Vercel provides auto SSL
6. **Monitor rate limits** — Adjust if necessary for your user base

---

## 📞 Support

For issues:
1. Check server logs: `vercel logs`
2. Review environment setup in `.env.production`
3. Verify database connections with health endpoint
4. See MIGRATION_GUIDE.md for detailed architecture info
