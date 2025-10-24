import api, { uploadFile } from './api';
import { API_ENDPOINTS } from '../config/api.config';

const issueService = {
  // ============================================
  // ISSUE CRUD OPERATIONS
  // ============================================

  /**
   * Get all issues with filters and pagination
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getIssues: async (params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.ISSUES.LIST, { params });
      // Backend returns { success, data: [...], pagination }
      return {
        data: response.data.data || response.data,
        pagination: response.data.pagination
      };
    } catch (error) {
      console.error('Get issues error:', error);
      throw error;
    }
  },

  /**
   * Get single issue by ID
   * @param {string} id - Issue ID
   * @returns {Promise}
   */
  getIssueById: async (id) => {
    try {
      const response = await api.get(API_ENDPOINTS.ISSUES.DETAIL(id));
      // Backend returns { success, data: {...} }
      return {
        data: response.data.data || response.data
      };
    } catch (error) {
      console.error('Get issue by ID error:', error);
      throw error;
    }
  },

  /**
   * Create new issue
   * @param {FormData|Object} data - Issue data
   * @param {Function} onProgress - Upload progress callback
   * @returns {Promise}
   */
  createIssue: async (data, onProgress = null) => {
    try {
      if (data instanceof FormData) {
        const response = await uploadFile(
          API_ENDPOINTS.ISSUES.CREATE,
          data,
          onProgress,
        );
        return {
          data: response.data.data || response.data
        };
      }
      const response = await api.post(API_ENDPOINTS.ISSUES.CREATE, data);
      return {
        data: response.data.data || response.data
      };
    } catch (error) {
      console.error('Create issue error:', error);
      throw error;
    }
  },

  /**
   * Update issue
   * @param {string} id - Issue ID
   * @param {FormData|Object} data - Updated data
   * @param {Function} onProgress - Upload progress callback
   * @returns {Promise}
   */
  updateIssue: async (id, data, onProgress = null) => {
    try {
      if (data instanceof FormData) {
        const response = await uploadFile(
          API_ENDPOINTS.ISSUES.UPDATE(id),
          data,
          onProgress,
          'PUT',
        );
        return {
          data: response.data.data || response.data
        };
      }
      const response = await api.put(API_ENDPOINTS.ISSUES.UPDATE(id), data);
      return {
        data: response.data.data || response.data
      };
    } catch (error) {
      console.error('Update issue error:', error);
      throw error;
    }
  },

  /**
   * Delete issue
   * @param {string} id - Issue ID
   * @returns {Promise}
   */
  deleteIssue: async (id) => {
    try {
      const response = await api.delete(API_ENDPOINTS.ISSUES.DELETE(id));
      return {
        data: response.data.data || response.data
      };
    } catch (error) {
      console.error('Delete issue error:', error);
      throw error;
    }
  },

  // ============================================
  // COMMENTS
  // ============================================

  /**
   * Get comments for an issue
   * @param {string} id - Issue ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getComments: async (id, params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.ISSUES.COMMENTS(id), {
        params,
      });
      return {
        data: response.data.data || response.data
      };
    } catch (error) {
      console.error('Get comments error:', error);
      throw error;
    }
  },

  /**
   * Add comment to issue
   * @param {string} id - Issue ID
   * @param {string} commentText - Comment text
   * @param {boolean} isInternal - Is internal comment
   * @returns {Promise}
   */
  addComment: async (id, commentText, isInternal = false) => {
    try {
      const response = await api.post(API_ENDPOINTS.ISSUES.COMMENTS(id), {
        commentText,
        isInternal,
      });
      return {
        data: response.data.data || response.data
      };
    } catch (error) {
      console.error('Add comment error:', error);
      throw error;
    }
  },

  /**
   * Update comment
   * @param {string} issueId - Issue ID
   * @param {string} commentId - Comment ID
   * @param {string} commentText - Updated comment text
   * @returns {Promise}
   */
  updateComment: async (issueId, commentId, commentText) => {
    try {
      const response = await api.put(
        API_ENDPOINTS.ISSUES.COMMENT_DETAIL(issueId, commentId),
        { commentText },
      );
      return response.data;
    } catch (error) {
      console.error('Update comment error:', error);
      throw error;
    }
  },

  /**
   * Delete comment
   * @param {string} issueId - Issue ID
   * @param {string} commentId - Comment ID
   * @returns {Promise}
   */
  deleteComment: async (issueId, commentId) => {
    try {
      const response = await api.delete(
        API_ENDPOINTS.ISSUES.COMMENT_DETAIL(issueId, commentId),
      );
      return response.data;
    } catch (error) {
      console.error('Delete comment error:', error);
      throw error;
    }
  },

  // ============================================
  // VOTING
  // ============================================

  /**
   * Vote on issue
   * @param {string} id - Issue ID
   * @param {string} voteType - 'upvote' or 'downvote'
   * @returns {Promise}
   */
  voteOnIssue: async (id, voteType) => {
    try {
      const response = await api.post(API_ENDPOINTS.ISSUES.VOTE(id), {
        voteType,
      });
      return {
        data: response.data.data 
      };
    } catch (error) {
      console.error('Vote on issue error:', error);
      throw error;
    }
  },

  /**
   * Remove vote from issue
   * @param {string} id - Issue ID
   * @returns {Promise}
   */
  removeVote: async (id) => {
    try {
      const response = await api.delete(API_ENDPOINTS.ISSUES.REMOVE_VOTE(id));
      return response.data;
    } catch (error) {
      console.error('Remove vote error:', error);
      throw error;
    }
  },

  /**
   * Get user's vote status on issue
   * @param {string} id - Issue ID
   * @param {string} userId - User ID
   * @returns {Promise}
   */
  getVoteStatus: async (id, userId) => {
    try {
      // Get issue and check votes arrays
      const response = await api.get(API_ENDPOINTS.ISSUES.DETAIL(id));
      const issue = response.data.data;
      
      if (!issue || !issue.votes || !userId) {
        return { data: { voted: false, voteType: null } };
      }

      // Check if user has voted
      const hasUpvoted = issue.votes.upvotes?.some(
        (voterId) => voterId.toString() === userId.toString()
      );
      const hasDownvoted = issue.votes.downvotes?.some(
        (voterId) => voterId.toString() === userId.toString()
      );

      return { 
        data: { 
          voted: hasUpvoted || hasDownvoted, 
          voteType: hasUpvoted ? 'upvote' : hasDownvoted ? 'downvote' : null 
        } 
      };
    } catch (error) {
      console.error('Get vote status error:', error);
      return { data: { voted: false, voteType: null } };
    }
  },

  /**
   * Upvote issue
   * @param {string} id - Issue ID
   * @returns {Promise}
   */
  upvote: async (id) => {
    return issueService.voteOnIssue(id, 'upvote');
  },

  /**
   * Downvote issue
   * @param {string} id - Issue ID
   * @returns {Promise}
   */
  downvote: async (id) => {
    return issueService.voteOnIssue(id, 'downvote');
  },

  // ============================================
  // FOLLOWING
  // ============================================

  /**
   * Toggle follow issue
   * @param {string} id - Issue ID
   * @returns {Promise}
   */
  toggleFollow: async (id) => {
    try {
      const response = await api.post(API_ENDPOINTS.ISSUES.FOLLOW(id));
      return {
        data: response.data.data || response.data
      };
    } catch (error) {
      console.error('Toggle follow error:', error);
      throw error;
    }
  },

  /**
   * Get follow status
   * @param {string} id - Issue ID
   * @param {string} userId - User ID
   * @returns {Promise}
   */
  getFollowStatus: async (id, userId) => {
    try {
      // Get issue and check followers array
      const response = await api.get(API_ENDPOINTS.ISSUES.DETAIL(id));
      const issue = response.data.data;
      
      if (!issue || !issue.followers || !userId) {
        return { data: { isFollowing: false, followerCount: 0 } };
      }

      const isFollowing = issue.followers.some(
        (followerId) => followerId.toString() === userId.toString()
      );

      return {
        data: {
          isFollowing,
          followerCount: issue.followers.length,
        },
      };
    } catch (error) {
      console.error('Get follow status error:', error);
      return { data: { isFollowing: false, followerCount: 0 } };
    }
  },

  /**
   * Get followed issues
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getFollowedIssues: async (params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.ISSUES.FOLLOWED, { params });
      return response.data;
    } catch (error) {
      console.error('Get followed issues error:', error);
      throw error;
    }
  },

  // ============================================
  // ISSUE MANAGEMENT (Authority/Admin)
  // ============================================

  /**
   * Assign issue to user
   * @param {string} id - Issue ID
   * @param {string} assignedTo - User ID to assign to
   * @returns {Promise}
   */
  assignIssue: async (id, assignedTo) => {
    try {
      const response = await api.patch(API_ENDPOINTS.ISSUES.ASSIGN(id), {
        assignedTo,
      });
      return response.data;
    } catch (error) {
      console.error('Assign issue error:', error);
      throw error;
    }
  },

  /**
   * Unassign issue
   * @param {string} id - Issue ID
   * @returns {Promise}
   */
  unassignIssue: async (id) => {
    try {
      const response = await api.patch(API_ENDPOINTS.ISSUES.ASSIGN(id), {
        assignedTo: null,
      });
      return response.data;
    } catch (error) {
      console.error('Unassign issue error:', error);
      throw error;
    }
  },

  /**
   * Change issue status
   * @param {string} id - Issue ID
   * @param {string} status - New status
   * @param {string} reason - Reason for change
   * @returns {Promise}
   */
  changeStatus: async (id, status, reason = '') => {
    try {
      const response = await api.patch(API_ENDPOINTS.ISSUES.STATUS(id), {
        status,
        reason,
      });
      return response.data;
    } catch (error) {
      console.error('Change status error:', error);
      throw error;
    }
  },

  /**
   * Change issue priority
   * @param {string} id - Issue ID
   * @param {string} priority - New priority
   * @returns {Promise}
   */
  changePriority: async (id, priority) => {
    try {
      const response = await api.patch(API_ENDPOINTS.ISSUES.PRIORITY(id), {
        priority,
      });
      return response.data;
    } catch (error) {
      console.error('Change priority error:', error);
      throw error;
    }
  },

  // ============================================
  // IMAGE MANAGEMENT
  // ============================================

  /**
   * Upload issue images
   * @param {string} id - Issue ID
   * @param {Array} files - Array of files
   * @param {Function} onProgress - Progress callback
   * @returns {Promise}
   */
  uploadImages: async (id, files, onProgress = null) => {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('images', file);
      });

      const response = await uploadFile(
        API_ENDPOINTS.ISSUES.IMAGES(id),
        formData,
        onProgress,
      );
      return response.data;
    } catch (error) {
      console.error('Upload images error:', error);
      throw error;
    }
  },

  /**
   * Delete issue image
   * @param {string} issueId - Issue ID
   * @param {string} imageId - Image ID
   * @returns {Promise}
   */
  deleteImage: async (issueId, imageId) => {
    try {
      const response = await api.delete(
        API_ENDPOINTS.ISSUES.DELETE_IMAGE(issueId, imageId),
      );
      return response.data;
    } catch (error) {
      console.error('Delete image error:', error);
      throw error;
    }
  },

  // ============================================
  // SEARCH & FILTERING
  // ============================================

  /**
   * Get nearby issues
   * @param {Object} params - Latitude, longitude, radius
   * @returns {Promise}
   */
  getNearbyIssues: async (params) => {
    try {
      const response = await api.get(API_ENDPOINTS.ISSUES.NEARBY, { params });
      return response.data;
    } catch (error) {
      console.error('Get nearby issues error:', error);
      throw error;
    }
  },

  /**
   * Get trending issues
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getTrendingIssues: async (params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.ISSUES.TRENDING, { params });
      return response.data;
    } catch (error) {
      console.error('Get trending issues error:', error);
      throw error;
    }
  },

  /**
   * Get recent issues
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getRecentIssues: async (params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.ISSUES.RECENT, { params });
      return response.data;
    } catch (error) {
      console.error('Get recent issues error:', error);
      throw error;
    }
  },

  /**
   * Search issues
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   * @returns {Promise}
   */
  searchIssues: async (query, filters = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.ISSUES.LIST, {
        params: { ...filters, search: query },
      });
      return response.data;
    } catch (error) {
      console.error('Search issues error:', error);
      throw error;
    }
  },

  /**
   * Get user's issues
   * @param {string} userId - User ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getUserIssues: async (userId, params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.ISSUES.LIST, {
        params: { ...params, reportedBy: userId },
      });
      return response.data;
    } catch (error) {
      console.error('Get user issues error:', error);
      throw error;
    }
  },

  /**
   * Get assigned issues
   * @param {string} userId - User ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getAssignedIssues: async (userId, params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.ISSUES.LIST, {
        params: { ...params, assignedTo: userId },
      });
      return response.data;
    } catch (error) {
      console.error('Get assigned issues error:', error);
      throw error;
    }
  },

  /**
   * Get my issues (current user)
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getMyIssues: async (params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.ISSUES.LIST, {
        params: { ...params, reportedBy: 'me' },
      });
      return response.data;
    } catch (error) {
      console.error('Get my issues error:', error);
      throw error;
    }
  },

  /**
   * Get issues by category
   * @param {string} categoryId - Category ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getIssuesByCategory: async (categoryId, params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.ISSUES.LIST, {
        params: { ...params, category: categoryId },
      });
      return response.data;
    } catch (error) {
      console.error('Get issues by category error:', error);
      throw error;
    }
  },

  /**
   * Get issues by status
   * @param {string} status - Status
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getIssuesByStatus: async (status, params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.ISSUES.LIST, {
        params: { ...params, status },
      });
      return response.data;
    } catch (error) {
      console.error('Get issues by status error:', error);
      throw error;
    }
  },

  /**
   * Get issues by priority
   * @param {string} priority - Priority
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getIssuesByPriority: async (priority, params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.ISSUES.LIST, {
        params: { ...params, priority },
      });
      return response.data;
    } catch (error) {
      console.error('Get issues by priority error:', error);
      throw error;
    }
  },

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get issue statistics
   * @returns {Promise}
   */
  getIssueStats: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ISSUES.STATS);
      return {
        data: response.data.data || response.data
      };
    } catch (error) {
      console.error('Get issue stats error:', error);
      throw error;
    }
  },

  // ============================================
  // REPORTING
  // ============================================

  /**
   * Report issue as spam/inappropriate
   * @param {string} id - Issue ID
   * @param {string} reason - Report reason
   * @returns {Promise}
   */
  reportIssue: async (id, reason) => {
    try {
      const response = await api.post(API_ENDPOINTS.ISSUES.REPORT(id), {
        reason,
      });
      return response.data;
    } catch (error) {
      console.error('Report issue error:', error);
      throw error;
    }
  },

  // ============================================
  // EXPORT
  // ============================================

  /**
   * Export issues to CSV
   * @param {Object} filters - Filter parameters
   * @returns {Promise}
   */
  exportToCSV: async (filters = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.ISSUES.EXPORT_CSV, {
        params: filters,
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Export issues error:', error);
      throw error;
    }
  },

  /**
   * Download issues as CSV
   * @param {Object} filters - Filter parameters
   * @param {string} filename - File name
   * @returns {Promise}
   */
  downloadCSV: async (filters = {}, filename = 'issues.csv') => {
    try {
      const blob = await issueService.exportToCSV(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Download CSV error:', error);
      throw error;
    }
  },

  // ============================================
  // BULK OPERATIONS (Admin)
  // ============================================

  /**
   * Bulk update issues
   * @param {Array} issueIds - Array of issue IDs
   * @param {Object} updates - Update data
   * @returns {Promise}
   */
  bulkUpdate: async (issueIds, updates) => {
    try {
      const response = await api.patch(API_ENDPOINTS.ISSUES.BULK_UPDATE, {
        issueIds,
        updates,
      });
      return response.data;
    } catch (error) {
      console.error('Bulk update error:', error);
      throw error;
    }
  },

  /**
   * Bulk delete issues
   * @param {Array} issueIds - Array of issue IDs
   * @returns {Promise}
   */
  bulkDelete: async (issueIds) => {
    try {
      const response = await api.post(API_ENDPOINTS.ISSUES.BULK_DELETE, {
        issueIds,
      });
      return response.data;
    } catch (error) {
      console.error('Bulk delete error:', error);
      throw error;
    }
  },

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  /**
   * Format issue for display
   * @param {Object} issue - Issue object
   * @returns {Object}
   */
  formatIssue: (issue) => {
    return {
      id: issue._id,
      title: issue.title,
      description: issue.description,
      status: issue.status,
      priority: issue.priority,
      category: issue.category,
      location: issue.location,
      reporter: issue.reportedBy,
      assignee: issue.assignedTo,
      images: issue.images || [],
      stats: issue.stats || {},
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      timeAgo: issueService.getTimeAgo(issue.createdAt),
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
   * Get status color
   * @param {string} status - Issue status
   * @returns {string}
   */
  getStatusColor: (status) => {
    const colors = {
      open: '#3b82f6',
      'in-progress': '#f59e0b',
      resolved: '#10b981',
      closed: '#6b7280',
    };
    return colors[status] || '#6b7280';
  },

  /**
   * Get priority color
   * @param {string} priority - Issue priority
   * @returns {string}
   */
  getPriorityColor: (priority) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#f97316',
      urgent: '#ef4444',
    };
    return colors[priority] || '#6b7280';
  },

  /**
   * Get status icon
   * @param {string} status - Issue status
   * @returns {string}
   */
  getStatusIcon: (status) => {
    const icons = {
      open: '🔓',
      'in-progress': '⚙️',
      resolved: '✅',
      closed: '🔒',
    };
    return icons[status] || '📝';
  },

  /**
   * Get priority icon
   * @param {string} priority - Issue priority
   * @returns {string}
   */
  getPriorityIcon: (priority) => {
    const icons = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      urgent: '🔴',
    };
    return icons[priority] || '⚪';
  },

  /**
   * Validate issue data
   * @param {Object} issueData - Issue data to validate
   * @returns {Object}
   */
  validateIssue: (issueData) => {
    const errors = {};

    if (!issueData.title || issueData.title.trim() === '') {
      errors.title = 'Title is required';
    } else if (issueData.title.length < 10) {
      errors.title = 'Title must be at least 10 characters';
    } else if (issueData.title.length > 200) {
      errors.title = 'Title must be less than 200 characters';
    }

    if (!issueData.description || issueData.description.trim() === '') {
      errors.description = 'Description is required';
    } else if (issueData.description.length < 20) {
      errors.description = 'Description must be at least 20 characters';
    } else if (issueData.description.length > 2000) {
      errors.description = 'Description must be less than 2000 characters';
    }

    if (!issueData.category) {
      errors.category = 'Category is required';
    }

    if (!issueData.latitude || !issueData.longitude) {
      errors.location = 'Location is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  /**
   * Check if user can edit issue
   * @param {Object} issue - Issue object
   * @param {Object} user - Current user
   * @returns {boolean}
   */
  canEdit: (issue, user) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return issue.reportedBy?._id === user._id || issue.reportedBy === user._id;
  },

  /**
   * Check if user can delete issue
   * @param {Object} issue - Issue object
   * @param {Object} user - Current user
   * @returns {boolean}
   */
  canDelete: (issue, user) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return issue.reportedBy?._id === user._id || issue.reportedBy === user._id;
  },

  /**
   * Check if user can manage issue (assign, change status)
   * @param {Object} user - Current user
   * @returns {boolean}
   */
  canManage: (user) => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'authority';
  },

  /**
   * Sort issues
   * @param {Array} issues - Array of issues
   * @param {string} sortBy - Sort option
   * @returns {Array}
   */
  sortIssues: (issues, sortBy = '-createdAt') => {
    const sorted = [...issues];

    switch (sortBy) {
      case 'createdAt':
        return sorted.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        );
      case '-createdAt':
        return sorted.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
      case '-stats.upvotes':
        return sorted.sort(
          (a, b) => (b.stats?.upvotes || 0) - (a.stats?.upvotes || 0),
        );
      case '-stats.commentCount':
        return sorted.sort(
          (a, b) => (b.stats?.commentCount || 0) - (a.stats?.commentCount || 0),
        );
      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return sorted;
    }
  },

  /**
   * Filter issues
   * @param {Array} issues - Array of issues
   * @param {Object} filters - Filter options
   * @returns {Array}
   */
  filterIssues: (issues, filters = {}) => {
    let filtered = [...issues];

    if (filters.status) {
      filtered = filtered.filter((issue) => issue.status === filters.status);
    }

    if (filters.priority) {
      filtered = filtered.filter(
        (issue) => issue.priority === filters.priority,
      );
    }

    if (filters.category) {
      filtered = filtered.filter(
        (issue) =>
          issue.category?._id === filters.category ||
          issue.category === filters.category,
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (issue) =>
          issue.title.toLowerCase().includes(searchLower) ||
          issue.description.toLowerCase().includes(searchLower),
      );
    }

    return filtered;
  },

  /**
   * Group issues by status
   * @param {Array} issues - Array of issues
   * @returns {Object}
   */
  groupByStatus: (issues) => {
    return {
      open: issues.filter((issue) => issue.status === 'open'),
      'in-progress': issues.filter((issue) => issue.status === 'in-progress'),
      resolved: issues.filter((issue) => issue.status === 'resolved'),
      closed: issues.filter((issue) => issue.status === 'closed'),
    };
  },

  /**
   * Group issues by priority
   * @param {Array} issues - Array of issues
   * @returns {Object}
   */
  groupByPriority: (issues) => {
    return {
      urgent: issues.filter((issue) => issue.priority === 'urgent'),
      high: issues.filter((issue) => issue.priority === 'high'),
      medium: issues.filter((issue) => issue.priority === 'medium'),
      low: issues.filter((issue) => issue.priority === 'low'),
    };
  },
};

export default issueService;
