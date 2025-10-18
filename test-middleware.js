// Simple test script to verify middleware functionality without database
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import our middleware
const { authenticateToken, authRateLimit } = require('./middleware/auth');
const {
  validateSignup,
  validateLogin,
  validateEmailVerification,
  validateGameStart,
  validateGameEnd,
  validateGetLeaderboard
} = require('./middleware/validation');
const { createUploadMiddleware } = require('./middleware/upload');

const app = express();
const PORT = 4001;

// Basic middleware
app.use(cors());
app.use(express.json());

// Test routes to verify middleware functionality
console.log('🧪 Setting up test routes for middleware verification...');

// Test validation middleware
app.post('/test/signup', validateSignup, (req, res) => {
  res.json({ message: 'Signup validation passed', data: req.body });
});

app.post('/test/login', validateLogin, (req, res) => {
  res.json({ message: 'Login validation passed', data: req.body });
});

app.post('/test/verify-email', validateEmailVerification, (req, res) => {
  res.json({ message: 'Email verification validation passed', data: req.body });
});

app.post('/test/game/start', validateGameStart, (req, res) => {
  res.json({ message: 'Game start validation passed', data: req.body });
});

app.post('/test/game/end', validateGameEnd, (req, res) => {
  res.json({ message: 'Game end validation passed', data: req.body });
});

app.get('/test/leaderboard', validateGetLeaderboard, (req, res) => {
  res.json({ message: 'Leaderboard validation passed', query: req.query });
});

// Test authentication middleware (will fail without token)
app.get('/test/auth-required', authenticateToken, (req, res) => {
  res.json({ message: 'Authentication passed', user: req.user });
});

// Test rate limiting
app.post('/test/rate-limit', authRateLimit, (req, res) => {
  res.json({ message: 'Rate limit check passed' });
});

// Health check
app.get('/test/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Middleware test server is running',
    timestamp: new Date().toISOString(),
    middleware: {
      validation: '✅ Loaded',
      authentication: '✅ Loaded',
      upload: '✅ Loaded',
      rateLimiting: '✅ Loaded'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Test endpoint not found' });
});

const server = app.listen(PORT, () => {
  console.log('🧪 Test server running on http://localhost:' + PORT);
  console.log('📋 Available test endpoints:');
  console.log('  GET  /test/health');
  console.log('  POST /test/signup');
  console.log('  POST /test/login');
  console.log('  POST /test/verify-email');
  console.log('  POST /test/game/start');
  console.log('  POST /test/game/end');
  console.log('  GET  /test/leaderboard');
  console.log('  GET  /test/auth-required');
  console.log('  POST /test/rate-limit');
  console.log('');
  console.log('💡 Use curl or Postman to test these endpoints');
});

module.exports = app;