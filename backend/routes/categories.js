const express = require('express');
const { body, query } = require('express-validator');
const { protect, authorize, isAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/requestHandler');
const asyncHandler = require('express-async-handler'); // Ensure this line is present
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  getCategoryStats,
  getAllCategoriesStats,
  reorderCategories,
} = require('../controllers/categoryController');

const router = express.Router();

// @route   GET /api/categories/health
// @desc    Health check for the categories API
// @access  Public
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Categories API is running' });
});

// @route   GET /api/categories/stats/all
// @desc    Get statistics for all categories
// @access  Public
router.get('/stats/all', getAllCategoriesStats);

// @route   PUT /api/categories/reorder
// @desc    Reorder categories
// @access  Private/Admin
router.put(
  '/reorder',
  protect,
  isAdmin,
  [
    body('categories')
      .isArray({ min: 1 })
      .withMessage('Categories array is required'),
    body('categories.*.id')
      .isMongoId()
      .withMessage('Each category ID must be valid'),
    body('categories.*.order')
      .isInt({ min: 0 })
      .withMessage('Each order must be a non-negative integer'),
  ],
  validate,
  reorderCategories,
);

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
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
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Search query must not be empty'),
    query('isActive')
      .optional()
      .isIn(['true', 'false', 'all'])
      .withMessage('isActive must be true, false, or all'),
    query('sort')
      .optional()
      .isIn(['order', 'name', 'issues', 'recent'])
      .withMessage('Sort must be order, name, issues, or recent'),
  ],
  validate,
  getCategories,
);

// @route   GET /api/categories/:id
// @desc    Get single category by ID
// @access  Public
router.get(
  '/:id',
  [
    query('id')
      .optional()
      .isMongoId()
      .withMessage('Valid category ID required'),
  ],
  getCategory,
);

// @route   GET /api/categories/:id/stats
// @desc    Get statistics for a specific category
// @access  Public
router.get('/:id/stats', getCategoryStats);

// @route   POST /api/categories
// @desc    Create new category
// @access  Private/Admin
router.post(
  '/',
  protect,
  isAdmin,
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Category name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Name must be lowercase alphanumeric with hyphens only'),
    body('displayName')
      .trim()
      .notEmpty()
      .withMessage('Display name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Display name must be between 2 and 50 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('icon')
      .optional()
      .trim()
      .isLength({ min: 1, max: 10 })
      .withMessage('Icon must be 1-10 characters'),
    body('color')
      .optional()
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage('Color must be a valid hex color code'),
    body('parent')
      .optional()
      .isMongoId()
      .withMessage('Parent must be a valid category ID'),
    body('order')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Order must be a non-negative integer'),
  ],
  validate,
  createCategory,
);

// @route   PUT /api/categories/:id
// @desc    Update category
// @access  Private/Admin
router.put(
  '/:id',
  protect,
  isAdmin,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Name must be lowercase alphanumeric with hyphens only'),
    body('displayName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Display name must be between 2 and 50 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('icon')
      .optional()
      .trim()
      .isLength({ min: 1, max: 10 })
      .withMessage('Icon must be 1-10 characters'),
    body('color')
      .optional()
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage('Color must be a valid hex color code'),
    body('parent')
      .optional()
      .custom(
        (value) =>
          value === null || value === '' || /^[0-9a-fA-F]{24}$/.test(value),
      )
      .withMessage('Parent must be null or a valid category ID'),
    body('order')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Order must be a non-negative integer'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  validate,
  updateCategory,
);

// @route   DELETE /api/categories/:id
// @desc    Delete category
// @access  Private/Admin
router.delete('/:id', protect, isAdmin, deleteCategory);

// @route   PATCH /api/categories/:id/toggle
// @desc    Toggle category active status
// @access  Private/Admin
router.patch('/:id/toggle', protect, isAdmin, toggleCategoryStatus);

module.exports = router;
