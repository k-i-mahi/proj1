
import api from './api';
import { API_ENDPOINTS } from '../config/api.config';

const userService = {
  /**
   * Get all users
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getUsers: async (params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.USERS.LIST, { params });
      return response.data;
    } catch (error) {
      console.error('Get users error:', error);
      throw error;
    }
  },

  /**
   * Get user by ID
   * @param {string} id - User ID
   * @returns {Promise}
   */
  getUserById: async (id) => {
    try {
      const response = await api.get(API_ENDPOINTS.USERS.DETAIL(id));
      return response.data;
    } catch (error) {
      console.error('Get user by ID error:', error);
      throw error;
    }
  },

  /**
   * Update user
   * @param {string} id - User ID
   * @param {Object} data - User data
   * @returns {Promise}
   */
  updateUser: async (id, data) => {
    try {
      const response = await api.put(API_ENDPOINTS.USERS.UPDATE(id), data);
      return response.data;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  },

  /**
   * Delete user
   * @param {string} id - User ID
   * @returns {Promise}
   */
  deleteUser: async (id) => {
    try {
      const response = await api.delete(API_ENDPOINTS.USERS.DELETE(id));
      return response.data;
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  },

  /**
   * Toggle user status
   * @param {string} id - User ID
   * @returns {Promise}
   */
  toggleUserStatus: async (id) => {
    try {
      const response = await api.patch(API_ENDPOINTS.USERS.TOGGLE_STATUS(id));
      return response.data;
    } catch (error) {
      console.error('Toggle user status error:', error);
      throw error;
    }
  },

  /**
   * Get user statistics
   * @returns {Promise}
   */
  getUserStats: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.USERS.STATS);
      return response.data;
    } catch (error) {
      console.error('Get user stats error:', error);
      throw error;
    }
  },

  /**
   * Bulk update users
   * @param {Array} updates - Array of updates
   * @returns {Promise}
   */
  bulkUpdateUsers: async (updates) => {
    try {
      const response = await api.put(API_ENDPOINTS.USERS.BULK_UPDATE, {
        updates,
      });
      return response.data;
    } catch (error) {
      console.error('Bulk update users error:', error);
      throw error;
    }
  },

  /**
   * Export users
   * @param {Object} filters - Filter parameters
   * @returns {Promise}
   */
  exportUsers: async (filters = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.USERS.EXPORT, {
        params: filters,
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Export users error:', error);
      throw error;
    }
  },
};

export default userService;