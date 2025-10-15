const Activity = require('../models/Activity');
const Issue = require('../models/Issue');

/**
 * @desc    Get activity feed (global or filtered)
 * @route   GET /api/activities
 * @access  Public
 */
const getRecentActivities = async (req, res) => {
  try {
    const { page = 1, limit = 20, action, userId, issueId, type } = req.query;

    const query = {};

    if (action || type) query.action = action || type;
    if (userId) query.user = userId;
    if (issueId) query.issue = issueId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .populate('user', 'name avatar role')
        .populate({
          path: 'issue',
          select: 'title status category',
          populate: {
            path: 'category',
            select: 'name displayName icon color',
          },
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Activity.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activities',
    });
  }
};

/**
 * @desc    Get activities for specific issue
 * @route   GET /api/activities/issues/:issueId
 * @access  Public
 */
const getIssueActivities = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if issue exists
    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [activities, total] = await Promise.all([
      Activity.find({ issue: issueId })
        .populate('user', 'name avatar role')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Activity.countDocuments({ issue: issueId }),
    ]);

    res.json({
      success: true,
      data: activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get issue activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch issue activities',
    });
  }
};

/**
 * @desc    Get user activity history
 * @route   GET /api/activities/users/:userId
 * @access  Private (Self or Admin)
 */
const getUserActivities = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Check authorization
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this user's activities",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [activities, total] = await Promise.all([
      Activity.find({ user: userId })
        .populate({
          path: 'issue',
          select: 'title status category',
          populate: {
            path: 'category',
            select: 'name displayName icon color',
          },
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Activity.countDocuments({ user: userId }),
    ]);

    res.json({
      success: true,
      data: activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get user activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activities',
    });
  }
};

/**
 * @desc    Get activity statistics
 * @route   GET /api/activities/stats
 * @access  Private (Admin/Authority)
 */
const getActivityStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }

    const matchStage =
      dateFilter.$gte || dateFilter.$lte ? { createdAt: dateFilter } : {};

    // Activity by action type
    const byAction = await Activity.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          action: '$_id',
          count: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Most active users
    const activeUsers = await Activity.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$user',
          activityCount: { $sum: 1 },
        },
      },
      { $sort: { activityCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: '$user._id',
          name: '$user.name',
          avatar: '$user.avatar',
          role: '$user.role',
          activityCount: 1,
        },
      },
    ]);

    // Activity timeline (daily)
    const timeline = await Activity.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
              },
            },
            action: '$action',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
      {
        $group: {
          _id: '$_id.date',
          activities: {
            $push: {
              action: '$_id.action',
              count: '$count',
            },
          },
          total: { $sum: '$count' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Total activities
    const totalActivities = await Activity.countDocuments(matchStage);

    res.json({
      success: true,
      data: {
        totalActivities,
        byAction,
        activeUsers,
        timeline,
      },
    });
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity statistics',
    });
  }
};

/**
 * @desc    Create activity (helper function for internal use)
 * @param   {Object} activityData
 * @returns {Promise<Activity>}
 */
const createActivity = async (activityData) => {
  try {
    const activity = await Activity.create(activityData);
    return activity;
  } catch (error) {
    console.error('Create activity error:', error);
    throw error;
  }
};

/**
 * @desc    Log issue activity
 * @param   {String} issueId
 * @param   {String} userId
 * @param   {String} action
 * @param   {String} description
 * @param   {Object} metadata
 */
const logIssueActivity = async (
  issueId,
  userId,
  action,
  description,
  metadata = {},
) => {
  try {
    await Activity.create({
      issue: issueId,
      user: userId,
      action,
      description,
      metadata,
    });
  } catch (error) {
    console.error('Log activity error:', error);
    // Don't throw - activity logging should not break the main flow
  }
};

module.exports = {
  getRecentActivities,
  getIssueActivities,
  getUserActivities,
  getActivityStats,
  createActivity,
  logIssueActivity,
};
