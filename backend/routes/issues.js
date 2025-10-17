const express = require('express');
const { body, query } = require('express-validator');
const path = require('path');
const multer = require('multer');
const asyncHandler = require('express-async-handler'); // Ensure this line is present
const {
  protect,
  optionalAuth,
  authorize,
  isAdmin,
} = require('../middleware/auth');
const { validate } = require('../middleware/requestHandler');
const {
  canView,
  canUpdate,
  canDelete,
  canAssign,
  canChangeStatus,
  canComment,
} = require('../middleware/resourceAccess');
const {
  getIssues,
  getIssueById,
  createIssue,
  updateIssue,
  deleteIssue,
  addComment,
  voteOnIssue,
  toggleFollow,
  assignIssue,
  changeStatus,
  getNearbyIssues,
  getIssueStats,
} = require('../controllers/issueController');

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/issues/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'issue-' + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'image/gif',
  ];
  if (allowed.includes(file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const router = express.Router();

// @route   GET /api/issues
// @desc    Get all issues with filters
// @access  Public (enhanced if authenticated)
router.get(
  '/',
  optionalAuth,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['open', 'in-progress', 'resolved', 'closed', 'rejected'])
      .withMessage('Invalid status'),
    query('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority'),
    query('category').optional().isMongoId().withMessage('Invalid category ID'),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Search query must not be empty'),
    query('sort')
      .optional()
      .isIn([
        'createdAt',
        '-createdAt',
        'updatedAt',
        '-updatedAt',
        'title',
        '-title',
        'priority',
        '-priority',
      ])
      .withMessage('Invalid sort option'),
  ],
  validate,
  getIssues,
);

// @route   GET /api/issues/stats
// @desc    Get issue statistics
// @access  Public
router.get('/stats', getIssueStats);

// @route   GET /api/issues/nearby
// @desc    Get nearby issues
// @access  Public (enhanced if authenticated)
router.get(
  '/nearby',
  optionalAuth,
  [
    query('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid latitude required'),
    query('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid longitude required'),
    query('radius')
      .optional()
      .isInt({ min: 100, max: 50000 })
      .withMessage('Radius must be between 100 and 50000 meters'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
  validate,
  getNearbyIssues,
);

// @route   GET /api/issues/:id
// @desc    Get single issue by ID
// @access  Public (private issues require auth)
router.get('/:id', optionalAuth, canView, getIssueById);

// @route   POST /api/issues
// @desc    Create new issue
// @access  Private
router.post(
  '/',
  protect,
  upload.array('images', 5), // Allow up to 5 images
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ min: 5, max: 200 })
      .withMessage('Title must be between 5 and 200 characters'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ min: 10, max: 2000 })
      .withMessage('Description must be between 10 and 2000 characters'),
    body('category')
      .notEmpty()
      .withMessage('Category is required')
      .isMongoId()
      .withMessage('Valid category ID required'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Priority must be low, medium, high, or urgent'),
    body('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid latitude required'),
    body('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid longitude required'),
    body('address')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Address cannot exceed 200 characters'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('tags.*')
      .optional()
      .trim()
      .isLength({ min: 2, max: 30 })
      .withMessage('Each tag must be between 2 and 30 characters'),
    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean'),
  ],
  validate,
  createIssue,
);

// @route   PUT /api/issues/:id
// @desc    Update issue
// @access  Private (Owner or Admin)
router.put(
  '/:id',
  protect,
  canUpdate,
  upload.array('images', 5),
  [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('Title must be between 5 and 200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Description must be between 10 and 2000 characters'),
    body('category')
      .optional()
      .isMongoId()
      .withMessage('Valid category ID required'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority'),
    body('latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid latitude required'),
    body('longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid longitude required'),
    body('address')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Address cannot exceed 200 characters'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean'),
  ],
  validate,
  updateIssue,
);

// @route   DELETE /api/issues/:id
// @desc    Delete issue
// @access  Private (Owner or Admin)
router.delete('/:id', protect, canDelete, deleteIssue);

// @route   POST /api/issues/:id/comments
// @desc    Add comment to issue
// @access  Private
router.post(
  '/:id/comments',
  protect,
  canComment,
  [
    body('text')
      .optional()
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Comment must be between 1 and 1000 characters'),
    body('commentText')
      .optional()
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Comment must be between 1 and 1000 characters'),
    body('isInternal')
      .optional()
      .isBoolean()
      .withMessage('isInternal must be a boolean'),
  ],
  validate,
  addComment,
);

// @route   POST /api/issues/:id/vote
// @desc    Vote on issue (upvote/downvote)
// @access  Private
router.post(
  '/:id/vote',
  protect,
  [
    body('voteType')
      .notEmpty()
      .withMessage('Vote type is required')
      .isIn(['upvote', 'downvote'])
      .withMessage('Vote type must be upvote or downvote'),
  ],
  validate,
  voteOnIssue,
);

// @route   POST /api/issues/:id/follow
// @desc    Follow/Unfollow issue
// @access  Private
router.post('/:id/follow', protect, toggleFollow);

// @route   PATCH /api/issues/:id/assign
// @desc    Assign issue to authority
// @access  Private/Admin
router.patch(
  '/:id/assign',
  protect,
  canAssign,
  [
    body('assignedTo')
      .notEmpty()
      .withMessage('Assignee ID is required')
      .isMongoId()
      .withMessage('Valid user ID required'),
  ],
  validate,
  assignIssue,
);

// @route   PATCH /api/issues/:id/status
// @desc    Change issue status
// @access  Private (Assigned authority or Admin)
router.patch(
  '/:id/status',
  protect,
  canChangeStatus,
  [
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['open', 'in-progress', 'resolved', 'closed', 'rejected'])
      .withMessage('Invalid status'),
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters'),
  ],
  validate,
  changeStatus,
);

module.exports = router;
