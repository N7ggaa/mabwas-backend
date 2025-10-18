const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database to ensure they still exist and are active
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'User not found'
      });
    }

    if (!user.verified) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Please verify your email first'
      });
    }

    // Add user info to request object
    req.user = {
      userId: user._id,
      email: user.email,
      name: user.name,
      subscription: user.subscription,
      verified: user.verified
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Token expired'
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed'
    });
  }
};

// Middleware to check if user has required subscription
const requireSubscription = (requiredSubscription) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const subscriptionHierarchy = {
      'free': 0,
      'premium': 1,
      'pro': 2
    };

    const userLevel = subscriptionHierarchy[req.user.subscription] || 0;
    const requiredLevel = subscriptionHierarchy[requiredSubscription] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: 'Access denied',
        message: `This feature requires ${requiredSubscription} subscription`
      });
    }

    next();
  };
};

// Middleware to check if user owns the resource
const requireOwnership = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const resourceUserId = req.body[resourceUserIdField] || req.params[resourceUserIdField] || req.query[resourceUserIdField];

    if (!resourceUserId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Resource user ID not provided'
      });
    }

    // Allow if user is accessing their own resource or if they're an admin (if admin role exists)
    if (req.user.userId.toString() !== resourceUserId.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own resources'
      });
    }

    next();
  };
};

// Optional authentication middleware (doesn't fail if no token provided)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // No token provided, continue without authentication
      return next();
    }

    // Verify token if provided
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.userId);
    if (user && user.verified) {
      req.user = {
        userId: user._id,
        email: user.email,
        name: user.name,
        subscription: user.subscription,
        verified: user.verified
      };
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without authentication
    next();
  }
};

// Rate limiting for authentication attempts (simple in-memory implementation)
const authRateLimit = (() => {
  const attempts = new Map();

  return (req, res, next) => {
    const email = req.body.email?.toLowerCase();
    if (!email) return next();

    const key = email;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5;

    if (!attempts.has(key)) {
      attempts.set(key, []);
    }

    const userAttempts = attempts.get(key);

    // Remove old attempts outside the window
    const validAttempts = userAttempts.filter(time => now - time < windowMs);

    if (validAttempts.length >= maxAttempts) {
      return res.status(429).json({
        error: 'Too many attempts',
        message: 'Too many authentication attempts. Please try again later.'
      });
    }

    // Add current attempt
    validAttempts.push(now);
    attempts.set(key, validAttempts);

    // Add cleanup function to request object
    req.cleanupRateLimit = () => {
      if (attempts.has(key)) {
        const userAttempts = attempts.get(key);
        attempts.set(key, userAttempts.filter(time => time !== validAttempts[0]));
      }
    };

    next();
  };
})();

module.exports = {
  authenticateToken,
  requireSubscription,
  requireOwnership,
  optionalAuth,
  authRateLimit
};