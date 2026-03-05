const express = require('express');
const config = require('./config/environment');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const { connectDB } = require('./config/Database');
const { errorHandler, notFound } = require('./middleware/Errorhandler');
const { apiLimiter } = require('./middleware/Ratelimiter');
const { ensureConnection } = require('./config/Database');

const app = express();
const PORT = config.port || 3001;

// Connect to database (serverless-safe cache inside module)
connectDB().catch(err => {
  console.error('Database connection failed:', err.message);
  // In CLI/dev allow process to exit
  if (config.isProduction) process.exit(1);
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.google.com', 'https://www.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:', 'https://res.cloudinary.com'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ['https://www.google.com']
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: (origin, cb) => {
    // allow non-browser tools
    if (!origin) return cb(null, true);
    if (config.isProduction) return cb(null, config.baseURL);
    const allowed = [config.baseURL, 'http://localhost:3000', 'http://127.0.0.1:3000'];
    cb(null, allowed.includes(origin));
  },
  credentials: true
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize data
app.use(mongoSanitize()); // Prevent MongoDB injection
app.use(xss()); // Prevent XSS attacks

// Rate limiting
app.use('/api/', apiLimiter);

// Ensure database connection for API routes
app.use('/api/', ensureConnection);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Favicon handler (explicitly serve favicon.ico)
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.ico'), { 
    maxAge: '1d',
    headers: { 'Cache-Control': 'public, max-age=86400' }
  }).on('error', () => {
    // If favicon doesn't exist, send 204 (no content) instead of error
    res.status(204).end();
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));
app.use('/p', require('./routes/public'));
app.use('/publicinfo', require('./routes/publicinfo'));
app.use('/api/health', require('./routes/health'));
app.use('/whatsapp', require('./routes/whatsapp'));
app.use('/email', require('./routes/email'));

// Serve HTML pages with proper error handling
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'), (err) => {
    if (err && !res.headersSent) res.status(500).send('Server error');
  });
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'), (err) => {
    if (err && !res.headersSent) res.status(500).send('Server error');
  });
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'), (err) => {
    if (err && !res.headersSent) res.status(500).send('Server error');
  });
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'), (err) => {
    if (err && !res.headersSent) res.status(500).send('Server error');
  });
});

app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'forgot-password.html'), (err) => {
    if (err && !res.headersSent) res.status(500).send('Server error');
  });
});

app.get('/disabled', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'disabled.html'), (err) => {
    if (err && !res.headersSent) res.status(500).send('Server error');
  });
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'), (err) => {
    if (err && !res.headersSent) res.status(500).send('Server error');
  });
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'), (err) => {
    if (err && !res.headersSent) res.status(500).send('Server error');
  });
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'), (err) => {
    if (err && !res.headersSent) res.status(500).send('Server error');
  });
});

// Health check endpoint (for Render)
app.get('/health-check', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler (must be before error handler)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server (Render persistent Node.js server)
const server = app.listen(PORT, () => {
  console.log(`SafePass ID Server Running - Port: ${PORT} - Env: ${config.env}`);
  console.log(`Base URL: ${config.baseURL}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, _promise) => {
  console.log(`❌ Unhandled Rejection: ${err && err.message}`);
  if (server && server.close) server.close(() => process.exit(1));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  if (server && server.close) {
    server.close(() => {
      console.log('💤 Process terminated');
    });
  }
});

module.exports = app;
