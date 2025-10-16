const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler'); // Add this line
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/requestHandler');
const { query, param } = require('express-validator');
const {
  getRecentActivities,
  getIssueActivities,
  getUserActivities,
  getActivityStats,
} = require('../controllers/activityController');

/**
 * @route   GET /api/activities
 * @desc    Get recent activities (global feed)
 * @access  Public
 */
router.get(
  '/',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('type')
      .optional()
      .isIn([
        'created',
        'updated',
        'commented',
        'status_changed',
        'assigned',
        'resolved',
      ])
      .withMessage('Invalid activity type'),
  ],
  validate,
  getRecentActivities,
);

/**
 * @route   GET /api/activities/issues/:issueId
 * @desc    Get activities for specific issue
 * @access  Public
 */
router.get(
  '/issues/:issueId',
  [
    param('issueId').isMongoId().withMessage('Valid issue ID required'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
  validate,
  getIssueActivities,
);

/**
 * @route   GET /api/activities/users/:userId
 * @desc    Get user activity history
 * @access  Private (Self or Admin)
 */
router.get(
  '/users/:userId',
  protect,
  [
    param('userId').isMongoId().withMessage('Valid user ID required'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
  validate,
  getUserActivities,
);

/**
 * @route   GET /api/activities/stats
 * @desc    Get activity statistics
 * @access  Private (Admin/Authority)
 */
router.get(
  '/stats',
  protect,
  authorize('admin', 'authority'),
  [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Valid start date required'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Valid end date required'),
  ],
  validate,
  getActivityStats,
);

module.exports = router;
