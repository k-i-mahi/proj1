import api from './api';
import { API_ENDPOINTS } from '../config/api.config';

const notificationService = {
  // ============================================
  // NOTIFICATION CRUD OPERATIONS
  // ============================================

  /**
   * Get all notifications for current user
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getNotifications: async (params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.NOTIFICATIONS.LIST, { params });
      return response.data;
    } catch (error) {
      console.error('Get notifications error:', error);
      throw error;
    }
  },

  /**
   * Get unread notifications
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getUnreadNotifications: async (params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.NOTIFICATIONS.UNREAD, { params });
      return response.data;
    } catch (error) {
      console.error('Get unread notifications error:', error);
      throw error;
    }
  },

  /**
   * Get notification by ID
   * @param {string} id - Notification ID
   * @returns {Promise}
   */
  getNotificationById: async (id) => {
    try {
      const response = await api.get(API_ENDPOINTS.NOTIFICATIONS.DETAIL(id));
      return response.data;
    } catch (error) {
      console.error('Get notification by ID error:', error);
      throw error;
    }
  },

  /**
   * Mark notification as read
   * @param {string} id - Notification ID
   * @returns {Promise}
   */
  markAsRead: async (id) => {
    try {
      const response = await api.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
      return response.data;
    } catch (error) {
      console.error('Mark as read error:', error);
      throw error;
    }
  },

  /**
   * Mark all notifications as read
   * @returns {Promise}
   */
  markAllAsRead: async () => {
    try {
      const response = await api.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
      return response.data;
    } catch (error) {
      console.error('Mark all as read error:', error);
      throw error;
    }
  },

  /**
   * Delete notification
   * @param {string} id - Notification ID
   * @returns {Promise}
   */
  deleteNotification: async (id) => {
    try {
      const response = await api.delete(API_ENDPOINTS.NOTIFICATIONS.DELETE(id));
      return response.data;
    } catch (error) {
      console.error('Delete notification error:', error);
      throw error;
    }
  },

  /**
   * Delete all notifications
   * @returns {Promise}
   */
  deleteAllNotifications: async () => {
    try {
      const response = await api.delete(API_ENDPOINTS.NOTIFICATIONS.DELETE_ALL);
      return response.data;
    } catch (error) {
      console.error('Delete all notifications error:', error);
      throw error;
    }
  },

  // ============================================
  // NOTIFICATION STATISTICS
  // ============================================

  /**
   * Get notification count
   * @returns {Promise}
   */
  getNotificationCount: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.NOTIFICATIONS.COUNT);
      return response.data;
    } catch (error) {
      console.error('Get notification count error:', error);
      throw error;
    }
  },

  /**
   * Get unread count
   * @returns {Promise}
   */
  getUnreadCount: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
      return response.data;
    } catch (error) {
      console.error('Get unread count error:', error);
      throw error;
    }
  },

  // ============================================
  // NOTIFICATION PREFERENCES
  // ============================================

  /**
   * Get notification preferences
   * @returns {Promise}
   */
  getPreferences: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.NOTIFICATIONS.PREFERENCES);
      return response.data;
    } catch (error) {
      console.error('Get preferences error:', error);
      throw error;
    }
  },

  /**
   * Update notification preferences
   * @param {Object} preferences - Notification preferences
   * @returns {Promise}
   */
  updatePreferences: async (preferences) => {
    try {
      const response = await api.put(API_ENDPOINTS.NOTIFICATIONS.PREFERENCES, preferences);
      return response.data;
    } catch (error) {
      console.error('Update preferences error:', error);
      throw error;
    }
  },

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  /**
   * Get notification icon by type
   * @param {string} type - Notification type
   * @returns {string}
   */
  getNotificationIcon: (type) => {
    const icons = {
      issue_created: '🆕',
      issue_updated: '✏️',
      issue_commented: '💬',
      issue_status_changed: '🔄',
      issue_assigned: '📌',
      issue_resolved: '✅',
      mention: '📢',
      follow: '⭐',
      vote: '👍',
      system: '🔔',
    };
    return icons[type] || '📝';
  },

  /**
   * Format notification for display
   * @param {Object} notification - Notification object
   * @returns {Object}
   */
  formatNotification: (notification) => {
    return {
      id: notification._id,
      type: notification.type,
      icon: notificationService.getNotificationIcon(notification.type),
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      timeAgo: notificationService.getTimeAgo(notification.createdAt),
      timestamp: notification.createdAt,
      link: notification.link,
      data: notification.data,
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
    return new Date(date).toLocaleDateString();
  },

  /**
   * Group notifications by date
   * @param {Array} notifications - Array of notifications
   * @returns {Object}
   */
  groupByDate: (notifications) => {
    const today = new Date().setHours(0, 0, 0, 0);
    const yesterday = new Date(today - 86400000);

    return {
      today: notifications.filter(
        (n) => new Date(n.createdAt).setHours(0, 0, 0, 0) === today,
      ),
      yesterday: notifications.filter(
        (n) => new Date(n.createdAt).setHours(0, 0, 0, 0) === yesterday.getTime(),
      ),
      older: notifications.filter(
        (n) => new Date(n.createdAt) < yesterday,
      ),
    };
  },
};

export default notificationService;
