const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 4002;

// Basic middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create media directory if it doesn't exist
const mediaDir = path.join(__dirname, process.env.UPLOAD_DIR || './media');
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.API_VERSION || 'v1',
    database: 'Not connected (test mode)'
  });
});

// Mock authentication endpoints for testing
app.post('/auth/signup', (req, res) => {
  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Mock successful signup
  res.json({
    message: 'User registered successfully (test mode)',
    user: { id: 'test-user-id', email, username },
    token: 'test-jwt-token'
  });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Mock successful login
  res.json({
    message: 'Login successful (test mode)',
    user: { id: 'test-user-id', email },
    token: 'test-jwt-token'
  });
});

// Mock game endpoints for testing
app.post('/game/session/start', (req, res) => {
  res.json({
    message: 'Game session started (test mode)',
    sessionId: 'test-session-id',
    startTime: new Date().toISOString()
  });
});

app.post('/game/session/end', (req, res) => {
  const { sessionId, score, duration } = req.body;

  res.json({
    message: 'Game session ended (test mode)',
    sessionId: sessionId || 'test-session-id',
    finalScore: score || 100,
    duration: duration || 60
  });
});

app.get('/game/leaderboard', (req, res) => {
  res.json({
    message: 'Leaderboard retrieved (test mode)',
    leaderboard: [
      { rank: 1, username: 'TestPlayer1', score: 1000 },
      { rank: 2, username: 'TestPlayer2', score: 850 },
      { rank: 3, username: 'TestPlayer3', score: 720 }
    ]
  });
});

// Mock media endpoints for testing
app.post('/media/upload', (req, res) => {
  res.json({
    message: 'File uploaded successfully (test mode)',
    fileId: 'test-file-id',
    filename: req.body.filename || 'test-file.txt'
  });
});

app.get('/media/list', (req, res) => {
  res.json({
    message: 'Media list retrieved (test mode)',
    files: [
      { id: 'test-file-1', filename: 'test1.txt', size: 1024 },
      { id: 'test-file-2', filename: 'test2.jpg', size: 2048 }
    ]
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Racing Plate Backend API (Test Mode)',
    version: process.env.API_VERSION || 'v1',
    description: 'Test backend API for Racing Plate application (No database required)',
    endpoints: {
      auth: ['POST /auth/signup', 'POST /auth/login'],
      game: ['POST /game/session/start', 'POST /game/session/end', 'GET /game/leaderboard'],
      media: ['POST /media/upload', 'GET /media/list']
    },
    note: 'This is a test server without database connectivity for development testing'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

const server = app.listen(PORT, () => {
  console.log(`🧪 Test Backend Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`📁 Upload directory: ${mediaDir}`);
  console.log(`💾 Database: Not connected (test mode - no MongoDB required)`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /health');
  console.log('  GET  /api');
  console.log('  POST /auth/signup');
  console.log('  POST /auth/login');
  console.log('  POST /game/session/start');
  console.log('  POST /game/session/end');
  console.log('  GET  /game/leaderboard');
  console.log('  POST /media/upload');
  console.log('  GET  /media/list');
});

module.exports = app;