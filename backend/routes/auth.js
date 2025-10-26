const express = require('express');
const { body } = require('express-validator');
const asyncHandler = require('express-async-handler'); // Ensure this line is present
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/requestHandler');
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout,
  refreshToken,
  getUserStats,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post(
  '/register',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('role')
      .optional()
      .isIn(['resident', 'authority', 'admin'])
      .withMessage('Role must be resident, authority, or admin'),
    body('gender')
      .optional()
      .isIn(['male', 'female', 'other'])
      .withMessage('Gender must be male, female, or other'),
    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Date of birth must be a valid date'),
    body('profession')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Profession cannot exceed 100 characters'),
    body('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid latitude required'),
    body('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid longitude required'),
  ],
  validate,
  asyncHandler(register), // Wrap the controller with asyncHandler
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email')
      .normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  asyncHandler(login), // Wrap the controller with asyncHandler
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, asyncHandler(getMe));

// @route   PUT /api/auth/updateprofile
// @desc    Update user profile
// @access  Private
router.put(
  '/updateprofile',
  protect,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    body('gender')
      .optional()
      .isIn(['male', 'female', 'other', null])
      .withMessage('Gender must be male, female, other, or null'),
    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Date of birth must be a valid date'),
    body('profession')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Profession cannot exceed 100 characters'),
    body('latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid latitude required'),
    body('longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid longitude required'),
  ],
  validate,
  asyncHandler(updateProfile), // Wrap the controller with asyncHandler
);

// Also keep the /update route for backward compatibility
router.put('/update', protect, validate, asyncHandler(updateProfile));

// @route   PUT /api/auth/updatepassword
// @desc    Change password
// @access  Private
router.put(
  '/updatepassword',
  protect,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
    body('confirmPassword')
      .custom((value, { req }) => value === req.body.newPassword)
      .withMessage('Passwords do not match'),
  ],
  validate,
  asyncHandler(changePassword), // Wrap the controller with asyncHandler
);

// Also keep the /password route for backward compatibility
router.put('/password', protect, validate, asyncHandler(changePassword));

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', protect, asyncHandler(logout));

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', protect, asyncHandler(refreshToken));

// @route   GET /api/auth/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', protect, asyncHandler(getUserStats));

// @route   POST /api/auth/forgotpassword
// @desc    Forgot password - verify email and username
// @access  Public
router.post(
  '/forgotpassword',
  [
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email')
      .normalizeEmail(),
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required'),
  ],
  validate,
  asyncHandler(forgotPassword)
);

// @route   POST /api/auth/resetpassword/:token
// @desc    Reset password with token
// @access  Public
router.post(
  '/resetpassword/:token',
  [
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
  ],
  validate,
  asyncHandler(resetPassword)
);

module.exports = router;
