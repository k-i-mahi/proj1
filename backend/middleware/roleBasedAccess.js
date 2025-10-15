const Issue = require('../models/Issue');
const Category = require('../models/Category');

/**
 * Check if user can view issue
 * - Public issues: Everyone
 * - Private issues: Reporter, Assigned authority, Admin
 */
const canViewIssue = async (req, res, next) => {
  try {
    const issueId = req.params.id;
    const user = req.user;

    const issue = await Issue.findById(issueId);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    // Store issue in request for later use
    req.issue = issue;

    // Public issues can be viewed by everyone
    if (issue.isPublic) {
      return next();
    }

    // If not authenticated, can't view private issues
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to view private issues',
      });
    }

    // Admin can view everything
    if (user.role === 'admin') {
      return next();
    }

    // Reporter can view their own issues
    if (issue.reportedBy.toString() === user._id.toString()) {
      return next();
    }

    // Assigned authority can view
    if (
      issue.assignedTo &&
      issue.assignedTo.toString() === user._id.toString()
    ) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this issue',
    });
  } catch (error) {
    console.error('canViewIssue error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * Check if user can create issue
 * - All authenticated users can create issues
 * - Can be restricted by role if needed
 */
const canCreateIssue = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  // All authenticated active users can create issues
  if (user.isActive) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Account is inactive',
  });
};

/**
 * Check if user can update issue
 * - Reporter can update if status is 'open'
 * - Assigned authority can update
 * - Admin can update everything
 */
const canUpdateIssue = async (req, res, next) => {
  try {
    const issueId = req.params.id;
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const issue = await Issue.findById(issueId);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    req.issue = issue;

    // Admin can update everything
    if (user.role === 'admin') {
      return next();
    }

    // Reporter can update their own open issues
    if (issue.reportedBy.toString() === user._id.toString()) {
      if (issue.status === 'open') {
        return next();
      }
      return res.status(403).json({
        success: false,
        message: 'Can only update issues in open status',
      });
    }

    // Assigned authority can update
    if (user.role === 'authority' && issue.assignedTo) {
      if (issue.assignedTo.toString() === user._id.toString()) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this issue',
    });
  } catch (error) {
    console.error('canUpdateIssue error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * Check if user can delete issue
 * - Admin can delete everything
 * - Reporter can delete their own open issues
 */
const canDeleteIssue = async (req, res, next) => {
  try {
    const issueId = req.params.id;
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const issue = await Issue.findById(issueId);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    req.issue = issue;

    // Admin can delete everything
    if (user.role === 'admin') {
      return next();
    }

    // Reporter can delete their own open issues
    if (
      issue.reportedBy.toString() === user._id.toString() &&
      issue.status === 'open'
    ) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this issue',
    });
  } catch (error) {
    console.error('canDeleteIssue error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * Check if user can assign issue
 * - Admin can assign to anyone
 * - Authority cannot self-assign (must be assigned by admin)
 */
const canAssignIssue = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Only admin can assign issues
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can assign issues',
      });
    }

    next();
  } catch (error) {
    console.error('canAssignIssue error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * Check if user can change status
 * - Admin can change any status
 * - Authority can change status of assigned issues
 * - Resident can reopen their own resolved issues
 */
const canChangeStatus = async (req, res, next) => {
  try {
    const issueId = req.params.id;
    const user = req.user;
    const newStatus = req.body.status;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const issue = await Issue.findById(issueId);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    req.issue = issue;

    // Admin can change any status
    if (user.role === 'admin') {
      return next();
    }

    // Authority can change status of assigned issues
    if (user.role === 'authority') {
      if (
        issue.assignedTo &&
        issue.assignedTo.toString() === user._id.toString()
      ) {
        // Authority cannot reject or close issues (only admin can)
        if (['rejected', 'closed'].includes(newStatus)) {
          return res.status(403).json({
            success: false,
            message: 'Only administrators can reject or close issues',
          });
        }
        return next();
      }
      return res.status(403).json({
        success: false,
        message: 'Can only change status of assigned issues',
      });
    }

    // Resident can reopen their own resolved issues
    if (user.role === 'resident') {
      if (issue.reportedBy.toString() === user._id.toString()) {
        if (issue.status === 'resolved' && newStatus === 'open') {
          return next();
        }
        return res.status(403).json({
          success: false,
          message: 'Can only reopen resolved issues',
        });
      }
    }

    return res.status(403).json({
      success: false,
      message: 'Not authorized to change issue status',
    });
  } catch (error) {
    console.error('canChangeStatus error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * Check if user can comment
 * - Everyone can comment on public issues
 * - Reporter, assigned authority, and admin can comment on private issues
 */
const canComment = async (req, res, next) => {
  try {
    const issueId = req.params.issueId; // Fixed: was req.params.id
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to comment',
      });
    }

    const issue = await Issue.findById(issueId);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    req.issue = issue;

    // Public issues - everyone can comment
    if (issue.isPublic) {
      return next();
    }

    // Admin can comment on everything
    if (user.role === 'admin') {
      return next();
    }

    // Reporter can comment on their own issues
    if (issue.reportedBy.toString() === user._id.toString()) {
      return next();
    }

    // Assigned authority can comment
    if (
      issue.assignedTo &&
      issue.assignedTo.toString() === user._id.toString()
    ) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Not authorized to comment on this issue',
    });
  } catch (error) {
    console.error('canComment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * Check if user can delete comment
 * - Admin can delete any comment
 * - User can delete their own comments
 */
const canDeleteComment = async (req, res, next) => {
  try {
    const { issueId, commentId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const issue = await Issue.findById(issueId);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    const comment = issue.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    req.comment = comment;

    // Admin can delete any comment
    if (user.role === 'admin') {
      return next();
    }

    // User can delete their own comments
    if (comment.user.toString() === user._id.toString()) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this comment',
    });
  } catch (error) {
    console.error('canDeleteComment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * Check if user can vote
 * - All authenticated users can vote
 * - Cannot vote on own issues
 */
const canVote = async (req, res, next) => {
  try {
    const issueId = req.params.issueId; // Fixed: was req.params.id
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to vote',
      });
    }

    const issue = await Issue.findById(issueId);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    req.issue = issue;

    // Users cannot vote on their own issues
    if (issue.reportedBy.toString() === user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Cannot vote on your own issues',
      });
    }

    next();
  } catch (error) {
    console.error('canVote error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * Check if user can manage categories
 * - Only admin can manage categories
 */
const canManageCategories = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Only administrators can manage categories',
    });
  }

  next();
};

/**
 * Check if user can manage users
 * - Only admin can manage users
 */
const canManageUsers = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Only administrators can manage users',
    });
  }

  next();
};

/**
 * Check if user can view analytics
 * - Admin and authority can view analytics
 * - Residents can view limited analytics
 */
const canViewAnalytics = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  // Admin and authority can view full analytics
  if (['admin', 'authority'].includes(user.role)) {
    req.fullAnalytics = true;
    return next();
  }

  // Residents can view limited analytics
  if (user.role === 'resident') {
    req.fullAnalytics = false;
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Not authorized to view analytics',
  });
};

/**
 * Check if user can upload media
 * - All authenticated users can upload media to their issues
 * - Size limits based on role
 */
const canUploadMedia = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Set upload limits based on role
    const limits = {
      admin: 20 * 1024 * 1024, // 20MB
      authority: 15 * 1024 * 1024, // 15MB
      resident: 10 * 1024 * 1024, // 10MB
    };

    req.uploadLimit = limits[user.role] || limits.resident;

    next();
  } catch (error) {
    console.error('canUploadMedia error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * Rate limit by role
 * Different limits for different roles
 */
const rateLimitByRole = () => {
  const limits = {
    admin: { max: 1000, window: 15 * 60 * 1000 }, // 1000 per 15 min
    authority: { max: 500, window: 15 * 60 * 1000 }, // 500 per 15 min
    resident: { max: 100, window: 15 * 60 * 1000 }, // 100 per 15 min
  };

  const requests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user._id.toString();
    const userRole = req.user.role;
    const limit = limits[userRole] || limits.resident;
    const now = Date.now();

    if (!requests.has(userId)) {
      requests.set(userId, []);
    }

    const userRequests = requests.get(userId);
    const recentRequests = userRequests.filter(
      (timestamp) => now - timestamp < limit.window,
    );

    if (recentRequests.length >= limit.max) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((recentRequests[0] + limit.window - now) / 1000),
      });
    }

    recentRequests.push(now);
    requests.set(userId, recentRequests);

    // Cleanup
    if (Math.random() < 0.01) {
      for (const [key, timestamps] of requests.entries()) {
        const recent = timestamps.filter((t) => now - t < limit.window);
        if (recent.length === 0) {
          requests.delete(key);
        } else {
          requests.set(key, recent);
        }
      }
    }

    next();
  };
};

module.exports = {
  canViewIssue,
  canCreateIssue,
  canUpdateIssue,
  canDeleteIssue,
  canAssignIssue,
  canChangeStatus,
  canComment,
  canDeleteComment,
  canVote,
  canManageCategories,
  canManageUsers,
  canViewAnalytics,
  canUploadMedia,
  rateLimitByRole,
};
