const mongoose = require('mongoose');
const Issue = require('../models/Issue');
const User = require('../models/User');

/**
 * @desc    Get comments for an issue
 * @route   GET /api/interactions/issues/:issueId/comments
 * @access  Public
 */
const getComments = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { page = 1, limit = 20, sortBy = '-createdAt' } = req.query;

    const issue = await Issue.findById(issueId)
      .select('comments')
      .populate('comments.user', 'name avatar role');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    let comments = issue.comments || [];

    // Sort comments
    if (sortBy === 'createdAt') {
      comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else {
      comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedComments = comments.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: paginatedComments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: comments.length,
        totalPages: Math.ceil(comments.length / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
      error: error.message,
    });
  }
};

/**
 * @desc    Add comment to an issue
 * @route   POST /api/interactions/issues/:issueId/comments
 * @access  Private
 */
const addComment = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { commentText, isInternal } = req.body;

    if (!commentText || !commentText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required',
      });
    }

    const issue = await Issue.findById(issueId);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    const comment = {
      user: req.user.id,
      commentText: commentText.trim(),
      isInternal: isInternal || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    issue.comments.push(comment);
    await issue.save();

    // Populate the newly added comment
    await issue.populate('comments.user', 'name avatar role');

    const addedComment = issue.comments[issue.comments.length - 1];

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: addedComment,
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
 * @desc    Update a comment
 * @route   PATCH /api/interactions/issues/:issueId/comments/:commentId
 * @access  Private
 */
const updateComment = async (req, res) => {
  try {
    const { issueId, commentId } = req.params;
    const { commentText } = req.body;

    if (!commentText || !commentText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required',
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

    // Check authorization
    if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this comment',
      });
    }

    comment.commentText = commentText.trim();
    comment.updatedAt = new Date();

    await issue.save();

    res.status(200).json({
      success: true,
      message: 'Comment updated successfully',
      data: comment,
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update comment',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete a comment
 * @route   DELETE /api/interactions/issues/:issueId/comments/:commentId
 * @access  Private
 */
const deleteComment = async (req, res) => {
  try {
    const { issueId, commentId } = req.params;

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

    // Check authorization
    if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment',
      });
    }

    comment.remove();
    await issue.save();

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment',
      error: error.message,
    });
  }
};

/**
 * @desc    Get comment count for an issue
 * @route   GET /api/interactions/issues/:issueId/comments/count
 * @access  Public
 */
const getCommentCount = async (req, res) => {
  try {
    const { issueId } = req.params;

    const issue = await Issue.findById(issueId).select('comments');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        count: issue.comments.length,
      },
    });
  } catch (error) {
    console.error('Get comment count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get comment count',
      error: error.message,
    });
  }
};

/**
 * @desc    Vote on an issue (upvote/downvote)
 * @route   POST /api/interactions/issues/:issueId/vote
 * @access  Private
 */
const voteOnIssue = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { voteType } = req.body; // 'upvote' or 'downvote'

    if (!['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote type. Must be "upvote" or "downvote"',
      });
    }

    const issue = await Issue.findById(issueId);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    const userId = req.user.id;

    // Remove user from both arrays first
    issue.votes.upvotes = issue.votes.upvotes.filter(
      (id) => id.toString() !== userId,
    );
    issue.votes.downvotes = issue.votes.downvotes.filter(
      (id) => id.toString() !== userId,
    );

    // Add to appropriate array
    if (voteType === 'upvote') {
      issue.votes.upvotes.push(userId);
    } else {
      issue.votes.downvotes.push(userId);
    }

    await issue.save();

    res.status(200).json({
      success: true,
      message: `${voteType} recorded successfully`,
      data: {
        upvotes: issue.votes.upvotes.length,
        downvotes: issue.votes.downvotes.length,
      },
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
 * @desc    Remove vote from an issue
 * @route   DELETE /api/interactions/issues/:issueId/vote
 * @access  Private
 */
const removeVote = async (req, res) => {
  try {
    const { issueId } = req.params;

    const issue = await Issue.findById(issueId);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    const userId = req.user.id;

    // Remove user from both vote arrays
    issue.votes.upvotes = issue.votes.upvotes.filter(
      (id) => id.toString() !== userId,
    );
    issue.votes.downvotes = issue.votes.downvotes.filter(
      (id) => id.toString() !== userId,
    );

    await issue.save();

    res.status(200).json({
      success: true,
      message: 'Vote removed successfully',
      data: {
        upvotes: issue.votes.upvotes.length,
        downvotes: issue.votes.downvotes.length,
      },
    });
  } catch (error) {
    console.error('Remove vote error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove vote',
      error: error.message,
    });
  }
};

/**
 * @desc    Get vote status for current user
 * @route   GET /api/interactions/issues/:issueId/vote/status
 * @access  Private
 */
const getVoteStatus = async (req, res) => {
  try {
    const { issueId } = req.params;

    const issue = await Issue.findById(issueId).select('votes');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    const userId = req.user.id;

    const hasUpvoted = issue.votes.upvotes.some(
      (id) => id.toString() === userId,
    );
    const hasDownvoted = issue.votes.downvotes.some(
      (id) => id.toString() === userId,
    );

    res.status(200).json({
      success: true,
      data: {
        hasUpvoted,
        hasDownvoted,
        upvotes: issue.votes.upvotes.length,
        downvotes: issue.votes.downvotes.length,
      },
    });
  } catch (error) {
    console.error('Get vote status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get vote status',
      error: error.message,
    });
  }
};

/**
 * @desc    Toggle follow/unfollow an issue
 * @route   POST /api/interactions/issues/:issueId/follow
 * @access  Private
 */
const toggleFollow = async (req, res) => {
  try {
    const { issueId } = req.params;

    const issue = await Issue.findById(issueId);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    const userId = req.user.id;
    const isFollowing = issue.followers.some((id) => id.toString() === userId);

    if (isFollowing) {
      // Unfollow
      issue.followers = issue.followers.filter(
        (id) => id.toString() !== userId,
      );
    } else {
      // Follow
      issue.followers.push(userId);
    }

    await issue.save();

    res.status(200).json({
      success: true,
      message: isFollowing
        ? 'Unfollowed issue successfully'
        : 'Following issue successfully',
      data: {
        isFollowing: !isFollowing,
        followerCount: issue.followers.length,
      },
    });
  } catch (error) {
    console.error('Toggle follow error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle follow status',
      error: error.message,
    });
  }
};

/**
 * @desc    Get follow status for current user
 * @route   GET /api/interactions/issues/:issueId/follow/status
 * @access  Private
 */
const getFollowStatus = async (req, res) => {
  try {
    const { issueId } = req.params;

    const issue = await Issue.findById(issueId).select('followers');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    const userId = req.user.id;
    const isFollowing = issue.followers.some((id) => id.toString() === userId);

    res.status(200).json({
      success: true,
      data: {
        isFollowing,
        followerCount: issue.followers.length,
      },
    });
  } catch (error) {
    console.error('Get follow status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get follow status',
      error: error.message,
    });
  }
};

/**
 * @desc    Mark mention as read
 * @route   PATCH /api/interactions/mentions/:mentionId/read
 * @access  Private
 */
const markMentionAsRead = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Mark mention as read functionality to be implemented',
    });
  } catch (error) {
    console.error('Mark mention as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark mention as read',
      error: error.message,
    });
  }
};

module.exports = {
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
};
