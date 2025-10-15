// middleware/resourceAccess.js

const Issue = require('../models/Issue');
const Interaction = require('../models/Interaction');

// Check issue access
const checkIssueAccess = (action) => async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    req.issue = issue;

    // Admin can do everything
    if (req.user.role === 'admin') {
      return next();
    }

    const isOwner = issue.reportedBy.toString() === req.user._id.toString();
    const isAssigned = issue.assignedTo?.toString() === req.user._id.toString();

    switch (action) {
      case 'view':
        if (issue.isPublic || isOwner || isAssigned) return next();
        break;

      case 'update':
        if ((isOwner && issue.status === 'open') || isAssigned) return next();
        break;

      case 'delete':
        if (isOwner && issue.status === 'open') return next();
        break;

      case 'assign':
        // Only admin
        return res.status(403).json({
          success: false,
          message: 'Only admin can assign issues',
        });

      case 'status':
        if (isAssigned || (isOwner && issue.status === 'resolved'))
          return next();
        break;

      case 'comment':
        if (issue.isPublic || isOwner || isAssigned) return next();
        break;

      default:
        return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied',
    });
  } catch (error) {
    next(error);
  }
};

// Simplified helpers
const canView = checkIssueAccess('view');
const canUpdate = checkIssueAccess('update');
const canDelete = checkIssueAccess('delete');
const canAssign = checkIssueAccess('assign');
const canChangeStatus = checkIssueAccess('status');
const canComment = checkIssueAccess('comment');

module.exports = {
  canView,
  canUpdate,
  canDelete,
  canAssign,
  canChangeStatus,
  canComment,
};
