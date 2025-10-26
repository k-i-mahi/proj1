import api from './api';
import { API_ENDPOINTS } from '../config/api.config';

const authService = {
  // ============================================
  // AUTHENTICATION
  // ============================================

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise}
   */
  register: async (userData) => {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.REGISTER, userData);

      // Store token and user if registration includes auto-login
      if (response.data.success && response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data));
      }

      return {
        success: response.data.success,
        token: response.data.token,
        user: response.data.data,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },

  /**
   * Login user
   * @param {Object} credentials - Email and password
   * @returns {Promise}
   */
  login: async (credentials) => {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, {
        email: credentials.email,
        password: credentials.password,
      });

      // Store token and user data
      if (response.data.success && response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data));
      }

      const normalized = {
        success: response.data.success,
        token: response.data.token,
        user: response.data.data,
        message: response.data.message,
      };

      return normalized;
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('❌ Error response:', error.response?.data);
      throw error;
    }
  },

  /**
   * Logout user
   * @returns {Promise}
   */
  logout: async () => {
    try {
      // Call logout endpoint if it exists
      await api.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage
      authService.clearAuth();
    }
  },

  /**
   * Get current user profile
   * @returns {Promise}
   */
  getCurrentUser: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.AUTH.ME);

      // Update stored user data
      if (response.data.success && response.data.data) {
        localStorage.setItem('user', JSON.stringify(response.data.data));
      }

      return {
        success: response.data.success,
        user: response.data.data,
      };
    } catch (error) {
      console.error('Get current user error:', error);

      // Clear invalid token
      if (error.response?.status === 401) {
        authService.clearAuth();
      }

      throw error;
    }
  },

  /**
   * Refresh authentication token
   * @returns {Promise}
   */
  refreshToken: async () => {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.REFRESH);

      if (response.data.success && response.data.token) {
        localStorage.setItem('token', response.data.token);
      }

      return response.data;
    } catch (error) {
      console.error('Refresh token error:', error);
      authService.clearAuth();
      throw error;
    }
  },

  // ============================================
  // PROFILE MANAGEMENT
  // ============================================

  /**
   * Update user profile
   * @param {Object} userData - Updated user data
   * @returns {Promise}
   */
  updateProfile: async (userData) => {
    try {
      const response = await api.put(
        API_ENDPOINTS.AUTH.UPDATE_PROFILE,
        userData,
      );

      // Update stored user data
      if (response.data.success && response.data.data) {
        localStorage.setItem('user', JSON.stringify(response.data.data));
      }

      return {
        success: response.data.success,
        user: response.data.data,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  /**
   * Upload profile avatar
   * @param {File} file - Avatar image file
   * @returns {Promise}
   */
  uploadAvatar: async (file) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.post(
        API_ENDPOINTS.AUTH.UPLOAD_AVATAR,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );

      // Update stored user data
      if (response.data.success && response.data.data) {
        localStorage.setItem('user', JSON.stringify(response.data.data));
      }

      return {
        success: response.data.success,
        user: response.data.data,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Upload avatar error:', error);
      throw error;
    }
  },

  /**
   * Delete profile avatar
   * @returns {Promise}
   */
  deleteAvatar: async () => {
    try {
      const response = await api.delete(API_ENDPOINTS.AUTH.DELETE_AVATAR);

      // Update stored user data
      if (response.data.success && response.data.data) {
        localStorage.setItem('user', JSON.stringify(response.data.data));
      }

      return {
        success: response.data.success,
        user: response.data.data,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Delete avatar error:', error);
      throw error;
    }
  },

  // ============================================
  // PASSWORD MANAGEMENT
  // ============================================

  /**
   * Change password
   * @param {Object} passwords - Current and new password
   * @returns {Promise}
   */
  changePassword: async (passwords) => {
    try {
      const response = await api.put(
        API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
        passwords,
      );
      return response.data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },

  /**
   * Forgot password - Request reset
   * @param {string} email - User email
   * @param {string} username - User username
   * @returns {Promise}
   */
  forgotPassword: async (email, username) => {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        email,
        username,
      });
      return response.data;
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  },

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} password - New password
   * @returns {Promise}
   */
  resetPassword: async (token, password) => {
    try {
      const response = await api.post(
        `${API_ENDPOINTS.AUTH.RESET_PASSWORD}/${token}`,
        {
          password,
        },
      );
      return response.data;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  },

  /**
   * Validate reset token
   * @param {string} token - Reset token
   * @returns {Promise}
   */
  validateResetToken: async (token) => {
    try {
      const response = await api.get(
        `${API_ENDPOINTS.AUTH.RESET_PASSWORD}/validate/${token}`,
      );
      return response.data;
    } catch (error) {
      console.error('Validate reset token error:', error);
      throw error;
    }
  },

  // ============================================
  // EMAIL VERIFICATION
  // ============================================

  /**
   * Verify email with token
   * @param {string} token - Verification token
   * @returns {Promise}
   */
  verifyEmail: async (token) => {
    try {
      const response = await api.get(
        `${API_ENDPOINTS.AUTH.VERIFY_EMAIL}/${token}`,
      );

      // Update user if verification includes login
      if (response.data.success && response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data));
      }

      return response.data;
    } catch (error) {
      console.error('Verify email error:', error);
      throw error;
    }
  },

  /**
   * Resend verification email
   * @returns {Promise}
   */
  resendVerification: async () => {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.RESEND_VERIFICATION);
      return response.data;
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  },

  // ============================================
  // USER STATISTICS
  // ============================================

  /**
   * Get user statistics
   * @returns {Promise}
   */
  getUserStats: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.AUTH.STATS);
      // Return the data property which contains the stats object
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Get user stats error:', error);
      throw error;
    }
  },

  /**
   * Get user activity summary
   * @returns {Promise}
   */
  getActivitySummary: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.AUTH.ACTIVITY_SUMMARY);
      return response.data;
    } catch (error) {
      console.error('Get activity summary error:', error);
      throw error;
    }
  },

  // ============================================
  // ACCOUNT MANAGEMENT
  // ============================================

  /**
   * Delete account
   * @param {string} password - Current password for confirmation
   * @returns {Promise}
   */
  deleteAccount: async (password) => {
    try {
      const response = await api.delete(API_ENDPOINTS.AUTH.DELETE_ACCOUNT, {
        data: { password },
      });

      // Clear auth data after deletion
      authService.clearAuth();

      return response.data;
    } catch (error) {
      console.error('Delete account error:', error);
      throw error;
    }
  },

  /**
   * Deactivate account
   * @returns {Promise}
   */
  deactivateAccount: async () => {
    try {
      const response = await api.patch(API_ENDPOINTS.AUTH.DEACTIVATE);

      // Logout after deactivation
      authService.clearAuth();

      return response.data;
    } catch (error) {
      console.error('Deactivate account error:', error);
      throw error;
    }
  },

  /**
   * Reactivate account
   * @param {Object} credentials - Email and password
   * @returns {Promise}
   */
  reactivateAccount: async (credentials) => {
    try {
      const response = await api.post(
        API_ENDPOINTS.AUTH.REACTIVATE,
        credentials,
      );

      // Login after reactivation
      if (response.data.success && response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data));
      }

      return response.data;
    } catch (error) {
      console.error('Reactivate account error:', error);
      throw error;
    }
  },

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  /**
   * Get active sessions
   * @returns {Promise}
   */
  getSessions: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.AUTH.SESSIONS);
      return response.data;
    } catch (error) {
      console.error('Get sessions error:', error);
      throw error;
    }
  },

  /**
   * Revoke specific session
   * @param {string} sessionId - Session ID to revoke
   * @returns {Promise}
   */
  revokeSession: async (sessionId) => {
    try {
      const response = await api.delete(
        `${API_ENDPOINTS.AUTH.SESSIONS}/${sessionId}`,
      );
      return response.data;
    } catch (error) {
      console.error('Revoke session error:', error);
      throw error;
    }
  },

  /**
   * Revoke all other sessions
   * @returns {Promise}
   */
  revokeAllSessions: async () => {
    try {
      const response = await api.delete(`${API_ENDPOINTS.AUTH.SESSIONS}/all`);
      return response.data;
    } catch (error) {
      console.error('Revoke all sessions error:', error);
      throw error;
    }
  },

  // ============================================
  // TWO-FACTOR AUTHENTICATION
  // ============================================

  /**
   * Enable 2FA
   * @returns {Promise}
   */
  enable2FA: async () => {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.TWO_FA_ENABLE);
      return response.data;
    } catch (error) {
      console.error('Enable 2FA error:', error);
      throw error;
    }
  },

  /**
   * Verify 2FA code
   * @param {string} code - 2FA code
   * @returns {Promise}
   */
  verify2FA: async (code) => {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.TWO_FA_VERIFY, {
        code,
      });
      return response.data;
    } catch (error) {
      console.error('Verify 2FA error:', error);
      throw error;
    }
  },

  /**
   * Disable 2FA
   * @param {string} password - Current password
   * @returns {Promise}
   */
  disable2FA: async (password) => {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.TWO_FA_DISABLE, {
        password,
      });
      return response.data;
    } catch (error) {
      console.error('Disable 2FA error:', error);
      throw error;
    }
  },

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },

  /**
   * Get stored token
   * @returns {string|null}
   */
  getToken: () => {
    return localStorage.getItem('token');
  },

  /**
   * Get stored user
   * @returns {Object|null}
   */
  getStoredUser: () => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Parse user error:', error);
      return null;
    }
  },

  /**
   * Update stored user
   * @param {Object} user - User object
   */
  updateStoredUser: (user) => {
    try {
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Update stored user error:', error);
    }
  },

  /**
   * Clear authentication data
   */
  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();

    // Clear any cached API responses
    if (window.caches) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }
  },

  /**
   * Force re-authentication (cleanup and redirect)
   */
  forceReauth: () => {
    authService.clearAuth();
    window.location.href = '/login';
  },

  /**
   * Check if user has role
   * @param {string|Array} roles - Role or array of roles
   * @returns {boolean}
   */
  hasRole: (roles) => {
    const user = authService.getStoredUser();
    if (!user || !user.role) return false;

    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  },

  /**
   * Check if user is admin
   * @returns {boolean}
   */
  isAdmin: () => {
    return authService.hasRole('admin');
  },

  /**
   * Check if user is authority
   * @returns {boolean}
   */
  isAuthority: () => {
    return authService.hasRole(['admin', 'authority']);
  },

  /**
   * Get user role
   * @returns {string|null}
   */
  getUserRole: () => {
    const user = authService.getStoredUser();
    return user?.role || null;
  },

  /**
   * Get user ID
   * @returns {string|null}
   */
  getUserId: () => {
    const user = authService.getStoredUser();
    return user?._id || null;
  },

  /**
   * Check if email is verified
   * @returns {boolean}
   */
  isEmailVerified: () => {
    const user = authService.getStoredUser();
    return user?.isEmailVerified || false;
  },

  /**
   * Check if account is active
   * @returns {boolean}
   */
  isAccountActive: () => {
    const user = authService.getStoredUser();
    return user?.isActive !== false;
  },

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object}
   */
  validatePassword: (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const strength = [
      password.length >= minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
    ].filter(Boolean).length;

    return {
      isValid: strength >= 3 && password.length >= minLength,
      strength: strength === 5 ? 'strong' : strength >= 3 ? 'medium' : 'weak',
      checks: {
        minLength: password.length >= minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar,
      },
    };
  },

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean}
   */
  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
};

export default authService;
