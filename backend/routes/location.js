const express = require('express');
const { query } = require('express-validator');
const { protect, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/requestHandler');
const asyncHandler = require('express-async-handler'); // Ensure this line is present
const {
  getNearbyUsers,
  getNearbyIssues,
  getIssuesInBounds,
  getIssueHeatmap,
  getLocationStats,
  reverseGeocode,
  calculateDistance,
} = require('../controllers/locationController');

const router = express.Router();

// @route   GET /api/location/users/nearby
// @desc    Get users within a radius
// @access  Private
router.get(
  '/users/nearby',
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
      .isFloat({ min: 0.1, max: 100 })
      .withMessage('Radius must be between 0.1 and 100 km'),
  ],
  validate,
  getNearbyUsers,
);

// @route   GET /api/location/issues/nearby
// @desc    Get issues within a radius
// @access  Public (enhanced if authenticated)
router.get(
  '/issues/nearby',
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
      .isFloat({ min: 0.1, max: 50 })
      .withMessage('Radius must be between 0.1 and 50 km'),
    query('status')
      .optional()
      .isIn(['open', 'in-progress', 'resolved', 'closed', 'rejected'])
      .withMessage('Invalid status'),
    query('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority'),
    query('category').optional().isMongoId().withMessage('Invalid category ID'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
  validate,
  getNearbyIssues,
);

// @route   GET /api/location/issues/bounds
// @desc    Get issues within map viewport bounds
// @access  Public (enhanced if authenticated)
router.get(
  '/issues/bounds',
  optionalAuth,
  [
    query('swLat')
      .notEmpty()
      .withMessage('Southwest latitude required')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid southwest latitude required (-90 to 90)')
      .toFloat(), // Convert to float
    query('swLng')
      .notEmpty()
      .withMessage('Southwest longitude required')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid southwest longitude required (-180 to 180)')
      .toFloat(), // Convert to float
    query('neLat')
      .notEmpty()
      .withMessage('Northeast latitude required')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid northeast latitude required (-90 to 90)')
      .toFloat(), // Convert to float
    query('neLng')
      .notEmpty()
      .withMessage('Northeast longitude required')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid northeast longitude required (-180 to 180)')
      .toFloat(), // Convert to float
    query('status')
      .optional()
      .isIn(['open', 'in-progress', 'resolved', 'closed', 'rejected'])
      .withMessage('Invalid status'),
    query('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority'),
    query('category')
      .optional()
      .isMongoId()
      .withMessage('Invalid category ID'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 2000 })
      .withMessage('Limit must be between 1 and 2000')
      .toInt(), // Convert to int
  ],
  validate,
  getIssuesInBounds,
);

// @route   GET /api/location/heatmap
// @desc    Get heatmap data for issues
// @access  Public (enhanced if authenticated)
router.get(
  '/heatmap',
  optionalAuth,
  [
    query('swLat')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid southwest latitude required'),
    query('swLng')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid southwest longitude required'),
    query('neLat')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid northeast latitude required'),
    query('neLng')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid northeast longitude required'),
    query('status')
      .optional()
      .isIn(['open', 'in-progress', 'resolved', 'closed', 'rejected'])
      .withMessage('Invalid status'),
    query('category').optional().isMongoId().withMessage('Invalid category ID'),
  ],
  validate,
  getIssueHeatmap,
);

// @route   GET /api/location/stats
// @desc    Get location statistics
// @access  Public (enhanced if authenticated)
router.get(
  '/stats',
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
      .isFloat({ min: 0.1, max: 100 })
      .withMessage('Radius must be between 0.1 and 100 km'),
  ],
  validate,
  getLocationStats,
);

// @route   GET /api/location/reverse-geocode
// @desc    Get address from coordinates (reverse geocoding)
// @access  Public
router.get(
  '/reverse-geocode',
  [
    query('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid latitude required'),
    query('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid longitude required'),
  ],
  validate,
  reverseGeocode,
);

// @route   GET /api/location/distance
// @desc    Calculate distance between two points
// @access  Public
router.get(
  '/distance',
  [
    query('lat1')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid first latitude required'),
    query('lng1')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid first longitude required'),
    query('lat2')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid second latitude required'),
    query('lng2')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid second longitude required'),
  ],
  validate,
  calculateDistance,
);

module.exports = router;
