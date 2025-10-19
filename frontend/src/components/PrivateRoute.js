import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './PrivateRoute.css';

/**
 * PrivateRoute - Handles authentication and role-based access
 * @param {React.ReactNode} children - Components to render
 * @param {string[]} roles - Array of allowed roles (optional)
 */
const PrivateRoute = ({ children, roles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Loading state
  if (loading) {
    return (
      <div className="route-loading">
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if account is active
  if (user && !user.isActive) {
    return (
      <div className="access-denied">
        <div className="access-denied-container">
          <div className="access-denied-icon">⚠️</div>
          <h2 className="access-denied-title">Account Inactive</h2>
          <p className="access-denied-message">
            Your account has been deactivated. Please contact support.
          </p>
          <div className="access-denied-actions">
            <button
              className="btn btn-primary"
              onClick={() => (window.location.href = '/support')}
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check role-based access
  if (roles.length > 0 && !roles.includes(user?.role)) {
    return (
      <div className="access-denied">
        <div className="access-denied-container">
          <div className="access-denied-icon">🚫</div>
          <h2 className="access-denied-title">Access Denied</h2>
          <p className="access-denied-message">
            You don't have permission to access this page.
          </p>

          <div className="role-info-box">
            <div className="role-info-row">
              <span className="role-label">Required:</span>
              <div className="role-badges">
                {roles.map((role) => (
                  <span key={role} className="role-badge required">
                    {role}
                  </span>
                ))}
              </div>
            </div>

            <div className="role-info-row">
              <span className="role-label">Your Role:</span>
              <span className="role-badge current">{user?.role}</span>
            </div>
          </div>

          <div className="access-denied-actions">
            <button
              className="btn btn-secondary"
              onClick={() => window.history.back()}
            >
              ← Go Back
            </button>
            <button
              className="btn btn-primary"
              onClick={() => (window.location.href = '/dashboard')}
            >
              Dashboard →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // All checks passed
  return children;
};

export default PrivateRoute;
