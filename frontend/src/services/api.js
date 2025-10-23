import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Set to true if using cookies
});

// Request interceptor - Add auth token to all requests
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData (multipart/form-data)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `📤 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
        {
          params: config.params,
          data: config.data instanceof FormData ? '[FormData]' : config.data,
        },
      );
    }

    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  },
);

// Response interceptor - Handle responses and errors
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `📥 ${response.config.method?.toUpperCase()} ${response.config.url}`,
        {
          status: response.status,
          data: response.data,
          dataStructure: {
            hasData: !!response.data.data,
            hasPagination: !!response.data.pagination,
            dataType: Array.isArray(response.data.data)
              ? 'array'
              : typeof response.data.data,
          },
        },
      );
    }

    return response;
  },
  async (error) => {
    // const originalRequest = error.config; // Kept in case you add token refresh logic

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Response Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
    }

    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      switch (status) {
        case 400:
          // Bad Request
          error.message =
            data?.message || 'Invalid request. Please check your input.';
          break;

        case 401:
          // Unauthorized - Token expired or invalid
          // --- START FIX ---
          // Let the AuthContext or service handle the 401 logic (like logout).
          // We just format the message based on the code from the backend (auth.js).
          if (data?.code === 'TOKEN_EXPIRED') {
            error.message = 'Session expired. Please login again.';
          } else if (data?.code === 'TOKEN_INVALID') {
            error.message = 'Invalid token. Please login again.';
          } else {
            error.message = data?.message || 'Authentication failed.';
          }
          // --- END FIX ---
          break;

        case 403:
          // Forbidden - No permission
          error.message =
            data?.message ||
            'You do not have permission to perform this action.';
          break;

        case 404:
          // Not Found
          error.message = data?.message || 'Requested resource not found.';
          break;

        case 409:
          // Conflict
          error.message =
            data?.message ||
            'A conflict occurred. The resource may already exist.';
          break;

        case 422:
          // Validation Error
          error.message =
            data?.message || 'Validation failed. Please check your input.';
          error.errors = data?.errors; // Attach validation errors
          break;

        case 429:
          // Too Many Requests - Rate Limiting
          error.message =
            'Too many requests. Please slow down and try again later.';
          break;

        case 500:
          // Internal Server Error
          error.message = 'Server error. Please try again later.';
          break;

        case 502:
          // Bad Gateway
          error.message =
            'Server is temporarily unavailable. Please try again later.';
          break;

        case 503:
          // Service Unavailable
          error.message =
            'Service is temporarily unavailable. Please try again later.';
          break;

        default:
          error.message =
            data?.message || `Request failed with status ${status}`;
      }
    } else if (error.request) {
      // Request made but no response received
      if (error.code === 'ECONNABORTED') {
        error.message =
          'Request timeout. Please check your connection and try again.';
      } else if (
        error.code === 'ERR_NETWORK' ||
        error.message === 'Network Error'
      ) {
        error.message =
          'Cannot connect to server. Please check if the backend is running at ' +
          api.defaults.baseURL;
      } else {
        error.message =
          'No response from server. Please check your connection.';
      }
    } else {
      // Something else happened
      error.message = error.message || 'An unexpected error occurred.';
    }

    return Promise.reject(error);
  },
);

// Helper function to handle file uploads with progress
export const uploadFile = (
  url,
  formData,
  onUploadProgress,
  method = 'POST',
) => {
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  };

  if (onUploadProgress) {
    config.onUploadProgress = (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total,
      );
      onUploadProgress(percentCompleted);
    };
  }

  if (method.toUpperCase() === 'PUT') {
    return api.put(url, formData, config);
  } else if (method.toUpperCase() === 'PATCH') {
    return api.patch(url, formData, config);
  }
  return api.post(url, formData, config);
};

// Helper function to download files
export const downloadFile = async (url, filename) => {
  try {
    const response = await api.get(url, {
      responseType: 'blob',
    });

    // Create blob link to download
    const blob = new Blob([response.data]);
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename || 'download';
    link.click();

    // Clean up
    window.URL.revokeObjectURL(link.href);

    return true;
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};

// Helper function to check API health
export const checkHealth = async () => {
  try {
    const baseUrl = api.defaults.baseURL.replace('/api', '');
    const response = await axios.get(`${baseUrl}/health`, { timeout: 5000 });
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    return null;
  }
};

// Helper to get error message from error object
export const getErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Helper to get validation errors
export const getValidationErrors = (error) => {
  if (error.response?.data?.errors) {
    return error.response.data.errors;
  }
  if (error.errors) {
    return error.errors;
  }
  return null;
};

// Helper to check if error is network error
export const isNetworkError = (error) => {
  return !error.response && error.request;
};

// Helper to check if error is authentication error
export const isAuthError = (error) => {
  return error.response?.status === 401;
};

// Helper to check if error is authorization error
export const isAuthorizationError = (error) => {
  return error.response?.status === 403;
};

// Helper to check if error is validation error
export const isValidationError = (error) => {
  return error.response?.status === 422 || error.response?.status === 400;
};

// Helper to check if error is server error
export const isServerError = (error) => {
  return error.response?.status >= 500;
};

// Helper to retry failed requests
export const retryRequest = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && isNetworkError(error)) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryRequest(fn, retries - 1, delay * 2); // Exponential backoff
    }
    throw error;
  }
};

// Helper to batch requests
export const batchRequests = async (requests, batchSize = 5) => {
  const results = [];
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch);
    results.push(...batchResults);
  }
  return results;
};

// Helper to cancel requests
export const createCancelToken = () => {
  return axios.CancelToken.source();
};

// Helper to check if request was cancelled
export const isCancel = (error) => {
  return axios.isCancel(error);
};

export default api;
