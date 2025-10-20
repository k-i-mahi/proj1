const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login', // Ensure this matches the backend route
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    REFRESH: '/auth/refresh',
    UPDATE_PROFILE: '/auth/updateprofile',
    CHANGE_PASSWORD: '/auth/updatepassword',
    FORGOT_PASSWORD: '/auth/forgotpassword',
    RESET_PASSWORD: '/auth/resetpassword',
    VERIFY_EMAIL: '/auth/verifyemail',
    RESEND_VERIFICATION: '/auth/resend-verification',
    UPLOAD_AVATAR: '/auth/avatar',
    DELETE_AVATAR: '/auth/avatar',
    DELETE_ACCOUNT: '/auth/account',
    DEACTIVATE: '/auth/deactivate',
    REACTIVATE: '/auth/reactivate',
    SESSIONS: '/auth/sessions',
    TWO_FA_ENABLE: '/auth/2fa/enable',
    TWO_FA_VERIFY: '/auth/2fa/verify',
    TWO_FA_DISABLE: '/auth/2fa/disable',
    STATS: '/auth/stats',
    ACTIVITY_SUMMARY: '/auth/activity-summary',
  },

  // Users
  USERS: {
    LIST: '/users',
    DETAIL: (id) => `/users/${id}`,
    UPDATE: (id) => `/users/${id}`,
    DELETE: (id) => `/users/${id}`,
    // --- START FIX ---
    STATS: (id) => `/users/${id}/stats`, // Was: '/users/stats'
    NEARBY: '/users/nearby', // Added
    // --- END FIX ---
    TOGGLE_STATUS: (id) => `/users/${id}/toggle-status`,
    BULK_UPDATE: '/users/bulk-update',
    EXPORT: '/users/export',
  },

  // Issues
  ISSUES: {
    LIST: '/issues',
    DETAIL: (id) => `/issues/${id}`,
    CREATE: '/issues',
    UPDATE: (id) => `/issues/${id}`,
    DELETE: (id) => `/issues/${id}`,
    MY_ISSUES: '/issues/my-issues',
    NEARBY: '/issues/nearby',
    TRENDING: '/issues/trending',
    RECENT: '/issues/recent',
    FOLLOWED: '/issues/followed',
    ASSIGN: (id) => `/issues/${id}/assign`,
    STATUS: (id) => `/issues/${id}/status`,
    PRIORITY: (id) => `/issues/${id}/priority`,
    IMAGES: (id) => `/issues/${id}/images`,
    DELETE_IMAGE: (id, imageId) => `/issues/${id}/images/${imageId}`,
    COMMENTS: (id) => `/issues/${id}/comments`,
    COMMENT_DETAIL: (issueId, commentId) =>
      `/issues/${issueId}/comments/${commentId}`,
    VOTE: (id) => `/issues/${id}/vote`,
    REMOVE_VOTE: (id) => `/issues/${id}/vote`,
    FOLLOW: (id) => `/issues/${id}/follow`,
    REPORT: (id) => `/issues/${id}/report`,
    STATS: '/issues/stats',
    EXPORT_CSV: '/issues/export/csv',
    BULK_UPDATE: '/issues/bulk-update',
    BULK_DELETE: '/issues/bulk-delete',
  },

  // Categories
  CATEGORIES: {
    LIST: '/categories',
    DETAIL: (id) => `/categories/${id}`,
    CREATE: '/categories',
    UPDATE: (id) => `/categories/${id}`,
    DELETE: (id) => `/categories/${id}`,
    TOGGLE_STATUS: (id) => `/categories/${id}/toggle`,
    STATS: '/categories/stats',
    CATEGORY_STATS: (id) => `/categories/${id}/stats`,
    REORDER: '/categories/reorder',
    BULK_CREATE: '/categories/bulk-create',
    BULK_UPDATE: '/categories/bulk-update',
    BULK_DELETE: '/categories/bulk-delete',
    EXPORT: '/categories/export',
    IMPORT: '/categories/import',
  },

  // Interactions
  INTERACTIONS: {
    // Comments
    COMMENTS: (issueId) => `/interactions/issues/${issueId}/comments`,
    COMMENT_DETAIL: (issueId, commentId) =>
      `/interactions/issues/${issueId}/comments/${commentId}`,
    COMMENT_COUNT: (issueId) =>
      `/interactions/issues/${issueId}/comments/count`,

    // Voting
    VOTE: (issueId) => `/interactions/issues/${issueId}/vote`,
    VOTE_STATUS: (issueId) => `/interactions/issues/${issueId}/vote/status`,

    // Following
    FOLLOW: (issueId) => `/interactions/issues/${issueId}/follow`,
    FOLLOW_STATUS: (issueId) => `/interactions/issues/${issueId}/follow/status`,
    FOLLOWED_ISSUES: '/interactions/followed-issues',
    FOLLOWER_COUNT: (issueId) =>
      `/interactions/issues/${issueId}/followers/count`,
    FOLLOWERS: (issueId) => `/interactions/issues/${issueId}/followers`,

    // Summary
    ISSUE_INTERACTIONS: (issueId) => `/interactions/issues/${issueId}/all`,
    USER_STATS: (userId) => `/interactions/users/${userId}/stats`,

    // Likes
    LIKE_COMMENT: (commentId) => `/interactions/comments/${commentId}/like`,

    // Mentions
    MENTIONS: '/interactions/mentions',
    MARK_MENTION_READ: (mentionId) =>
      `/interactions/mentions/${mentionId}/read`,
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    DETAIL: (id) => `/notifications/${id}`,
    UNREAD: '/notifications/unread',
    COUNT: '/notifications/count',
    UNREAD_COUNT: '/notifications/unread/count',
    MARK_READ: (id) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/mark-all-read',
    DELETE: (id) => `/notifications/${id}`,
    DELETE_ALL: '/notifications/all',
    PREFERENCES: '/notifications/preferences',
  },

  // Activities
  ACTIVITIES: {
    LIST: '/activities',
    ISSUE: (issueId) => `/activities/issues/${issueId}`,
    USER: (userId) => `/activities/users/${userId}`,
    STATS: '/activities/stats',
    EXPORT_CSV: '/activities/export/csv',
  },

  // Location
  LOCATION: {
    GEOCODE: '/location/geocode',
    REVERSE_GEOCODE: '/location/reverse-geocode',
    DISTANCE: '/location/distance',
    NEARBY_ISSUES: '/location/issues/nearby', // ✅ FIXED
    ISSUES_BOUNDS: '/location/issues/bounds', // ✅ FIXED
    HEATMAP: '/location/heatmap', // ✅ FIXED
    STATS: '/location/stats', // ✅ FIXED
    // --- START FIX ---
    // NEARBY_USERS: '/location/users/nearby', // Removed, (Moved to USERS)
    // --- END FIX ---
    VALIDATE: '/location/validate',
  },

  // Upload
  UPLOAD: {
    IMAGE: '/upload/image',
    IMAGES: '/upload/images',
    FILE: '/upload/file',
    AVATAR: '/upload/avatar',
  },

  // Analytics
  ANALYTICS: {
    DASHBOARD: '/analytics/dashboard',
    ISSUES: '/analytics/issues',
    USERS: '/analytics/users',
    CATEGORIES: '/analytics/categories',
    TRENDS: '/analytics/trends',
    EXPORT: '/analytics/export',
  },
};

// Helper function to build full URL
export const buildApiUrl = (endpoint) => {
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  return `${API_BASE_URL}${endpoint}`;
};

// Export default config
const apiConfig = {
  API_BASE_URL,
  API_ENDPOINTS,
};

// Export as default
export default apiConfig;
