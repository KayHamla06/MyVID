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
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.google.com', 'https://www.gstatic.com', 'https://vercel.live'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
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

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/p', require('./routes/public'));
app.use('/api/health', require('./routes/health'));

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'forgot-password.html'));
});

app.get('/disabled', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'disabled.html'));
});

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Start server only when executed directly (keeps module safe for serverless imports)
let server;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`SafePass ID Server Running - Port: ${PORT} - Env: ${config.env}`);
    console.log(`Base URL: ${config.baseURL}`);
  });
}

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
