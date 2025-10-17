const express = require('express');
const { query, param } = require('express-validator');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/requestHandler');
const asyncHandler = require('express-async-handler'); // Ensure this line is present
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../controllers/notificationController');

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get(
  '/',
  protect,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('unreadOnly')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('unreadOnly must be true or false'),
  ],
  validate,
  getNotifications,
);

// @route   PATCH /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.patch(
  '/:id/read',
  protect,
  [param('id').isMongoId().withMessage('Valid notification ID required')],
  validate,
  markAsRead,
);

// @route   PATCH /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.patch('/read-all', protect, markAllAsRead);

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete(
  '/:id',
  protect,
  [param('id').isMongoId().withMessage('Valid notification ID required')],
  validate,
  deleteNotification,
);

module.exports = router;
