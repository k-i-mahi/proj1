import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './RoleBasedRoute.css';

const RoleBasedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading state
  if (loading) {
    return (
      <div className="role-route-loading">
        <div className="loading-spinner"></div>
        <p>Verifying access...</p>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // No roles specified - allow all authenticated users
  if (allowedRoles.length === 0) {
    return children;
  }

  // Check if user's role is allowed
  if (!allowedRoles.includes(user?.role)) {
    return (
      <div className="role-access-denied">
        <div className="access-denied-content">
          <div className="access-icon">🚫</div>
          <h1 className="access-title">Access Denied</h1>
          <p className="access-message">
            You don't have permission to access this page.
          </p>

          <div className="role-info">
            <div className="role-info-item">
              <span className="role-label">Required Role(s):</span>
              <div className="role-badges">
                {allowedRoles.map((role) => (
                  <span key={role} className="role-badge required">
                    {role}
                  </span>
                ))}
              </div>
            </div>

            <div className="role-info-item">
              <span className="role-label">Your Role:</span>
              <span className="role-badge current">{user?.role || 'None'}</span>
            </div>
          </div>

          <div className="access-actions">
            <button
              onClick={() => window.history.back()}
              className="btn btn-secondary"
            >
              ← Go Back
            </button>
            <button
              onClick={() => (window.location.href = '/dashboard')}
              className="btn btn-primary"
            >
              Dashboard →
            </button>
          </div>

          <p className="access-help">
            Need access? Contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default RoleBasedRoute;
