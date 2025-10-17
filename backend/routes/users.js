const express = require('express');
const { body, query, param } = require('express-validator');
const { protect, authorize, isAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/requestHandler');
const asyncHandler = require('express-async-handler'); // Ensure this line is present
const {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getNearbyUsers,
  toggleUserActive,
  changeUserRole,
  // getUserActivity, // --- FIX: Removed
  getUserStats,
  getAuthorities,
} = require('../controllers/userController');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users with filters
// @access  Private/Admin
router.get(
  '/',
  protect,
  isAdmin,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('role')
      .optional()
      .isIn(['resident', 'authority', 'admin'])
      .withMessage('Role must be resident, authority, or admin'),
    query('isActive')
      .optional()
      .isIn(['true', 'false', 'all'])
      .withMessage('isActive must be true, false, or all'),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Search query must not be empty'),
    query('sort')
      .optional()
      .isIn([
        'name',
        '-name',
        'email',
        '-email',
        'createdAt',
        '-createdAt',
        'role',
        '-role',
      ])
      .withMessage('Invalid sort option'),
  ],
  validate,
  getUsers,
);

// @route   GET /api/users/authorities
// @desc    Get all authorities (authority + admin)
// @access  Private/Admin
router.get('/authorities', protect, isAdmin, getAuthorities);

// @route   GET /api/users/nearby
// @desc    Get nearby users
// @access  Private
router.get(
  '/nearby',
  protect,
  [
    query('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid latitude required'),
    query('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid longitude required'),
    query('radius')
      .optional()
      .isInt({ min: 100, max: 100000 }) // 100m to 100km
      .withMessage('Radius must be between 100 and 100000 meters'),
  ],
  validate,
  getNearbyUsers,
);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get(
  '/:id',
  protect,
  [param('id').isMongoId().withMessage('Valid user ID required')],
  validate,
  getUserById,
);

// @route   GET /api/users/:id/stats
// @desc    Get user statistics
// @access  Private
router.get(
  '/:id/stats',
  protect,
  [param('id').isMongoId().withMessage('Valid user ID required')],
  validate,
  getUserStats,
);

// --- START FIX ---
// @route   GET /api/users/:id/activity (REMOVED)
// @desc    This route is redundant. Use /api/activities/users/:userId instead.
// router.get( ... ) // Route removed
// --- END FIX ---

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Self or Admin)
router.put(
  '/:id',
  protect,
  [
    param('id').isMongoId().withMessage('Valid user ID required'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Valid email required')
      .normalizeEmail(),
    body('avatar')
      .optional()
      .trim()
      .isURL()
      .withMessage('Avatar must be a valid URL'),
    body('latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid latitude required'),
    body('longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid longitude required'),
    body('gender')
      .optional()
      .custom(
        (value) =>
          value === null || ['male', 'female', 'other'].includes(value),
      )
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
    body('role')
      .optional()
      .isIn(['resident', 'authority', 'admin'])
      .withMessage('Role must be resident, authority, or admin'),
  ],
  validate,
  updateUser,
);

// --- START FIX ---
// @route   PATCH /api/users/:id/toggle-status
// @desc    Toggle user active status
// @access  Private/Admin
router.patch(
  '/:id/toggle-status', // Changed from /toggle-active
  // --- END FIX ---
  protect,
  isAdmin,
  [param('id').isMongoId().withMessage('Valid user ID required')],
  validate,
  toggleUserActive,
);

// @route   PATCH /api/users/:id/role
// @desc    Change user role
// @access  Private/Admin
router.patch(
  '/:id/role',
  protect,
  isAdmin,
  [
    param('id').isMongoId().withMessage('Valid user ID required'),
    body('role')
      .notEmpty()
      .withMessage('Role is required')
      .isIn(['resident', 'authority', 'admin'])
      .withMessage('Role must be resident, authority, or admin'),
  ],
  validate,
  changeUserRole,
);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete(
  '/:id',
  protect,
  isAdmin,
  [param('id').isMongoId().withMessage('Valid user ID required')],
  validate,
  deleteUser,
);

module.exports = router;
