import api from './api';
import { API_ENDPOINTS } from '../config/api.config';

const interactionService = {
  // ============================================
  // COMMENTS
  // ============================================

  /**
   * Get comments for an issue
   * @param {string} issueId - Issue ID
   * @param {Object} params - Query parameters (page, limit, sortBy)
   * @returns {Promise}
   */
  getComments: async (issueId, params = {}) => {
    try {
      const response = await api.get(
        API_ENDPOINTS.INTERACTIONS.COMMENTS(issueId),
        { params },
      );
      return response.data;
    } catch (error) {
      console.error('Get comments error:', error);
      throw error;
    }
  },

  /**
   * Add comment to an issue
   * @param {string} issueId - Issue ID
   * @param {string} commentText - Comment text
   * @param {boolean} isInternal - Is internal comment
   * @returns {Promise}
   */
  addComment: async (issueId, commentText, isInternal = false) => {
    try {
      const response = await api.post(
        API_ENDPOINTS.INTERACTIONS.COMMENTS(issueId),
        {
          commentText,
          isInternal,
        },
      );
      return response.data;
    } catch (error) {
      console.error('Add comment error:', error);
      throw error;
    }
  },

  /**
   * Update a comment
   * @param {string} issueId - Issue ID
   * @param {string} commentId - Comment ID
   * @param {string} commentText - Updated comment text
   * @returns {Promise}
   */
  updateComment: async (issueId, commentId, commentText) => {
    try {
      const response = await api.put(
        API_ENDPOINTS.INTERACTIONS.COMMENT_DETAIL(issueId, commentId),
        { commentText },
      );
      return response.data;
    } catch (error) {
      console.error('Update comment error:', error);
      throw error;
    }
  },

  /**
   * Delete a comment
   * @param {string} issueId - Issue ID
   * @param {string} commentId - Comment ID
   * @returns {Promise}
   */
  deleteComment: async (issueId, commentId) => {
    try {
      const response = await api.delete(
        API_ENDPOINTS.INTERACTIONS.COMMENT_DETAIL(issueId, commentId),
      );
      return response.data;
    } catch (error) {
      console.error('Delete comment error:', error);
      throw error;
    }
  },

  /**
   * Get comment count for an issue
   * @param {string} issueId - Issue ID
   * @returns {Promise}
   */
  getCommentCount: async (issueId) => {
    try {
      const response = await api.get(
        API_ENDPOINTS.INTERACTIONS.COMMENT_COUNT(issueId),
      );
      return response.data;
    } catch (error) {
      console.error('Get comment count error:', error);
      throw error;
    }
  },

  // ============================================
  // VOTING
  // ============================================

  /**
   * Vote on an issue
   * @param {string} issueId - Issue ID
   * @param {string} voteType - 'upvote' or 'downvote'
   * @returns {Promise}
   */
  voteOnIssue: async (issueId, voteType) => {
    try {
      const response = await api.post(
        API_ENDPOINTS.INTERACTIONS.VOTE(issueId),
        { voteType },
      );
      return response.data;
    } catch (error) {
      console.error('Vote on issue error:', error);
      throw error;
    }
  },

  /**
   * Remove vote from an issue
   * @param {string} issueId - Issue ID
   * @returns {Promise}
   */
  removeVote: async (issueId) => {
    try {
      const response = await api.delete(
        API_ENDPOINTS.INTERACTIONS.VOTE(issueId),
      );
      return response.data;
    } catch (error) {
      console.error('Remove vote error:', error);
      throw error;
    }
  },

  /**
   * Get user's vote status on an issue
   * @param {string} issueId - Issue ID
   * @returns {Promise}
   */
  getVoteStatus: async (issueId) => {
    try {
      const response = await api.get(
        API_ENDPOINTS.INTERACTIONS.VOTE_STATUS(issueId),
      );
      return response.data;
    } catch (error) {
      console.error('Get vote status error:', error);
      throw error;
    }
  },

  /**
   * Upvote an issue
   * @param {string} issueId - Issue ID
   * @returns {Promise}
   */
  upvote: async (issueId) => {
    return interactionService.voteOnIssue(issueId, 'upvote');
  },

  /**
   * Downvote an issue
   * @param {string} issueId - Issue ID
   * @returns {Promise}
   */
  downvote: async (issueId) => {
    return interactionService.voteOnIssue(issueId, 'downvote');
  },

  // ============================================
  // FOLLOWING
  // ============================================

  /**
   * Toggle follow status on an issue
   * @param {string} issueId - Issue ID
   * @returns {Promise}
   */
  toggleFollow: async (issueId) => {
    try {
      const response = await api.post(
        API_ENDPOINTS.INTERACTIONS.FOLLOW(issueId),
      );
      return response.data;
    } catch (error) {
      console.error('Toggle follow error:', error);
      throw error;
    }
  },

  /**
   * Follow an issue
   * @param {string} issueId - Issue ID
   * @returns {Promise}
   */
  followIssue: async (issueId) => {
    return interactionService.toggleFollow(issueId);
  },

  /**
   * Unfollow an issue
   * @param {string} issueId - Issue ID
   * @returns {Promise}
   */
  unfollowIssue: async (issueId) => {
    return interactionService.toggleFollow(issueId);
  },

  /**
   * Get user's follow status on an issue
   * @param {string} issueId - Issue ID
   * @returns {Promise}
   */
  getFollowStatus: async (issueId) => {
    try {
      const response = await api.get(
        API_ENDPOINTS.INTERACTIONS.FOLLOW_STATUS(issueId),
      );
      return response.data;
    } catch (error) {
      console.error('Get follow status error:', error);
      throw error;
    }
  },

  /**
   * Get user's followed issues
   * @param {Object} params - Query parameters (page, limit, status)
   * @returns {Promise}
   */
  getFollowedIssues: async (params = {}) => {
    try {
      const response = await api.get(
        API_ENDPOINTS.INTERACTIONS.FOLLOWED_ISSUES,
        { params },
      );
      return response.data;
    } catch (error) {
      console.error('Get followed issues error:', error);
      throw error;
    }
  },

  /**
   * Get follower count for an issue
   * @param {string} issueId - Issue ID
   * @returns {Promise}
   */
  getFollowerCount: async (issueId) => {
    try {
      const response = await api.get(
        API_ENDPOINTS.INTERACTIONS.FOLLOWER_COUNT(issueId),
      );
      return response.data;
    } catch (error) {
      console.error('Get follower count error:', error);
      throw error;
    }
  },

  /**
   * Get followers list for an issue
   * @param {string} issueId - Issue ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getFollowers: async (issueId, params = {}) => {
    try {
      const response = await api.get(
        API_ENDPOINTS.INTERACTIONS.FOLLOWERS(issueId),
        { params },
      );
      return response.data;
    } catch (error) {
      console.error('Get followers error:', error);
      throw error;
    }
  },

  // ============================================
  // INTERACTIONS SUMMARY
  // ============================================

  /**
   * Get all interactions for an issue
   * @param {string} issueId - Issue ID
   * @returns {Promise}
   */
  getIssueInteractions: async (issueId) => {
    try {
      const response = await api.get(
        API_ENDPOINTS.INTERACTIONS.ISSUE_INTERACTIONS(issueId),
      );
      return response.data;
    } catch (error) {
      console.error('Get issue interactions error:', error);
      throw error;
    }
  },

  /**
   * Get user interaction statistics
   * @param {string} userId - User ID
   * @returns {Promise}
   */
  getUserInteractionStats: async (userId) => {
    try {
      const response = await api.get(
        API_ENDPOINTS.INTERACTIONS.USER_STATS(userId),
      );
      return response.data;
    } catch (error) {
      console.error('Get user interaction stats error:', error);
      throw error;
    }
  },

  /**
   * Get current user's interaction statistics
   * @returns {Promise}
   */
  getMyInteractionStats: async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) {
        throw new Error('User not authenticated');
      }
      return await interactionService.getUserInteractionStats(user._id);
    } catch (error) {
      console.error('Get my interaction stats error:', error);
      throw error;
    }
  },

  // ============================================
  // LIKES/REACTIONS
  // ============================================

  /**
   * Like a comment
   * @param {string} commentId - Comment ID
   * @returns {Promise}
   */
  likeComment: async (commentId) => {
    try {
      const response = await api.post(
        API_ENDPOINTS.INTERACTIONS.LIKE_COMMENT(commentId),
      );
      return response.data;
    } catch (error) {
      console.error('Like comment error:', error);
      throw error;
    }
  },

  /**
   * Unlike a comment
   * @param {string} commentId - Comment ID
   * @returns {Promise}
   */
  unlikeComment: async (commentId) => {
    try {
      const response = await api.delete(
        API_ENDPOINTS.INTERACTIONS.LIKE_COMMENT(commentId),
      );
      return response.data;
    } catch (error) {
      console.error('Unlike comment error:', error);
      throw error;
    }
  },

  // ============================================
  // MENTIONS
  // ============================================

  /**
   * Get mentions for current user
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getMentions: async (params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.INTERACTIONS.MENTIONS, {
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Get mentions error:', error);
      throw error;
    }
  },

  /**
   * Mark mention as read
   * @param {string} mentionId - Mention ID
   * @returns {Promise}
   */
  markMentionAsRead: async (mentionId) => {
    try {
      const response = await api.patch(
        API_ENDPOINTS.INTERACTIONS.MARK_MENTION_READ(mentionId),
      );
      return response.data;
    } catch (error) {
      console.error('Mark mention as read error:', error);
      throw error;
    }
  },

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  /**
   * Check if user has voted
   * @param {Object} voteStatus - Vote status object
   * @returns {boolean}
   */
  hasVoted: (voteStatus) => {
    return voteStatus?.voted || false;
  },

  /**
   * Get vote type
   * @param {Object} voteStatus - Vote status object
   * @returns {string|null}
   */
  getVoteType: (voteStatus) => {
    return voteStatus?.voteType || null;
  },

  /**
   * Check if user has upvoted
   * @param {Object} voteStatus - Vote status object
   * @returns {boolean}
   */
  hasUpvoted: (voteStatus) => {
    return voteStatus?.voteType === 'upvote';
  },

  /**
   * Check if user has downvoted
   * @param {Object} voteStatus - Vote status object
   * @returns {boolean}
   */
  hasDownvoted: (voteStatus) => {
    return voteStatus?.voteType === 'downvote';
  },

  /**
   * Check if user is following
   * @param {Object} followStatus - Follow status object
   * @returns {boolean}
   */
  isFollowing: (followStatus) => {
    return followStatus?.isFollowing || false;
  },

  /**
   * Format comment for display
   * @param {Object} comment - Comment object
   * @returns {Object}
   */
  formatComment: (comment) => {
    return {
      id: comment._id,
      text: comment.commentText,
      user: comment.user,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      isInternal: comment.isInternal || false,
      isEdited: comment.updatedAt && comment.createdAt !== comment.updatedAt,
      timeAgo: interactionService.getTimeAgo(comment.createdAt),
      canEdit: comment.canEdit || false,
      canDelete: comment.canDelete || false,
    };
  },

  /**
   * Get time ago from date
   * @param {Date|string} date - Date
   * @returns {string}
   */
  getTimeAgo: (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
    return `${Math.floor(seconds / 31536000)}y ago`;
  },

  /**
   * Get full date string
   * @param {Date|string} date - Date
   * @returns {string}
   */
  getFullDate: (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  /**
   * Validate comment text
   * @param {string} text - Comment text
   * @returns {Object}
   */
  validateComment: (text) => {
    const errors = {};

    if (!text || text.trim() === '') {
      errors.text = 'Comment cannot be empty';
    } else if (text.trim().length < 1) {
      errors.text = 'Comment is too short';
    } else if (text.length > 1000) {
      errors.text = 'Comment is too long (max 1000 characters)';
    }

    // Check for spam patterns
    if (text && /(.)\1{10,}/.test(text)) {
      errors.text = 'Comment appears to be spam';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  /**
   * Count total interactions
   * @param {Object} interactions - Interactions object
   * @returns {number}
   */
  getTotalInteractions: (interactions) => {
    if (!interactions) return 0;

    const upvotes = interactions.votes?.upvotes || 0;
    const downvotes = interactions.votes?.downvotes || 0;
    const comments = interactions.commentCount || 0;
    const followers = interactions.followers || 0;

    return upvotes + downvotes + comments + followers;
  },

  /**
   * Get interaction score (upvotes - downvotes)
   * @param {Object} interactions - Interactions object
   * @returns {number}
   */
  getInteractionScore: (interactions) => {
    if (!interactions?.votes) return 0;
    const upvotes = interactions.votes.upvotes || 0;
    const downvotes = interactions.votes.downvotes || 0;
    return upvotes - downvotes;
  },

  /**
   * Get vote percentage
   * @param {Object} interactions - Interactions object
   * @returns {number}
   */
  getVotePercentage: (interactions) => {
    if (!interactions?.votes) return 0;
    const upvotes = interactions.votes.upvotes || 0;
    const downvotes = interactions.votes.downvotes || 0;
    const total = upvotes + downvotes;

    if (total === 0) return 0;
    return Math.round((upvotes / total) * 100);
  },

  /**
   * Format interaction stats
   * @param {Object} interactions - Interactions object
   * @returns {Object}
   */
  formatInteractionStats: (interactions) => {
    return {
      upvotes: interactions?.votes?.upvotes || 0,
      downvotes: interactions?.votes?.downvotes || 0,
      score: interactionService.getInteractionScore(interactions),
      percentage: interactionService.getVotePercentage(interactions),
      comments: interactions?.commentCount || 0,
      followers: interactions?.followers || 0,
      total: interactionService.getTotalInteractions(interactions),
    };
  },

  /**
   * Check if comment is editable
   * @param {Object} comment - Comment object
   * @param {Object} currentUser - Current user object
   * @returns {boolean}
   */
  canEditComment: (comment, currentUser) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (comment.user?._id === currentUser._id) {
      // Allow editing within 15 minutes
      const fifteenMinutes = 15 * 60 * 1000;
      const commentAge = Date.now() - new Date(comment.createdAt).getTime();
      return commentAge < fifteenMinutes;
    }
    return false;
  },

  /**
   * Check if comment is deletable
   * @param {Object} comment - Comment object
   * @param {Object} currentUser - Current user object
   * @returns {boolean}
   */
  canDeleteComment: (comment, currentUser) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return comment.user?._id === currentUser._id;
  },

  /**
   * Get interaction icon
   * @param {string} type - Interaction type
   * @returns {string}
   */
  getInteractionIcon: (type) => {
    const icons = {
      upvote: '👍',
      downvote: '👎',
      comment: '💬',
      follow: '⭐',
      like: '❤️',
    };
    return icons[type] || '📝';
  },

  /**
   * Sort comments
   * @param {Array} comments - Array of comments
   * @param {string} sortBy - Sort option ('newest', 'oldest', 'likes')
   * @returns {Array}
   */
  sortComments: (comments, sortBy = 'newest') => {
    const sorted = [...comments];

    switch (sortBy) {
      case 'newest':
        return sorted.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
      case 'oldest':
        return sorted.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        );
      case 'likes':
        return sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      default:
        return sorted;
    }
  },

  // ============================================
  // BATCH OPERATIONS
  // ============================================

  /**
   * Batch vote on multiple issues
   * @param {Array} issueIds - Array of issue IDs
   * @param {string} voteType - 'upvote' or 'downvote'
   * @returns {Promise}
   */
  batchVote: async (issueIds, voteType) => {
    try {
      const promises = issueIds.map((id) =>
        interactionService.voteOnIssue(id, voteType).catch((err) => ({
          id,
          error: err.message,
        })),
      );
      const results = await Promise.allSettled(promises);

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      return {
        success: true,
        succeeded,
        failed,
        total: issueIds.length,
        results,
      };
    } catch (error) {
      console.error('Batch vote error:', error);
      throw error;
    }
  },

  /**
   * Batch follow multiple issues
   * @param {Array} issueIds - Array of issue IDs
   * @returns {Promise}
   */
  batchFollow: async (issueIds) => {
    try {
      const promises = issueIds.map((id) =>
        interactionService.followIssue(id).catch((err) => ({
          id,
          error: err.message,
        })),
      );
      const results = await Promise.allSettled(promises);

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      return {
        success: true,
        succeeded,
        failed,
        total: issueIds.length,
        results,
      };
    } catch (error) {
      console.error('Batch follow error:', error);
      throw error;
    }
  },

  /**
   * Batch delete comments
   * @param {string} issueId - Issue ID
   * @param {Array} commentIds - Array of comment IDs
   * @returns {Promise}
   */
  batchDeleteComments: async (issueId, commentIds) => {
    try {
      const promises = commentIds.map((commentId) =>
        interactionService.deleteComment(issueId, commentId).catch((err) => ({
          commentId,
          error: err.message,
        })),
      );
      const results = await Promise.allSettled(promises);

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      return {
        success: true,
        succeeded,
        failed,
        total: commentIds.length,
        results,
      };
    } catch (error) {
      console.error('Batch delete comments error:', error);
      throw error;
    }
  },

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  /**
   * Get cached interaction status
   * @param {string} issueId - Issue ID
   * @returns {Object|null}
   */
  getCachedInteractionStatus: (issueId) => {
    try {
      const cached = sessionStorage.getItem(`interaction_${issueId}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Cache valid for 5 minutes
        if (Date.now() - timestamp < 300000) {
          return data;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Set cached interaction status
   * @param {string} issueId - Issue ID
   * @param {Object} data - Interaction data
   */
  setCachedInteractionStatus: (issueId, data) => {
    try {
      sessionStorage.setItem(
        `interaction_${issueId}`,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        }),
      );
    } catch (error) {
      console.error('Cache interaction status error:', error);
    }
  },

  /**
   * Clear interaction cache
   * @param {string} issueId - Issue ID (optional)
   */
  clearInteractionCache: (issueId = null) => {
    try {
      if (issueId) {
        sessionStorage.removeItem(`interaction_${issueId}`);
      } else {
        // Clear all interaction caches
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith('interaction_')) {
            sessionStorage.removeItem(key);
          }
        });
      }
    } catch (error) {
      console.error('Clear interaction cache error:', error);
    }
  },
};

export default interactionService;
