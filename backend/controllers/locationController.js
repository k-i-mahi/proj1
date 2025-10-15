// controllers/locationController.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Issue = require('../models/Issue');

// Utility: parse and validate float param
const parseFloatParam = (val, fallback = null) => {
  if (typeof val === 'undefined' || val === null || val === '') return fallback;
  const v = parseFloat(val);
  return Number.isNaN(v) ? fallback : v;
};

// Utility: clamp integer
const clampInt = (v, min, max, fallback) => {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
};

/**
 * @desc    Get nearby users (within radius km)
 * @route   GET /api/location/users/nearby
 * @access  Private
 */
const getNearbyUsers = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5, limit = 50 } = req.query;

    console.log('📍 Get nearby users:', { latitude, longitude, radius, limit });

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const lat = parseFloatParam(latitude);
    const lng = parseFloatParam(longitude);
    const radKm = parseFloatParam(radius, 5);
    const lim = clampInt(limit, 1, 200, 50);

    if (
      lat === null ||
      lng === null ||
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates',
      });
    }

    // Mongo expects meters for maxDistance
    const users = await User.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: Math.round(radKm * 1000),
        },
      },
      _id: { $ne: req.user?._id }, // exclude current user
      isActive: true,
    })
      .select('name email avatar role profession location')
      .limit(lim)
      .lean();

    console.log('✅ Nearby users found:', users.length);

    return res.json({
      success: true,
      data: users,
      meta: {
        count: users.length,
        center: { latitude: lat, longitude: lng },
        radiusKm: radKm,
        unit: 'km',
        limit: lim,
      },
    });
  } catch (error) {
    console.error('Get nearby users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching nearby users',
      error: error.message,
    });
  }
};

/**
 * @desc    Get nearby issues (aggregation) with computed stats
 * @route   GET /api/location/issues/nearby
 * @access  Public
 *
 * Query params:
 *  latitude, longitude (required)
 *  radius (km, optional, default 5)
 *  status, priority, category (optional filters)
 *  limit (optional, default 50)
 */
const getNearbyIssues = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      radius = 5,
      status,
      priority,
      category,
      limit = 50,
      includeInactive = 'false',
    } = req.query;

    console.log('📍 Get nearby issues:', {
      latitude,
      longitude,
      radius,
      status,
      priority,
      category,
      limit,
    });

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const lat = parseFloatParam(latitude);
    const lng = parseFloatParam(longitude);
    const radKm = parseFloatParam(radius, 5);
    const lim = clampInt(limit, 1, 500, 50);

    if (
      lat === null ||
      lng === null ||
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates',
      });
    }

    // Build match filters (used after geoNear)
    const matchFilters = {};
    if (status) matchFilters.status = status;
    if (priority) matchFilters.priority = priority;
    if (category) matchFilters.category = mongoose.Types.ObjectId(category);

    // Public issues only for unauthenticated users
    if (!req.user) {
      matchFilters.isPublic = true;
    } else if (includeInactive !== 'true') {
      matchFilters.isActive = true;
    }

    // Aggregation pipeline using $geoNear for accurate distances and sorting by proximity
    // Note: $geoNear must be the first stage when present
    const pipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distanceMeters',
          maxDistance: Math.round(radKm * 1000),
          spherical: true,
        },
      },
      // Optional filtering stage
      { $match: matchFilters },
      // Project fields we want + compute stats from nested arrays safely
      {
        $project: {
          title: 1,
          description: 1,
          location: 1,
          status: 1,
          priority: 1,
          category: 1,
          reportedBy: 1,
          assignedTo: 1,
          images: 1,
          tags: 1,
          createdAt: 1,
          updatedAt: 1,
          distanceMeters: 1,
          // compute sizes safely
          'stats.upvotes': { $size: { $ifNull: ['$votes.upvotes', []] } },
          'stats.downvotes': { $size: { $ifNull: ['$votes.downvotes', []] } },
          'stats.commentCount': { $size: { $ifNull: ['$comments', []] } },
          'stats.views': { $ifNull: ['$views', 0] },
          'stats.followerCount': { $size: { $ifNull: ['$followers', []] } },
        },
      },
      // Populate reportedBy, assignedTo, category via $lookup
      {
        $lookup: {
          from: 'users',
          localField: 'reportedBy',
          foreignField: '_id',
          as: 'reportedBy',
        },
      },
      { $unwind: { path: '$reportedBy', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedTo',
          foreignField: '_id',
          as: 'assignedTo',
        },
      },
      { $unwind: { path: '$assignedTo', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      // Final projection to shape response
      {
        $project: {
          title: 1,
          description: 1,
          location: 1,
          status: 1,
          priority: 1,
          images: 1,
          tags: 1,
          createdAt: 1,
          updatedAt: 1,
          distanceMeters: 1,
          'reportedBy._id': 1,
          'reportedBy.name': 1,
          'reportedBy.avatar': 1,
          'reportedBy.role': 1,
          'assignedTo._id': 1,
          'assignedTo.name': 1,
          'assignedTo.avatar': 1,
          'category._id': 1,
          'category.name': 1,
          'category.displayName': 1,
          'category.icon': 1,
          'category.color': 1,
          stats: 1,
        },
      },
      { $limit: lim },
    ];

    const aggResult = await Issue.aggregate(pipeline).allowDiskUse(true);

    // Convert distance meters to km and add human-friendly meta
    const issuesWithMeta = aggResult.map((doc) => ({
      ...doc,
      distanceKm:
        doc.distanceMeters != null
          ? +(doc.distanceMeters / 1000).toFixed(3)
          : null,
    }));

    console.log('✅ Nearby issues found:', issuesWithMeta.length);

    return res.json({
      success: true,
      data: issuesWithMeta,
      meta: {
        count: issuesWithMeta.length,
        center: { latitude: lat, longitude: lng },
        radiusKm: radKm,
        radiusMeters: Math.round(radKm * 1000),
        unit: 'km',
        limit: lim,
        filters: { status, priority, category },
      },
    });
  } catch (error) {
    console.error('Get nearby issues error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching nearby issues',
      error: error.message,
    });
  }
};

/**
 * @desc    Get issues inside map bounds (viewport)
 * @route   GET /api/location/issues/bounds
 * @access  Public
 */
const getIssuesInBounds = async (req, res) => {
  try {
    const {
      swLat,
      swLng,
      neLat,
      neLng,
      status,
      priority,
      category,
      limit = 500,
    } = req.query;

    console.log('📍 Get issues in bounds - Raw params:', {
      swLat,
      swLng,
      neLat,
      neLng,
      status,
      priority,
      category,
      limit,
    });

    // Validation is now handled by express-validator with .toFloat()
    // But we still do a safety check
    if (!swLat || !swLng || !neLat || !neLng) {
      return res.status(400).json({
        success: false,
        message: 'Bounding box coordinates are required',
        received: { swLat, swLng, neLat, neLng },
      });
    }

    const minLimit = 1;
    const maxLimit = 2000;
    const lim = clampInt(limit, minLimit, maxLimit, 500);

    // These should already be floats from validation
    const swLatF = parseFloat(swLat);
    const swLngF = parseFloat(swLng);
    const neLatF = parseFloat(neLat);
    const neLngF = parseFloat(neLng);

    console.log('📍 Parsed coordinates:', {
      swLatF,
      swLngF,
      neLatF,
      neLngF,
      types: {
        swLat: typeof swLatF,
        swLng: typeof swLngF,
        neLat: typeof neLatF,
        neLng: typeof neLngF,
      },
    });

    if (
      [swLatF, swLngF, neLatF, neLngF].some(
        (v) => v === null || Number.isNaN(v),
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bounding box coordinates',
        details: {
          swLat: swLatF,
          swLng: swLngF,
          neLat: neLatF,
          neLng: neLngF,
        },
      });
    }

    // Validate coordinate ranges
    if (
      swLatF < -90 || swLatF > 90 ||
      neLatF < -90 || neLatF > 90 ||
      swLngF < -180 || swLngF > 180 ||
      neLngF < -180 || neLngF > 180
    ) {
      return res.status(400).json({
        success: false,
        message: 'Coordinates out of valid range',
        details: 'Latitude must be -90 to 90, Longitude must be -180 to 180',
      });
    }

    // Build query
    const query = {
      'location.coordinates': {
        $geoWithin: {
          $box: [
            [swLngF, swLatF], // Southwest corner [lng, lat]
            [neLngF, neLatF], // Northeast corner [lng, lat]
          ],
        },
      },
    };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) {
      try {
        query.category = mongoose.Types.ObjectId(category);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID format',
        });
      }
    }
    if (!req.user) query.isPublic = true;

    console.log('🔍 MongoDB query:', JSON.stringify(query, null, 2));

    const issues = await Issue.find(query)
      .populate('reportedBy', 'name avatar')
      .populate('category', 'name displayName icon color')
      .populate('assignedTo', 'name avatar')
      .select('title description status priority location category reportedBy assignedTo createdAt updatedAt images tags')
      .limit(lim)
      .lean();

    console.log('✅ Issues in bounds found:', issues.length);

    return res.json({
      success: true,
      data: issues,
      meta: {
        count: issues.length,
        bounds: {
          southwest: { latitude: swLatF, longitude: swLngF },
          northeast: { latitude: neLatF, longitude: neLngF },
        },
        limit: lim,
        filters: { status, priority, category },
      },
    });
  } catch (error) {
    console.error('❌ Get issues in bounds error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching issues',
      error: error.message,
    });
  }
};

/**
 * @desc    Get heatmap data for issues inside optional bounding box
 * @route   GET /api/location/heatmap
 * @access  Public
 */
const getIssueHeatmap = async (req, res) => {
  try {
    const {
      swLat,
      swLng,
      neLat,
      neLng,
      status,
      category,
      limit = 500,
    } = req.query;

    console.log('📍 Get issue heatmap:', {
      swLat,
      swLng,
      neLat,
      neLng,
      status,
      category,
    });

    const query = {};

    if (swLat && swLng && neLat && neLng) {
      const swLatF = parseFloatParam(swLat);
      const swLngF = parseFloatParam(swLng);
      const neLatF = parseFloatParam(neLat);
      const neLngF = parseFloatParam(neLng);
      if (
        [swLatF, swLngF, neLatF, neLngF].some(
          (v) => v === null || Number.isNaN(v),
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message: 'Invalid bounding box coordinates',
          });
      }
      query['location.coordinates'] = {
        $geoWithin: {
          $box: [
            [swLngF, swLatF],
            [neLngF, neLatF],
          ],
        },
      };
    }

    if (status) query.status = status;
    if (category) query.category = category;
    if (!req.user) query.isPublic = true;

    const lim = clampInt(limit, 1, 2000, 500);

    const issues = await Issue.find(query)
      .select('location priority status')
      .limit(lim)
      .lean();

    const heatmapData = issues
      .filter((it) => it.location && Array.isArray(it.location.coordinates))
      .map((it) => ({
        lat: it.location.coordinates[1],
        lng: it.location.coordinates[0],
        weight: it.priority === 'urgent' ? 3 : it.priority === 'high' ? 2 : 1,
        status: it.status,
      }));

    console.log('✅ Heatmap points:', heatmapData.length);

    return res.json({
      success: true,
      data: heatmapData,
      meta: { count: heatmapData.length },
    });
  } catch (error) {
    console.error('Get heatmap error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error generating heatmap',
      error: error.message,
    });
  }
};

/**
 * @desc    Get location statistics (issues, users, category breakdown) within radius km
 * @route   GET /api/location/stats
 * @access  Public
 */
const getLocationStats = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query;

    console.log('📍 Get location stats:', { latitude, longitude, radius });

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const lat = parseFloatParam(latitude);
    const lng = parseFloatParam(longitude);
    const radKm = parseFloatParam(radius, 5);

    if (
      lat === null ||
      lng === null ||
      Number.isNaN(lat) ||
      Number.isNaN(lng)
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid coordinates' });
    }

    // Issue stats using aggregation and $geoNear
    const issueStatsPipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distanceMeters',
          maxDistance: Math.round(radKm * 1000),
          spherical: true,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
          avgViews: { $avg: { $ifNull: ['$views', 0] } },
          avgUpvotes: { $avg: { $size: { $ifNull: ['$votes.upvotes', []] } } },
        },
      },
    ];

    const issueStats = await Issue.aggregate(issueStatsPipeline).allowDiskUse(
      true,
    );

    // User count near area
    const userCount = await User.countDocuments({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: Math.round(radKm * 1000),
        },
      },
      isActive: true,
    });

    // Category breakdown
    const categoryStatsPipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distanceMeters',
          maxDistance: Math.round(radKm * 1000),
          spherical: true,
        },
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          categoryId: '$category._id',
          name: '$category.displayName',
          icon: '$category.icon',
          color: '$category.color',
          count: 1,
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ];

    const categoryStats = await Issue.aggregate(
      categoryStatsPipeline,
    ).allowDiskUse(true);

    return res.json({
      success: true,
      data: {
        issues: issueStats[0] || {
          total: 0,
          open: 0,
          inProgress: 0,
          resolved: 0,
          closed: 0,
          avgViews: 0,
          avgUpvotes: 0,
        },
        users: userCount,
        categories: categoryStats,
      },
      meta: {
        center: { latitude: lat, longitude: lng },
        radiusKm: radKm,
        radiusMeters: Math.round(radKm * 1000),
        unit: 'km',
      },
    });
  } catch (error) {
    console.error('Get location stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching statistics',
      error: error.message,
    });
  }
};

/**
 * @desc    Reverse geocode coordinates to address (placeholder)
 * @route   GET /api/location/reverse-geocode
 * @access  Public
 *
 * NOTE: This is a placeholder. Integrate with Google Maps, Mapbox, or Nominatim.
 */
const reverseGeocode = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({
          success: false,
          message: 'Latitude and longitude are required',
        });
    }

    // TODO: Integrate with a real geocoding provider
    return res.json({
      success: true,
      data: {
        latitude: parseFloatParam(latitude),
        longitude: parseFloatParam(longitude),
        address: 'Geocoding service not configured',
        city: null,
        state: null,
        country: null,
        postalCode: null,
      },
      message: 'Geocoding service not configured',
    });
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * @desc    Calculate Haversine distance between two points (km)
 * @route   GET /api/location/distance
 * @access  Public
 */
const calculateDistance = async (req, res) => {
  try {
    const { lat1, lng1, lat2, lng2 } = req.query;

    if (!lat1 || !lng1 || !lat2 || !lng2) {
      return res.status(400).json({
        success: false,
        message: 'Two coordinate pairs are required',
      });
    }

    const toRad = (value) => (value * Math.PI) / 180;

    const aLat = parseFloatParam(lat1);
    const aLng = parseFloatParam(lng1);
    const bLat = parseFloatParam(lat2);
    const bLng = parseFloatParam(lng2);

    if ([aLat, aLng, bLat, bLng].some((v) => v === null || Number.isNaN(v))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates',
      });
    }

    const R = 6371; // km
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);

    const aa =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(aLat)) *
        Math.cos(toRad(bLat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    const distanceKm = R * c;

    return res.json({
      success: true,
      data: {
        distanceKm: parseFloat(distanceKm.toFixed(3)),
        distanceMiles: parseFloat((distanceKm * 0.621371).toFixed(3)),
        unit: 'km',
        from: { latitude: aLat, longitude: aLng },
        to: { latitude: bLat, longitude: bLng },
      },
    });
  } catch (error) {
    console.error('Calculate distance error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error calculating distance',
      error: error.message,
    });
  }
};

module.exports = {
  getNearbyUsers,
  getNearbyIssues,
  getIssuesInBounds,
  getIssueHeatmap,
  getLocationStats,
  reverseGeocode,
  calculateDistance,
};
