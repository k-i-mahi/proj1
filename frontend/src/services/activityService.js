import api from './api';
import { API_ENDPOINTS } from '../config/api.config';

const activityService = {
  // ============================================
  // ACTIVITY FEED
  // ============================================

  /**
   * Get activity feed (global or filtered)
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getActivities: async (params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.ACTIVITIES.LIST, { params });
      return response.data;
    } catch (error) {
      console.error('Get activities error:', error);
      throw error;
    }
  },

  /**
   * Get recent activities
   * @param {number} limit - Number of activities
   * @returns {Promise}
   */
  getRecentActivities: async (limit = 20) => {
    try {
      const response = await api.get(API_ENDPOINTS.ACTIVITIES.LIST, {
        params: { limit, sortBy: '-createdAt' },
      });
      return response.data;
    } catch (error) {
      console.error('Get recent activities error:', error);
      throw error;
    }
  },

  /**
   * Get activities by action type
   * @param {string} action - Action type (created, updated, commented, etc.)
   * @param {Object} params - Additional query parameters
   * @returns {Promise}
   */
  getActivitiesByAction: async (action, params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.ACTIVITIES.LIST, {
        params: { ...params, action },
      });
      return response.data;
    } catch (error) {
      console.error('Get activities by action error:', error);
      throw error;
    }
  },

  // ============================================
  // ISSUE ACTIVITIES
  // ============================================

  /**
   * Get activities for a specific issue
   * @param {string} issueId - Issue ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getIssueActivities: async (issueId, params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.ACTIVITIES.ISSUE(issueId), {
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Get issue activities error:', error);
      throw error;
    }
  },

  /**
   * Get issue activity timeline
   * @param {string} issueId - Issue ID
   * @returns {Promise}
   */
  getIssueTimeline: async (issueId) => {
    try {
      const response = await api.get(API_ENDPOINTS.ACTIVITIES.ISSUE(issueId), {
        params: { sortBy: 'createdAt', limit: 100 },
      });
      return response.data;
    } catch (error) {
      console.error('Get issue timeline error:', error);
      throw error;
    }
  },

  // ============================================
  // USER ACTIVITIES
  // ============================================

  /**
   * Get activities for a specific user
   * @param {string} userId - User ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getUserActivities: async (userId, params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.ACTIVITIES.USER(userId), {
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Get user activities error:', error);
      throw error;
    }
  },

  /**
   * Get current user's activities
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getMyActivities: async (params = {}) => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) {
        throw new Error('User not authenticated');
      }
      const response = await api.get(API_ENDPOINTS.ACTIVITIES.USER(user._id), {
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Get my activities error:', error);
      throw error;
    }
  },

  /**
   * Get user activity summary
   * @param {string} userId - User ID
   * @returns {Promise}
   */
  getUserActivitySummary: async (userId) => {
    try {
      const response = await api.get(API_ENDPOINTS.ACTIVITIES.USER(userId), {
        params: { limit: 5, sortBy: '-createdAt' },
      });
      return response.data;
    } catch (error) {
      console.error('Get user activity summary error:', error);
      throw error;
    }
  },

  // ============================================
  // ACTIVITY STATISTICS
  // ============================================

  /**
   * Get activity statistics
   * @param {Object} params - Query parameters (startDate, endDate)
   * @returns {Promise}
   */
  getActivityStats: async (params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.ACTIVITIES.STATS, {
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Get activity stats error:', error);
      throw error;
    }
  },

  /**
   * Get activity stats by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise}
   */
  getActivityStatsByDateRange: async (startDate, endDate) => {
    try {
      const response = await api.get(API_ENDPOINTS.ACTIVITIES.STATS, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
      return response.data;
    } catch (error) {
      console.error('Get activity stats by date range error:', error);
      throw error;
    }
  },

  /**
   * Get most active users
   * @param {number} limit - Number of users
   * @returns {Promise}
   */
  getMostActiveUsers: async (limit = 10) => {
    try {
      const response = await api.get(API_ENDPOINTS.ACTIVITIES.STATS);
      return response.data?.data?.activeUsers?.slice(0, limit) || [];
    } catch (error) {
      console.error('Get most active users error:', error);
      throw error;
    }
  },

  /**
   * Get activity timeline
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getActivityTimeline: async (params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.ACTIVITIES.STATS, {
        params,
      });
      return response.data?.data?.timeline || [];
    } catch (error) {
      console.error('Get activity timeline error:', error);
      throw error;
    }
  },

  // ============================================
  // ACTIVITY FILTERING
  // ============================================

  /**
   * Get activities with advanced filters
   * @param {Object} filters - Filter options
   * @returns {Promise}
   */
  getFilteredActivities: async (filters = {}) => {
    try {
      const params = {
        page: filters.page || 1,
        limit: filters.limit || 20,
        action: filters.action,
        userId: filters.userId,
        issueId: filters.issueId,
        startDate: filters.startDate?.toISOString(),
        endDate: filters.endDate?.toISOString(),
        sortBy: filters.sortBy || '-createdAt',
      };

      // Remove undefined values
      Object.keys(params).forEach(
        (key) => params[key] === undefined && delete params[key],
      );

      const response = await api.get(API_ENDPOINTS.ACTIVITIES.LIST, { params });
      return response.data;
    } catch (error) {
      console.error('Get filtered activities error:', error);
      throw error;
    }
  },

  /**
   * Search activities
   * @param {string} query - Search query
   * @param {Object} params - Additional parameters
   * @returns {Promise}
   */
  searchActivities: async (query, params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.ACTIVITIES.LIST, {
        params: { ...params, search: query },
      });
      return response.data;
    } catch (error) {
      console.error('Search activities error:', error);
      throw error;
    }
  },

  // ============================================
  // ACTIVITY TYPES
  // ============================================

  /**
   * Get available activity types
   * @returns {Array}
   */
  getActivityTypes: () => {
    return [
      { value: 'created', label: 'Created', icon: '🆕' },
      { value: 'updated', label: 'Updated', icon: '✏️' },
      { value: 'commented', label: 'Commented', icon: '💬' },
      { value: 'status_changed', label: 'Status Changed', icon: '🔄' },
      { value: 'assigned', label: 'Assigned', icon: '📌' },
      { value: 'resolved', label: 'Resolved', icon: '✅' },
      { value: 'closed', label: 'Closed', icon: '🔒' },
      { value: 'reopened', label: 'Reopened', icon: '🔓' },
      { value: 'voted', label: 'Voted', icon: '👍' },
      { value: 'followed', label: 'Followed', icon: '⭐' },
      { value: 'unfollowed', label: 'Unfollowed', icon: '⭕' },
      { value: 'priority_changed', label: 'Priority Changed', icon: '🔥' },
      { value: 'category_changed', label: 'Category Changed', icon: '📁' },
      { value: 'deleted', label: 'Deleted', icon: '🗑️' },
    ];
  },

  /**
   * Get activity icon by type
   * @param {string} type - Activity type
   * @returns {string}
   */
  getActivityIcon: (type) => {
    const icons = {
      created: '🆕',
      updated: '✏️',
      commented: '💬',
      status_changed: '🔄',
      assigned: '📌',
      resolved: '✅',
      closed: '🔒',
      reopened: '🔓',
      voted: '👍',
      followed: '⭐',
      unfollowed: '⭕',
      priority_changed: '🔥',
      category_changed: '📁',
      deleted: '🗑️',
    };
    return icons[type] || '📝';
  },

  /**
   * Format activity for display
   * @param {Object} activity - Activity object
   * @returns {Object}
   */
  formatActivity: (activity) => {
    return {
      id: activity._id,
      action: activity.action,
      icon: activityService.getActivityIcon(activity.action),
      description: activity.description,
      user: activity.user,
      issue: activity.issue,
      timeAgo: activityService.getTimeAgo(activity.createdAt),
      timestamp: activity.createdAt,
      metadata: activity.metadata,
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

  // ============================================
  // EXPORT & DOWNLOAD
  // ============================================

  /**
   * Export activities to CSV
   * @param {Object} filters - Filter parameters
   * @returns {Promise}
   */
  exportToCSV: async (filters = {}) => {
    try {
      const response = await api.get('/activities/export/csv', {
        params: filters,
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Export activities error:', error);
      throw error;
    }
  },

  /**
   * Download activities report
   * @param {Object} filters - Filter parameters
   * @param {string} filename - File name
   * @returns {Promise}
   */
  downloadReport: async (filters = {}, filename = 'activities.csv') => {
    try {
      const blob = await activityService.exportToCSV(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Download report error:', error);
      throw error;
    }
  },

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  /**
   * Clear activity cache
   */
  clearCache: () => {
    // Clear any cached activity data
    sessionStorage.removeItem('activities_cache');
  },

  /**
   * Get cached activities
   * @returns {Array|null}
   */
  getCachedActivities: () => {
    try {
      const cached = sessionStorage.getItem('activities_cache');
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Set cached activities
   * @param {Array} activities - Activities to cache
   */
  setCachedActivities: (activities) => {
    try {
      sessionStorage.setItem('activities_cache', JSON.stringify(activities));
    } catch (error) {
      console.error('Cache activities error:', error);
    }
  },
};

export default activityService;
