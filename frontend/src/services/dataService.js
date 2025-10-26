import api from './api';
import { API_ENDPOINTS } from '../config/api.config';

/**
 * Centralized Data Service
 * Handles data consistency, caching, and standardized responses across all services
 */
class DataService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.subscribers = new Map();
  }

  /**
   * Standardize API response format
   * @param {Object} response - Axios response
   * @returns {Object} Standardized response
   */
  standardizeResponse(response) {
    const data = response?.data || {};
    
    return {
      success: data.success !== false,
      data: data.data || data,
      pagination: data.pagination || null,
      message: data.message || null,
      errors: data.errors || null,
      meta: data.meta || null,
    };
  }

  /**
   * Make API request with standardization and caching
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Standardized response
   */
  async request(method, endpoint, data = null, options = {}) {
    const { useCache = false, cacheKey = null, ...axiosOptions } = options;

    // Check cache first
    if (useCache && cacheKey) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      let response;
      
      switch (method.toLowerCase()) {
        case 'get':
          response = await api.get(endpoint, { params: data, ...axiosOptions });
          break;
        case 'post':
          response = await api.post(endpoint, data, axiosOptions);
          break;
        case 'put':
          response = await api.put(endpoint, data, axiosOptions);
          break;
        case 'patch':
          response = await api.patch(endpoint, data, axiosOptions);
          break;
        case 'delete':
          response = await api.delete(endpoint, axiosOptions);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      const standardized = this.standardizeResponse(response);

      // Cache successful responses
      if (useCache && cacheKey && standardized.success) {
        this.setCache(cacheKey, standardized);
      }

      // Notify subscribers of data changes
      this.notifySubscribers(endpoint, standardized);

      return standardized;
    } catch (error) {
      console.error(`Data service error [${method.toUpperCase()} ${endpoint}]:`, error);
      
      // Return standardized error response
      return {
        success: false,
        data: null,
        pagination: null,
        message: error.message || 'Request failed',
        errors: error.response?.data?.errors || null,
        meta: null,
      };
    }
  }

  /**
   * Cache management
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTimeout;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clearCache(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Subscription system for data changes
   */
  subscribe(endpoint, callback) {
    if (!this.subscribers.has(endpoint)) {
      this.subscribers.set(endpoint, new Set());
    }
    this.subscribers.get(endpoint).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(endpoint);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(endpoint);
        }
      }
    };
  }

  notifySubscribers(endpoint, data) {
    const callbacks = this.subscribers.get(endpoint);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Subscriber callback error:', error);
        }
      });
    }
  }

  /**
   * Batch requests
   */
  async batchRequests(requests) {
    const promises = requests.map(({ method, endpoint, data, options }) =>
      this.request(method, endpoint, data, options).catch(error => ({ error }))
    );

    return await Promise.all(promises);
  }

  /**
   * Data validation utilities
   */
  validateResponse(response, expectedFields = []) {
    if (!response.success) {
      return { isValid: false, errors: ['Request failed'] };
    }

    const errors = [];
    const data = response.data;

    if (!data) {
      errors.push('No data received');
    } else {
      expectedFields.forEach(field => {
        if (!(field in data)) {
          errors.push(`Missing field: ${field}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Retry failed requests
   */
  async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }

    throw lastError;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await api.get('/health', { timeout: 5000 });
      return {
        healthy: true,
        data: response.data,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  }

  /**
   * Common data operations
   */
  
  // Issues
  async getIssues(params = {}) {
    return this.request('GET', API_ENDPOINTS.ISSUES.LIST, params, {
      useCache: !params.search, // Don't cache search results
      cacheKey: `issues_${JSON.stringify(params)}`,
    });
  }

  async getIssueById(id) {
    return this.request('GET', API_ENDPOINTS.ISSUES.DETAIL(id), null, {
      useCache: true,
      cacheKey: `issue_${id}`,
    });
  }

  async createIssue(data) {
    const response = await this.request('POST', API_ENDPOINTS.ISSUES.CREATE, data);
    // Clear issues cache when new issue is created
    this.clearCache();
    return response;
  }

  async updateIssue(id, data) {
    const response = await this.request('PUT', API_ENDPOINTS.ISSUES.UPDATE(id), data);
    // Clear specific issue and issues list cache
    this.clearCache(`issue_${id}`);
    this.clearCache();
    return response;
  }

  async deleteIssue(id) {
    const response = await this.request('DELETE', API_ENDPOINTS.ISSUES.DELETE(id));
    this.clearCache();
    return response;
  }

  // Categories
  async getCategories(params = {}) {
    return this.request('GET', API_ENDPOINTS.CATEGORIES.LIST, params, {
      useCache: true,
      cacheKey: `categories_${JSON.stringify(params)}`,
    });
  }

  async getCategoryById(id) {
    return this.request('GET', API_ENDPOINTS.CATEGORIES.DETAIL(id), null, {
      useCache: true,
      cacheKey: `category_${id}`,
    });
  }

  async createCategory(data) {
    const response = await this.request('POST', API_ENDPOINTS.CATEGORIES.CREATE, data);
    this.clearCache();
    return response;
  }

  async updateCategory(id, data) {
    const response = await this.request('PUT', API_ENDPOINTS.CATEGORIES.UPDATE(id), data);
    this.clearCache(`category_${id}`);
    this.clearCache();
    return response;
  }

  async deleteCategory(id) {
    const response = await this.request('DELETE', API_ENDPOINTS.CATEGORIES.DELETE(id));
    this.clearCache();
    return response;
  }

  // Users
  async getUsers(params = {}) {
    return this.request('GET', API_ENDPOINTS.USERS.LIST, params);
  }

  async getUserById(id) {
    return this.request('GET', API_ENDPOINTS.USERS.DETAIL(id), null, {
      useCache: true,
      cacheKey: `user_${id}`,
    });
  }

  // Notifications
  async getNotifications(params = {}) {
    return this.request('GET', API_ENDPOINTS.NOTIFICATIONS.LIST, params);
  }

  async getUnreadNotifications() {
    return this.request('GET', API_ENDPOINTS.NOTIFICATIONS.UNREAD);
  }

  async markNotificationRead(id) {
    const response = await this.request('PATCH', API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
    this.clearCache();
    return response;
  }

  // Analytics
  async getAnalytics(params = {}) {
    return this.request('GET', API_ENDPOINTS.ANALYTICS.DASHBOARD, params, {
      useCache: true,
      cacheKey: `analytics_${JSON.stringify(params)}`,
    });
  }

  async getIssueStats() {
    return this.request('GET', API_ENDPOINTS.ISSUES.STATS, null, {
      useCache: true,
      cacheKey: 'issue_stats',
    });
  }

  async getCategoryStats() {
    return this.request('GET', API_ENDPOINTS.CATEGORIES.STATS, null, {
      useCache: true,
      cacheKey: 'category_stats',
    });
  }

  // Location
  async getNearbyIssues(params) {
    return this.request('GET', API_ENDPOINTS.LOCATION.NEARBY_ISSUES, params);
  }

  async getIssuesBounds(params) {
    return this.request('GET', API_ENDPOINTS.LOCATION.ISSUES_BOUNDS, params);
  }

  // Activities
  async getActivities(params = {}) {
    return this.request('GET', API_ENDPOINTS.ACTIVITIES.LIST, params);
  }

  async getIssueActivities(issueId) {
    return this.request('GET', API_ENDPOINTS.ACTIVITIES.ISSUE(issueId));
  }

  async getUserActivities(userId) {
    return this.request('GET', API_ENDPOINTS.ACTIVITIES.USER(userId));
  }

  /**
   * Real-time data sync utilities
   */
  setupRealTimeSync(endpoints = []) {
    // This would integrate with WebSocket or Server-Sent Events
    // For now, implement polling-based sync
    const syncInterval = 30000; // 30 seconds

    const sync = async () => {
      for (const endpoint of endpoints) {
        try {
          // Clear cache and refetch
          this.clearCache();
          await this.request('GET', endpoint);
        } catch (error) {
          console.warn(`Sync failed for ${endpoint}:`, error);
        }
      }
    };

    const intervalId = setInterval(sync, syncInterval);

    return () => clearInterval(intervalId);
  }

  /**
   * Data consistency checks
   */
  async validateDataConsistency() {
    const checks = [];

    try {
      // Check if backend is healthy
      const health = await this.healthCheck();
      checks.push({
        name: 'Backend Health',
        passed: health.healthy,
        message: health.healthy ? 'Backend is healthy' : health.error,
      });

      // Check if critical endpoints are accessible
      const criticalEndpoints = [
        { name: 'Issues', endpoint: API_ENDPOINTS.ISSUES.LIST },
        { name: 'Categories', endpoint: API_ENDPOINTS.CATEGORIES.LIST },
        { name: 'Auth', endpoint: API_ENDPOINTS.AUTH.ME },
      ];

      for (const { name, endpoint } of criticalEndpoints) {
        try {
          const response = await this.request('GET', endpoint, null, { timeout: 5000 });
          checks.push({
            name: `${name} Endpoint`,
            passed: response.success,
            message: response.success ? 'Accessible' : response.message,
          });
        } catch (error) {
          checks.push({
            name: `${name} Endpoint`,
            passed: false,
            message: error.message,
          });
        }
      }

    } catch (error) {
      checks.push({
        name: 'General Connectivity',
        passed: false,
        message: error.message,
      });
    }

    return {
      allPassed: checks.every(check => check.passed),
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}

// Create singleton instance
const dataService = new DataService();

export default dataService;