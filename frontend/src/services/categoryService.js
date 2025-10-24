// categoryService.js
import api from './api';
import { API_ENDPOINTS } from '../config/api.config';

/**
 * Helper to safely extract the common backend wrapper:
 * backend -> { success, data, pagination, message }
 * We return an object { data, pagination, success, message } so callers
 * have a predictable shape.
 */
const extractResponse = (response) => {
  const wrapper = response?.data ?? {};
  return {
    success: wrapper.success !== false,
    data: wrapper.data ?? null,
    pagination: wrapper.pagination ?? null,
    message: wrapper.message ?? null,
    raw: wrapper,
  };
};

const categoryService = {
  // ============================================
  // CATEGORY CRUD OPERATIONS
  // ============================================

  /**
   * Get all categories
   * @param {Object} params - Query parameters (search, isActive, sort, page, limit, etc.)
   * @returns {Promise<{data: Array, pagination: Object, success: boolean}>}
   */
  getCategories: async (params = {}) => {
    try {
      console.log('📋 Fetching categories with params:', params);

      const endpoint = API_ENDPOINTS?.CATEGORIES?.LIST ?? '/categories';
      const response = await api.get(endpoint, { params });
      const extracted = extractResponse(response);

      console.log('✅ Categories response:', {
        hasData: Array.isArray(extracted.data),
        dataLength: extracted.data?.length ?? 0,
        hasPagination: !!extracted.pagination,
      });

      return {
        data: extracted.data || [],
        pagination: extracted.pagination || null,
        success: extracted.success,
        message: extracted.message,
      };
    } catch (error) {
      console.error('Get categories error:', error);
      throw error;
    }
  },

  /**
   * Get single category by ID
   * @param {string} id - Category ID
   * @returns {Promise<{data: Object, success: boolean}>}
   */
  getCategoryById: async (id) => {
    try {
      const endpointFactory = API_ENDPOINTS?.CATEGORIES?.DETAIL;
      const endpoint =
        typeof endpointFactory === 'function'
          ? endpointFactory(id)
          : `/categories/${id}`;
      const response = await api.get(endpoint);
      const extracted = extractResponse(response);
      return {
        data: extracted.data,
        success: extracted.success,
        message: extracted.message,
      };
    } catch (error) {
      console.error('Get category by ID error:', error);
      throw error;
    }
  },

  /**
   * Get category by name (slug)
   * Uses the list endpoint with a `name` or `search` param and returns the first match.
   * @param {string} name
   * @returns {Promise<Object|null>}
   */
  getCategoryByName: async (name) => {
    try {
      if (!name) return null;
      // prefer `name` query if backend supports it; otherwise use search
      const params = { name };
      const endpoint = API_ENDPOINTS?.CATEGORIES?.LIST ?? '/categories';
      const response = await api.get(endpoint, { params });
      const { data } = extractResponse(response);
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Get category by name error:', error);
      throw error;
    }
  },

  /**
   * Create new category
   * @param {Object} categoryData
   */
  createCategory: async (categoryData) => {
    try {
      const endpoint = API_ENDPOINTS?.CATEGORIES?.CREATE ?? '/categories';
      const response = await api.post(endpoint, categoryData);
      const extracted = extractResponse(response);
      return {
        data: extracted.data,
        success: extracted.success,
        message: extracted.message,
      };
    } catch (error) {
      console.error('Create category error:', error);
      throw error;
    }
  },

  /**
   * Update category
   * @param {string} id
   * @param {Object} categoryData
   */
  updateCategory: async (id, categoryData) => {
    try {
      const endpointFactory = API_ENDPOINTS?.CATEGORIES?.UPDATE;
      const endpoint =
        typeof endpointFactory === 'function'
          ? endpointFactory(id)
          : `/categories/${id}`;
      const response = await api.put(endpoint, categoryData);
      const extracted = extractResponse(response);
      return {
        data: extracted.data,
        success: extracted.success,
        message: extracted.message,
      };
    } catch (error) {
      console.error('Update category error:', error);
      throw error;
    }
  },

  /**
   * Delete category
   * @param {string} id
   */
  deleteCategory: async (id) => {
    try {
      const endpointFactory = API_ENDPOINTS?.CATEGORIES?.DELETE;
      const endpoint =
        typeof endpointFactory === 'function'
          ? endpointFactory(id)
          : `/categories/${id}`;
      const response = await api.delete(endpoint);
      const extracted = extractResponse(response);
      return { success: extracted.success, message: extracted.message };
    } catch (error) {
      console.error('Delete category error:', error);
      throw error;
    }
  },

  // ============================================
  // CATEGORY STATUS MANAGEMENT
  // ============================================

  /**
   * Toggle category status
   * @param {string} id
   */
  toggleCategoryStatus: async (id) => {
    try {
      const endpointFactory = API_ENDPOINTS?.CATEGORIES?.TOGGLE_STATUS;
      const endpoint =
        typeof endpointFactory === 'function'
          ? endpointFactory(id)
          : `/categories/${id}/toggle`;
      const response = await api.patch(endpoint);
      const extracted = extractResponse(response);
      // backend now returns full category object in data
      return {
        data: extracted.data,
        success: extracted.success,
        message: extracted.message,
      };
    } catch (error) {
      console.error('Toggle category status error:', error);
      throw error;
    }
  },

  /**
   * Activate category (fallback endpoint)
   * @param {string} id
   */
  activateCategory: async (id) => {
    try {
      // Some backends provide explicit activate/deactivate routes; fallback to toggle if not available
      const endpoint = `/categories/${id}/activate`;
      const response = await api.patch(endpoint);
      const extracted = extractResponse(response);
      return {
        data: extracted.data,
        success: extracted.success,
        message: extracted.message,
      };
    } catch (error) {
      console.error('Activate category error:', error);
      throw error;
    }
  },

  /**
   * Deactivate category (fallback endpoint)
   * @param {string} id
   */
  deactivateCategory: async (id) => {
    try {
      const endpoint = `/categories/${id}/deactivate`;
      const response = await api.patch(endpoint);
      const extracted = extractResponse(response);
      return {
        data: extracted.data,
        success: extracted.success,
        message: extracted.message,
      };
    } catch (error) {
      console.error('Deactivate category error:', error);
      throw error;
    }
  },

  // ============================================
  // CATEGORY STATISTICS
  // ============================================

  getCategoryStats: async (id) => {
    try {
      const endpoint = `/categories/${id}/stats`;
      const response = await api.get(endpoint);
      const extracted = extractResponse(response);
      return {
        data: extracted.data,
        success: extracted.success,
        message: extracted.message,
      };
    } catch (error) {
      console.error('Get category stats error:', error);
      throw error;
    }
  },

  getAllCategoriesStats: async () => {
    try {
      const endpoint =
        API_ENDPOINTS?.CATEGORIES?.STATS ?? '/categories/stats/all';
      const response = await api.get(endpoint);
      const extracted = extractResponse(response);
      return {
        data: extracted.data,
        success: extracted.success,
        message: extracted.message,
      };
    } catch (error) {
      console.error('Get all categories stats error:', error);
      throw error;
    }
  },

  getCategoryUsageStats: async (id, params = {}) => {
    try {
      const endpoint = `/categories/${id}/usage`;
      const response = await api.get(endpoint, { params });
      const extracted = extractResponse(response);
      return {
        data: extracted.data,
        success: extracted.success,
        message: extracted.message,
      };
    } catch (error) {
      console.error('Get category usage stats error:', error);
      throw error;
    }
  },

  getTrendingCategories: async (limit = 10) => {
    try {
      const endpoint = '/categories/trending';
      const response = await api.get(endpoint, { params: { limit } });
      const extracted = extractResponse(response);
      return {
        data: extracted.data || [],
        success: extracted.success,
        message: extracted.message,
      };
    } catch (error) {
      console.error('Get trending categories error:', error);
      throw error;
    }
  },

  // ============================================
  // CATEGORY FILTERING & SEARCH
  // ============================================

  getActiveCategories: async () => {
    try {
      const endpoint = API_ENDPOINTS?.CATEGORIES?.LIST ?? '/categories';
      // backend accepts isActive as 'true' string — keep consistent with backend behavior
      const response = await api.get(endpoint, {
        params: { isActive: 'true', sort: 'order' },
      });
      const extracted = extractResponse(response);
      return {
        data: extracted.data || [],
        pagination: extracted.pagination || null,
        success: extracted.success,
      };
    } catch (error) {
      console.error('Get active categories error:', error);
      throw error;
    }
  },

  getInactiveCategories: async () => {
    try {
      const endpoint = API_ENDPOINTS?.CATEGORIES?.LIST ?? '/categories';
      const response = await api.get(endpoint, {
        params: { isActive: 'false' },
      });
      const extracted = extractResponse(response);
      return {
        data: extracted.data || [],
        pagination: extracted.pagination || null,
        success: extracted.success,
      };
    } catch (error) {
      console.error('Get inactive categories error:', error);
      throw error;
    }
  },

  searchCategories: async (query) => {
    try {
      const endpoint = API_ENDPOINTS?.CATEGORIES?.LIST ?? '/categories';
      const response = await api.get(endpoint, { params: { search: query } });
      const extracted = extractResponse(response);
      return {
        data: extracted.data || [],
        pagination: extracted.pagination || null,
        success: extracted.success,
      };
    } catch (error) {
      console.error('Search categories error:', error);
      throw error;
    }
  },

  getCategoriesWithIssues: async () => {
    try {
      const endpoint = '/categories/with-issues';
      const response = await api.get(endpoint);
      const extracted = extractResponse(response);
      return { data: extracted.data || [], success: extracted.success };
    } catch (error) {
      console.error('Get categories with issues error:', error);
      throw error;
    }
  },

  // ============================================
  // CATEGORY ORDERING
  // ============================================

  reorderCategories: async (categories) => {
    try {
      const endpoint =
        API_ENDPOINTS?.CATEGORIES?.REORDER ?? '/categories/reorder';
      const response = await api.put(endpoint, { categories });
      const extracted = extractResponse(response);
      return { success: extracted.success, message: extracted.message };
    } catch (error) {
      console.error('Reorder categories error:', error);
      throw error;
    }
  },

  moveCategoryUp: async (id) => {
    try {
      const endpoint = `/categories/${id}/move-up`;
      const response = await api.patch(endpoint);
      const extracted = extractResponse(response);
      return {
        data: extracted.data,
        success: extracted.success,
        message: extracted.message,
      };
    } catch (error) {
      console.error('Move category up error:', error);
      throw error;
    }
  },

  moveCategoryDown: async (id) => {
    try {
      const endpoint = `/categories/${id}/move-down`;
      const response = await api.patch(endpoint);
      const extracted = extractResponse(response);
      return {
        data: extracted.data,
        success: extracted.success,
        message: extracted.message,
      };
    } catch (error) {
      console.error('Move category down error:', error);
      throw error;
    }
  },

  // ============================================
  // BULK OPERATIONS
  // ============================================

  bulkCreateCategories: async (categories) => {
    try {
      const endpoint = '/categories/bulk-create';
      const response = await api.post(endpoint, { categories });
      const extracted = extractResponse(response);
      return {
        data: extracted.data,
        success: extracted.success,
        message: extracted.message,
      };
    } catch (error) {
      console.error('Bulk create categories error:', error);
      throw error;
    }
  },

  bulkUpdateCategories: async (updates) => {
    try {
      const endpoint = '/categories/bulk-update';
      const response = await api.put(endpoint, { updates });
      const extracted = extractResponse(response);
      return {
        data: extracted.data,
        success: extracted.success,
        message: extracted.message,
      };
    } catch (error) {
      console.error('Bulk update categories error:', error);
      throw error;
    }
  },

  bulkDeleteCategories: async (ids) => {
    try {
      const endpoint = '/categories/bulk-delete';
      const response = await api.post(endpoint, { ids });
      const extracted = extractResponse(response);
      return { success: extracted.success, message: extracted.message };
    } catch (error) {
      console.error('Bulk delete categories error:', error);
      throw error;
    }
  },

  bulkToggleStatus: async (ids, isActive) => {
    try {
      const endpoint = '/categories/bulk-toggle';
      const response = await api.patch(endpoint, { ids, isActive });
      const extracted = extractResponse(response);
      return {
        success: extracted.success,
        message: extracted.message,
        data: extracted.data,
      };
    } catch (error) {
      console.error('Bulk toggle status error:', error);
      throw error;
    }
  },

  // ============================================
  // CATEGORY VALIDATION
  // ============================================

  checkNameExists: async (name, excludeId = null) => {
    try {
      const endpoint = '/categories/check-name';
      const response = await api.get(endpoint, { params: { name, excludeId } });
      const extracted = extractResponse(response);
      return {
        exists: extracted.data?.exists ?? false,
        success: extracted.success,
      };
    } catch (error) {
      console.error('Check name exists error:', error);
      throw error;
    }
  },

  validateCategory: (categoryData) => {
    const errors = {};

    if (!categoryData || typeof categoryData !== 'object') {
      return { isValid: false, errors: { general: 'Invalid category data' } };
    }

    if (!categoryData.name || categoryData.name.trim() === '') {
      errors.name = 'Name is required';
    } else if (!/^[a-z0-9-]+$/.test(categoryData.name)) {
      errors.name = 'Name must be lowercase alphanumeric with hyphens';
    }

    if (!categoryData.displayName || categoryData.displayName.trim() === '') {
      errors.displayName = 'Display name is required';
    }

    if (categoryData.icon && String(categoryData.icon).length > 10) {
      errors.icon = 'Icon must be 10 characters or less';
    }

    if (categoryData.color && !/^#[0-9A-Fa-f]{6}$/.test(categoryData.color)) {
      errors.color = 'Invalid color format (use #RRGGBB)';
    }

    if (categoryData.order !== undefined && Number(categoryData.order) < 0) {
      errors.order = 'Order must be a positive number';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  getCategoryIcon: (category) => category?.icon ?? '📁',

  getCategoryColor: (category) => category?.color ?? '#667eea',

  formatCategory: (category) => {
    if (!category) return null;
    return {
      id: category._id ?? category.id,
      name: category.name,
      displayName: category.displayName,
      description: category.description ?? '',
      icon: category.icon ?? categoryService.getCategoryIcon(category),
      color: category.color ?? categoryService.getCategoryColor(category),
      order: category.order ?? 0,
      isActive: category.isActive !== false,
      issueCount: category.metadata?.issueCount ?? 0,
    };
  },

  sortByOrder: (categories = []) => {
    return [...(categories || [])].sort(
      (a, b) => (a.order || 0) - (b.order || 0),
    );
  },

  groupByStatus: (categories = []) => {
    return {
      active: (categories || []).filter((cat) => cat.isActive !== false),
      inactive: (categories || []).filter((cat) => cat.isActive === false),
    };
  },

  getCategoryOptions: (categories = []) => {
    return (categories || []).map((cat) => ({
      value: cat._id ?? cat.id,
      label: cat.displayName ?? cat.name,
      icon: cat.icon,
      color: cat.color,
    }));
  },

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  getCachedCategories: () => {
    try {
      const cached = sessionStorage.getItem('categories_cache');
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      if (!parsed || !parsed.timestamp || !parsed.data) return null;
      // Cache validity: 5 minutes
      if (Date.now() - parsed.timestamp < 300000) {
        return parsed.data;
      }
      return null;
    } catch (error) {
      console.warn('Get cached categories error:', error);
      return null;
    }
  },

  setCachedCategories: (categories) => {
    try {
      const payload = { data: categories, timestamp: Date.now() };
      sessionStorage.setItem('categories_cache', JSON.stringify(payload));
    } catch (error) {
      console.error('Cache categories error:', error);
    }
  },

  clearCache: () => {
    try {
      sessionStorage.removeItem('categories_cache');
    } catch (error) {
      console.warn('Clear cache error:', error);
    }
  },

  // ============================================
  // EXPORT & IMPORT (files)
  // ============================================

  exportCategories: async (categoryIds = null) => {
    try {
      const endpoint = '/categories/export';
      const response = await api.post(
        endpoint,
        { categoryIds },
        { responseType: 'blob' },
      );
      // return blob (caller should handle download)
      return response.data;
    } catch (error) {
      console.error('Export categories error:', error);
      throw error;
    }
  },

  importCategories: async (file) => {
    try {
      const endpoint = '/categories/import';
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const extracted = extractResponse(response);
      return {
        data: extracted.data,
        success: extracted.success,
        message: extracted.message,
      };
    } catch (error) {
      console.error('Import categories error:', error);
      throw error;
    }
  },
};

export default categoryService;
