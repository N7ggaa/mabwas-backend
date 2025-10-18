const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Authentication validation rules
const validateSignup = [
  body('email')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ min: 5, max: 255 }).withMessage('Email must be between 5 and 255 characters'),

  body('password')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  body('name')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Name can only contain letters and spaces'),

  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),

  handleValidationErrors
];

const validateEmailVerification = [
  body('email')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('code')
    .isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits')
    .matches(/^\d{6}$/).withMessage('Verification code must contain only numbers'),

  handleValidationErrors
];

const validateForgotPassword = [
  body('email')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  handleValidationErrors
];

const validateResetPassword = [
  body('email')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('code')
    .isLength({ min: 6, max: 6 }).withMessage('Reset code must be 6 digits')
    .matches(/^\d{6}$/).withMessage('Reset code must contain only numbers'),

  body('newPassword')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  handleValidationErrors
];

// Game validation rules
const validateGameStart = [
  body('gameType')
    .isIn(['reaction', 'speed', 'endurance', 'accuracy']).withMessage('Invalid game type'),

  body('gameData')
    .optional()
    .isObject().withMessage('Game data must be an object'),

  body('deviceInfo')
    .optional()
    .isObject().withMessage('Device info must be an object'),

  body('location')
    .optional()
    .isObject().withMessage('Location must be an object'),

  handleValidationErrors
];

const validateGameEnd = [
  body('sessionId')
    .isMongoId().withMessage('Invalid session ID'),

  body('score')
    .isNumeric().withMessage('Score must be a number')
    .isFloat({ min: 0 }).withMessage('Score must be a positive number'),

  body('gameData')
    .optional()
    .isObject().withMessage('Game data must be an object'),

  body('deviceInfo')
    .optional()
    .isObject().withMessage('Device info must be an object'),

  body('location')
    .optional()
    .isObject().withMessage('Location must be an object'),

  handleValidationErrors
];

const validateGetLeaderboard = [
  query('gameType')
    .isIn(['reaction', 'speed', 'endurance', 'accuracy']).withMessage('Invalid game type'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  handleValidationErrors
];

// Media validation rules
const validateFileUpload = [
  // File upload validation is handled in multer configuration
  // This is for any additional metadata validation if needed
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),

  handleValidationErrors
];

// Generic validation for MongoDB ObjectId parameters
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId().withMessage(`Invalid ${paramName}`),

  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateSignup,
  validateLogin,
  validateEmailVerification,
  validateForgotPassword,
  validateResetPassword,
  validateGameStart,
  validateGameEnd,
  validateGetLeaderboard,
  validateFileUpload,
  validateObjectId
};