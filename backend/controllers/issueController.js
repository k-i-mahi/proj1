const Issue = require('../models/Issue');
const User = require('../models/User');
const Category = require('../models/Category');
const Activity = require('../models/Activity');
const NotificationHelper = require('../utils/notificationHelper');
const { validationResult } = require('express-validator');

/**
 * @desc    Get all issues with filtering, pagination, and sorting
 * @route   GET /api/issues
 * @access  Public
 */
const getIssues = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      priority,
      search,
      sortBy = '-createdAt',
      reportedBy,
      assignedTo,
      latitude,
      longitude,
      radius = 10000, // 10km default
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    if (reportedBy) {
      query.reportedBy =
        reportedBy === 'me' && req.user ? req.user.id : reportedBy;
    }

    if (assignedTo) query.assignedTo = assignedTo;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    if (latitude && longitude) {
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: parseInt(radius),
        },
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [issues, total] = await Promise.all([
      Issue.find(query)
        .sort(sortBy)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('reportedBy', 'name avatar email')
        .populate('category', 'name displayName icon color')
        .populate('assignedTo', 'name avatar')
        .lean(),
      Issue.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: issues,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch issues',
    });
  }
};

/**
 * @desc    Get single issue by ID
 * @route   GET /api/issues/:id
 * @access  Public
 */
const getIssueById = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('reportedBy', 'name avatar email role')
      .populate('category', 'name displayName icon color')
      .populate('assignedTo', 'name avatar email')
      .populate('comments.user', 'name avatar role');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    // Increment view count using the instance method (keeps stats in sync)
    try {
      await issue.incrementViews();
    } catch (incErr) {
      // don't block response if increment fails; log for debugging
      console.error('Failed to increment views:', incErr);
    }

    res.json({
      success: true,
      data: issue,
    });
  } catch (error) {
    console.error('Get issue by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch issue',
    });
  }
};

/**
 * @desc    Create new issue
 * @route   POST /api/issues
 * @access  Private
 */
const createIssue = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const issueData = {
      ...req.body,
      reportedBy: req.user.id,
      location: {
        type: 'Point',
        coordinates: [
          parseFloat(req.body.longitude),
          parseFloat(req.body.latitude),
        ],
        address: req.body.address || '',
      },
      votes: {
        upvotes: [],
        downvotes: [],
      },
      comments: [],
      followers: [],
    };

    // Handle uploaded images
    if (req.files && req.files.length > 0) {
      issueData.images = req.files.map((file) => ({
        url: `/uploads/issues/${file.filename}`,
        publicId: file.filename,
        uploadedAt: new Date(),
      }));
    }

    const issue = await Issue.create(issueData);

    await issue.populate([
      { path: 'reportedBy', select: 'name avatar email' },
      { path: 'category', select: 'name displayName icon color' },
    ]);

    // Update category issue count
    if (issue.category) {
      await Category.findByIdAndUpdate(
        issue.category._id,
        { 
          $inc: { 'metadata.issueCount': 1 },
          $set: { 'metadata.lastUpdated': new Date() }
        }
      );
    }

    // Log activity
    await Activity.create({
      user: req.user.id,
      issue: issue._id,
      action: 'created',
      description: `Created issue: ${issue.title}`,
    });

    // Send notification
    await NotificationHelper.notifyIssueCreated(issue, req.user);

    res.status(201).json({
      success: true,
      message: 'Issue created successfully',
      data: issue,
    });
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create issue',
      error: error.message,
    });
  }
};

/**
 * @desc    Update issue
 * @route   PUT /api/issues/:id
 * @access  Private
 */
const updateIssue = async (req, res) => {
  try {
    let issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    // Check authorization
    if (
      issue.reportedBy.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this issue',
      });
    }

    const updateData = { ...req.body };
    const oldStatus = issue.status;

    // Update location if coordinates provided
    if (req.body.latitude && req.body.longitude) {
      updateData.location = {
        type: 'Point',
        coordinates: [
          parseFloat(req.body.longitude),
          parseFloat(req.body.latitude),
        ],
        address: req.body.address,
      };
    }

    // Handle new uploaded images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => ({
        url: `/uploads/${file.filename}`,
        publicId: file.filename,
      }));
      updateData.images = [...(issue.images || []), ...newImages];
    }

    issue = await Issue.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate([
      { path: 'reportedBy', select: 'name avatar email' },
      { path: 'category', select: 'name displayName icon color' },
      { path: 'assignedTo', select: 'name avatar' },
    ]);

    // Update category resolved count if status changed to/from resolved/closed
    if (req.body.status && req.body.status !== oldStatus && issue.category) {
      const newStatus = req.body.status;
      const wasResolved = ['resolved', 'closed'].includes(oldStatus);
      const isNowResolved = ['resolved', 'closed'].includes(newStatus);

      if (!wasResolved && isNowResolved) {
        // Issue was resolved
        await Category.findByIdAndUpdate(
          issue.category._id,
          { 
            $inc: { 'metadata.resolvedCount': 1 },
            $set: { 'metadata.lastUpdated': new Date() }
          }
        );
      } else if (wasResolved && !isNowResolved) {
        // Issue was un-resolved
        await Category.findByIdAndUpdate(
          issue.category._id,
          { 
            $inc: { 'metadata.resolvedCount': -1 },
            $set: { 'metadata.lastUpdated': new Date() }
          }
        );
      }
    }

    // Log activity
    await Activity.create({
      user: req.user.id,
      issue: issue._id,
      action: 'updated',
      description: `Updated issue details`,
    });

    res.json({
      success: true,
      message: 'Issue updated successfully',
      data: issue,
    });
  } catch (error) {
    console.error('Update issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update issue',
    });
  }
};

/**
 * @desc    Delete issue
 * @route   DELETE /api/issues/:id
 * @access  Private
 */
const deleteIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    // Check authorization
    if (
      issue.reportedBy.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this issue',
      });
    }

    // Update category issue count before deletion
    if (issue.category) {
      await Category.findByIdAndUpdate(
        issue.category,
        { 
          $inc: { 'metadata.issueCount': -1 },
          $set: { 'metadata.lastUpdated': new Date() }
        }
      );
    }

    await issue.deleteOne();

    // Log activity (before deletion)
    await Activity.create({
      user: req.user.id,
      issue: issue._id,
      action: 'deleted',
      description: `Deleted issue: ${issue.title}`,
    });

    res.json({
      success: true,
      message: 'Issue deleted successfully',
    });
  } catch (error) {
    console.error('Delete issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete issue',
    });
  }
};

/**
 * @desc    Add comment to issue
 * @route   POST /api/issues/:id/comments
 * @access  Private
 */
const addComment = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    // Support both 'text' and 'commentText' field names for compatibility
    const commentText = req.body.text || req.body.commentText;

    if (!commentText || !commentText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required',
      });
    }

    const comment = {
      user: req.user.id,
      commentText: commentText.trim(),
      isInternal: req.body.isInternal || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    issue.comments.push(comment);
    await issue.save();

    // Populate the newly added comment's user
    await issue.populate('comments.user', 'name avatar role');

    const newComment = issue.comments[issue.comments.length - 1];

    // Log activity
    await Activity.create({
      user: req.user.id,
      issue: issue._id,
      action: 'commented',
      description: 'Added a comment',
      metadata: {
        commentText: commentText.substring(0, 100),
      },
    });

    // Send notification
    await NotificationHelper.notifyNewComment(issue, req.user, commentText);

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: newComment,
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: error.message,
    });
  }
};

/**
 * @desc    Vote on issue
 * @route   POST /api/issues/:id/vote
 * @access  Private
 */
const voteOnIssue = async (req, res) => {
  try {
    const { voteType } = req.body;

    if (!['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote type. Must be "upvote" or "downvote"',
      });
    }

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    // Initialize votes object if it doesn't exist
    if (!issue.votes) {
      issue.votes = { upvotes: [], downvotes: [] };
    }
    if (!issue.votes.upvotes) issue.votes.upvotes = [];
    if (!issue.votes.downvotes) issue.votes.downvotes = [];

    // Remove previous vote if exists
    issue.votes.upvotes = issue.votes.upvotes.filter(
      (id) => id.toString() !== req.user.id,
    );
    issue.votes.downvotes = issue.votes.downvotes.filter(
      (id) => id.toString() !== req.user.id,
    );

    // Add new vote
    if (voteType === 'upvote') {
      issue.votes.upvotes.push(req.user.id);

      // Log activity
      await Activity.create({
        user: req.user.id,
        issue: issue._id,
        action: 'voted',
        description: 'Upvoted this issue',
        metadata: { voteType: 'upvote' },
      });

      // Send notification for upvote
      await NotificationHelper.notifyUpvoteReceived(issue, req.user);
    } else if (voteType === 'downvote') {
      issue.votes.downvotes.push(req.user.id);

      // Log activity
      await Activity.create({
        user: req.user.id,
        issue: issue._id,
        action: 'voted',
        description: 'Downvoted this issue',
        metadata: { voteType: 'downvote' },
      });
    }

    await issue.save();

    // Populate helpful fields before returning
    await issue.populate([
      { path: 'reportedBy', select: 'name avatar email' },
      { path: 'category', select: 'name displayName icon color' },
      { path: 'assignedTo', select: 'name avatar' },
      { path: 'comments.user', select: 'name avatar role' },
    ]);

    // Build response object that includes computed stats
    const issueResponse = issue.toObject();
    issueResponse.stats = {
      upvotes: issue.votes?.upvotes?.length || 0,
      downvotes: issue.votes?.downvotes?.length || 0,
      commentCount: issue.comments?.length || 0,
      views: issue.views || 0,
      followerCount: issue.followers?.length || 0,
    };

    res.json({
      success: true,
      message: 'Vote recorded successfully',
      data: issueResponse,
    });
  } catch (error) {
    console.error('Vote on issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record vote',
      error: error.message,
    });
  }
};

/**
 * @desc    Toggle follow issue
 * @route   POST /api/issues/:id/follow
 * @access  Private
 */
const toggleFollow = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    if (!issue.followers) issue.followers = [];

    const isFollowing = issue.followers.some(
      (id) => id.toString() === req.user.id,
    );

    if (isFollowing) {
      issue.followers = issue.followers.filter(
        (id) => id.toString() !== req.user.id,
      );

      // Log activity
      await Activity.create({
        user: req.user.id,
        issue: issue._id,
        action: 'unfollowed',
        description: 'Stopped following this issue',
      });

      await NotificationHelper.notifyFollowerUpdate(
        issue,
        req.user,
        'unfollowed',
      );
    } else {
      issue.followers.push(req.user.id);

      // Log activity
      await Activity.create({
        user: req.user.id,
        issue: issue._id,
        action: 'followed',
        description: 'Started following this issue',
      });

      await NotificationHelper.notifyFollowerUpdate(
        issue,
        req.user,
        'followed',
      );
    }

    await issue.save();

    // Populate before returning
    await issue.populate([
      { path: 'reportedBy', select: 'name avatar email' },
      { path: 'category', select: 'name displayName icon color' },
      { path: 'assignedTo', select: 'name avatar' },
      { path: 'comments.user', select: 'name avatar role' },
    ]);

    const issueResponse = issue.toObject();
    issueResponse.stats = {
      upvotes: issue.votes?.upvotes?.length || 0,
      downvotes: issue.votes?.downvotes?.length || 0,
      commentCount: issue.comments?.length || 0,
      views: issue.views || 0,
      followerCount: issue.followers?.length || 0,
    };

    res.json({
      success: true,
      message: isFollowing ? 'Unfollowed issue' : 'Following issue',
      data: issueResponse,
    });
  } catch (error) {
    console.error('Toggle follow error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle follow',
      error: error.message,
    });
  }
};

/**
 * @desc    Assign issue to user
 * @route   PATCH /api/issues/:id/assign
 * @access  Private (Authority/Admin)
 */
const assignIssue = async (req, res) => {
  try {
    // Check authorization
    if (req.user.role !== 'authority' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to assign issues',
      });
    }

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    const { assignedTo } = req.body;

    // Verify assigned user exists
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      return res.status(404).json({
        success: false,
        message: 'Assigned user not found',
      });
    }

    const previousAssignee = issue.assignedTo;
    issue.assignedTo = assignedTo;

    await issue.save();

    await issue.populate([
      { path: 'assignedTo', select: 'name avatar email' },
      { path: 'reportedBy', select: 'name avatar' },
    ]);

    // Log activity
    await Activity.create({
      user: req.user.id,
      issue: issue._id,
      action: 'assigned',
      description: `Assigned to ${assignedUser.name}`,
      metadata: {
        assignedTo: assignedTo,
        assignedFrom: previousAssignee,
      },
    });

    // Send notification
    await NotificationHelper.notifyIssueAssigned(issue, assignedUser, req.user);

    res.json({
      success: true,
      message: 'Issue assigned successfully',
      data: issue,
    });
  } catch (error) {
    console.error('Assign issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign issue',
      error: error.message,
    });
  }
};

/**
 * @desc    Change issue status
 * @route   PATCH /api/issues/:id/status
 * @access  Private (Authority/Admin)
 */
const changeStatus = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id).populate('reportedBy');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    // Check authorization
    const isAuthorized =
      req.user.role === 'authority' ||
      req.user.role === 'admin' ||
      issue.assignedTo?.toString() === req.user.id;

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to change status',
      });
    }

    const oldStatus = issue.status;
    const { status, reason } = req.body;

    const validStatuses = [
      'open',
      'in-progress',
      'resolved',
      'closed',
      'rejected',
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    issue.status = status;

    // Handle rejection
    if (status === 'rejected' && reason) {
      issue.rejectionReason = reason;
    }

    await issue.save();

    await issue.populate([
      { path: 'reportedBy', select: 'name avatar email' },
      { path: 'category', select: 'name displayName icon color' },
      { path: 'assignedTo', select: 'name avatar' },
    ]);

    // Log activity
    await Activity.create({
      user: req.user.id,
      issue: issue._id,
      action: 'status_changed',
      description: `Changed status from ${oldStatus} to ${status}`,
      metadata: {
        oldStatus,
        newStatus: status,
        reason: reason || undefined,
      },
    });

    // Send notifications
    await NotificationHelper.notifyStatusChanged(
      issue,
      req.user,
      oldStatus,
      status,
    );

    if (status === 'resolved') {
      await NotificationHelper.notifyIssueResolved(issue, req.user);
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: issue,
    });
  } catch (error) {
    console.error('Change status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change status',
      error: error.message,
    });
  }
};

/**
 * @desc    Get nearby issues
 * @route   GET /api/issues/nearby
 * @access  Public
 */
const getNearbyIssues = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5000, limit = 20 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const issues = await Issue.find({
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: parseInt(radius),
        },
      },
    })
      .limit(parseInt(limit))
      .populate('reportedBy', 'name avatar')
      .populate('category', 'name displayName icon color')
      .lean();

    res.json({
      success: true,
      data: issues,
      count: issues.length,
    });
  } catch (error) {
    console.error('Get nearby issues error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby issues',
      error: error.message,
    });
  }
};

/**
 * @desc    Get issue statistics
 * @route   GET /api/issues/stats
 * @access  Public
 */
const getIssueStats = async (req, res) => {
  try {
    const [overall, byStatus, byPriority, byCategory] = await Promise.all([
      Issue.aggregate([
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
          },
        },
      ]),
      Issue.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Issue.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Issue.aggregate([
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'categoryInfo',
          },
        },
        { $unwind: '$categoryInfo' },
        {
          $group: {
            _id: '$category',
            name: { $first: '$categoryInfo.displayName' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const byStatusMap = {};
    byStatus.forEach((item) => {
      byStatusMap[item._id] = item.count;
    });

    const byPriorityMap = {};
    byPriority.forEach((item) => {
      byPriorityMap[item._id] = item.count;
    });

    res.json({
      success: true,
      data: {
        overall: overall[0] || {
          total: 0,
          open: 0,
          inProgress: 0,
          resolved: 0,
          closed: 0,
        },
        byStatus: byStatusMap,
        byPriority: byPriorityMap,
        byCategory,
      },
    });
  } catch (error) {
    console.error('Get issue stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching statistics',
      error: error.message,
    });
  }
};

module.exports = {
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
};
