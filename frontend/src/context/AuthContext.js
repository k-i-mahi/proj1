import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // Logout user - defined early to avoid dependency issues
  const logout = useCallback(async () => {
    try {
      // Optional: Call logout endpoint
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear local state
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
    }
  }, []);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');

      if (token) {
        try {
          // Verify token and get user
          const response = await authService.getCurrentUser();
          setUser(response.user);
          setIsAuthenticated(true);
        } catch (err) {
          console.error('Auth initialization error:', err);
          // Token invalid or expired - clear everything
          // This logic is now correctly handled here instead of the interceptor
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          setIsAuthenticated(false);
        }
      }

      setLoading(false);
      setInitialized(true);
    };

    initAuth();
  }, []);

  // Register new user
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.register(userData);
      const { token, user } = response;

      // Store token
      localStorage.setItem('token', token);

      // Update state
      setUser(user);
      setIsAuthenticated(true);

      return { success: true, user };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.login({ email, password });
      const { token, user } = response;

      // Store token
      localStorage.setItem('token', token);

      // Update state
      setUser(user);
      setIsAuthenticated(true);

      return { success: true, user };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed';
      setError(errorMessage); // Properly set the error message
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateUser = async (updates) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.updateProfile(updates);

      setUser(response.user);

      return { success: true, user: response.user };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Update failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Get current user (refresh user data)
  const getCurrentUser = useCallback(async () => {
    try {
      const response = await authService.getCurrentUser();
      setUser(response.user);
      return response.user;
    } catch (err) {
      console.error('Get current user error:', err);
      // Token might be expired
      await logout();
      throw err;
    }
  }, [logout]);

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setLoading(true);
      setError(null);

      await authService.changePassword({ currentPassword, newPassword });

      return { success: true };
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Password change failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Refresh token
  const refreshToken = useCallback(async () => {
    try {
      const response = await authService.refreshToken();
      const { token } = response;

      if (token) {
        localStorage.setItem('token', token);
        return { success: true };
      }
    } catch (err) {
      console.error('Token refresh error:', err);
      await logout();
      throw err;
    }
  }, [logout]);

  // Check if user has role
  const hasRole = useCallback(
    (roles) => {
      if (!user) return false;
      if (typeof roles === 'string') {
        return user.role === roles;
      }
      return roles.includes(user.role);
    },
    [user],
  );

  // Check if user is admin
  const isAdmin = useCallback(() => {
    return user?.role === 'admin';
  }, [user]);

  // Check if user is authority
  const isAuthority = useCallback(() => {
    return user?.role === 'authority' || user?.role === 'admin';
  }, [user]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get user statistics
  const getUserStats = async () => {
    try {
      // --- START FIX ---
      // authService.getUserStats() now returns the stats object directly
      const stats = await authService.getUserStats();
      return stats;
      // --- END FIX ---
    } catch (err) {
      console.error('Get user stats error:', err);
      throw err;
    }
  };

  const value = {
    // State
    user,
    isAuthenticated,
    loading,
    error,
    initialized,

    // Auth methods
    register,
    login,
    logout,
    updateUser,
    getCurrentUser,
    changePassword,
    refreshToken,

    // Utility methods
    hasRole,
    isAdmin,
    isAuthority,
    clearError,
    getUserStats,
  };

  // Show loading only on initial load
  if (!initialized) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              border: '5px solid #e5e7eb',
              borderTopColor: '#667eea',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }}
          ></div>
          <p style={{ fontSize: '18px', fontWeight: '600', color: '#4b5563' }}>
            Loading...
          </p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
