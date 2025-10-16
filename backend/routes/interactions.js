const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/requestHandler');

const {
  getComments,
  addComment,
  updateComment,
  deleteComment,
  getCommentCount,
  voteOnIssue,
  removeVote,
  getVoteStatus,
  toggleFollow,
  getFollowStatus,
  markMentionAsRead,
} = require('../controllers/interactionController'); // Corrected file name

// ============================================
// COMMENTS ROUTES
// ============================================

/**
 * @route   GET /api/interactions/issues/:issueId/comments
 * @desc    Get comments for an issue
 * @access  Public
 */
router.get(
  '/issues/:issueId/comments',
  [
    param('issueId').isMongoId().withMessage('Invalid issue ID'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    validate,
  ],
  getComments,
);

/**
 * @route   POST /api/interactions/issues/:issueId/comments
 * @desc    Add comment to an issue
 * @access  Private
 */
router.post(
  '/issues/:issueId/comments',
  protect,
  [
    param('issueId').isMongoId().withMessage('Invalid issue ID'),
    body('commentText')
      .trim()
      .notEmpty()
      .withMessage('Comment text is required')
      .isLength({ min: 1, max: 1000 })
      .withMessage('Comment must be between 1 and 1000 characters'),
    body('isInternal')
      .optional()
      .isBoolean()
      .withMessage('isInternal must be a boolean'),
    validate,
  ],
  addComment,
);

/**
 * @route   PATCH /api/interactions/issues/:issueId/comments/:commentId
 * @desc    Update a comment
 * @access  Private
 */
router.patch(
  '/issues/:issueId/comments/:commentId',
  protect,
  [
    param('issueId').isMongoId().withMessage('Invalid issue ID'),
    param('commentId').isMongoId().withMessage('Invalid comment ID'),
    body('commentText')
      .trim()
      .notEmpty()
      .withMessage('Comment text is required')
      .isLength({ min: 1, max: 1000 })
      .withMessage('Comment must be between 1 and 1000 characters'),
    validate,
  ],
  updateComment,
);

/**
 * @route   DELETE /api/interactions/issues/:issueId/comments/:commentId
 * @desc    Delete a comment
 * @access  Private
 */
router.delete(
  '/issues/:issueId/comments/:commentId',
  protect,
  [
    param('issueId').isMongoId().withMessage('Invalid issue ID'),
    param('commentId').isMongoId().withMessage('Invalid comment ID'),
    validate,
  ],
  deleteComment,
);

/**
 * @route   GET /api/interactions/issues/:issueId/comments/count
 * @desc    Get comment count for an issue
 * @access  Public
 */
router.get(
  '/issues/:issueId/comments/count',
  [param('issueId').isMongoId().withMessage('Invalid issue ID'), validate],
  getCommentCount,
);

// ============================================
// VOTING ROUTES
// ============================================

/**
 * @route   POST /api/interactions/issues/:issueId/vote
 * @desc    Vote on an issue (upvote/downvote)
 * @access  Private
 */
router.post(
  '/issues/:issueId/vote',
  protect,
  [
    param('issueId').isMongoId().withMessage('Invalid issue ID'),
    body('voteType')
      .isIn(['upvote', 'downvote'])
      .withMessage('Vote type must be "upvote" or "downvote"'),
    validate,
  ],
  voteOnIssue,
);

/**
 * @route   DELETE /api/interactions/issues/:issueId/vote
 * @desc    Remove vote from an issue
 * @access  Private
 */
router.delete(
  '/issues/:issueId/vote',
  protect,
  [param('issueId').isMongoId().withMessage('Invalid issue ID'), validate],
  removeVote,
);

/**
 * @route   GET /api/interactions/issues/:issueId/vote/status
 * @desc    Get vote status for current user
 * @access  Private
 */
router.get(
  '/issues/:issueId/vote/status',
  protect,
  [param('issueId').isMongoId().withMessage('Invalid issue ID'), validate],
  getVoteStatus,
);

// ============================================
// FOLLOW ROUTES
// ============================================

/**
 * @route   POST /api/interactions/issues/:issueId/follow
 * @desc    Toggle follow/unfollow an issue
 * @access  Private
 */
router.post(
  '/issues/:issueId/follow',
  protect,
  [param('issueId').isMongoId().withMessage('Invalid issue ID'), validate],
  toggleFollow,
);

/**
 * @route   GET /api/interactions/issues/:issueId/follow/status
 * @desc    Get follow status for current user
 * @access  Private
 */
router.get(
  '/issues/:issueId/follow/status',
  protect,
  [param('issueId').isMongoId().withMessage('Invalid issue ID'), validate],
  getFollowStatus,
);

// ============================================
// MENTION ROUTES
// ============================================

/**
 * @route   PATCH /api/interactions/mentions/:mentionId/read
 * @desc    Mark mention as read
 * @access  Private
 */
router.patch(
  '/mentions/:mentionId/read',
  protect,
  [param('mentionId').isMongoId().withMessage('Invalid mention ID'), validate],
  markMentionAsRead,
);

module.exports = router;
