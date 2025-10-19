import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import Avatar from './Avatar';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef(null);

  // Handle scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Close mobile menu on route change
  useEffect(() => {
    setShowMobileMenu(false);
    setShowUserMenu(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">🏙️</span>
          <span className="logo-text">Civita</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="navbar-menu desktop-menu">
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
            <span className="nav-icon">🏠</span>
            <span>Home</span>
          </Link>

          <Link
            to="/issues"
            className={`nav-link ${isActive('/issues') ? 'active' : ''}`}
          >
            <span className="nav-icon">📋</span>
            <span>Issues</span>
          </Link>

          <Link
            to="/map"
            className={`nav-link ${isActive('/map') ? 'active' : ''}`}
          >
            <span className="nav-icon">🗺️</span>
            <span>Map</span>
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
              >
                <span className="nav-icon">📊</span>
                <span>Dashboard</span>
              </Link>

              {/* Analytics (Authority & Admin only) */}
              {(user?.role === 'authority' || user?.role === 'admin') && (
                <Link
                  to="/analytics"
                  className={`nav-link ${
                    isActive('/analytics') ? 'active' : ''
                  }`}
                >
                  <span className="nav-icon">📈</span>
                  <span>Analytics</span>
                </Link>
              )}

              {/* Categories (Admin only) */}
              {user?.role === 'admin' && (
                <Link
                  to="/categories"
                  className={`nav-link ${
                    isActive('/categories') ? 'active' : ''
                  }`}
                >
                  <span className="nav-icon">📁</span>
                  <span>Categories</span>
                </Link>
              )}
            </>
          ) : (
            <Link
              to="/about"
              className={`nav-link ${isActive('/about') ? 'active' : ''}`}
            >
              <span className="nav-icon">ℹ️</span>
              <span>About</span>
            </Link>
          )}
        </div>

        {/* Right Side */}
        <div className="navbar-actions">
          {isAuthenticated ? (
            <>
              {/* Notification Bell */}
              <NotificationBell />

              {/* User Menu - FIXED */}
              <div className="user-menu-container" ref={userMenuRef}>
                <button
                  className="user-menu-trigger"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-label="User menu"
                  aria-expanded={showUserMenu}
                >
                  <Avatar
                    src={user?.avatar}
                    name={user?.name}
                    size="medium"
                  />
                  <span className="user-name hide-mobile">{user?.name}</span>
                  <span className={`chevron ${showUserMenu ? 'open' : ''}`}>▼</span>
                </button>

                {showUserMenu && (
                  <div className="user-menu-dropdown">
                    <div className="user-menu-header">
                      <div className="user-info">
                        <div className="user-name-large">{user?.name}</div>
                        <div className="user-email">{user?.email}</div>
                        <div className="role-badge">
                          {user?.role === 'admin' && '👑 Admin'}
                          {user?.role === 'authority' && '⚡ Authority'}
                          {user?.role === 'resident' && '👤 Resident'}
                        </div>
                      </div>
                    </div>

                    <div className="user-menu-divider" />

                    <Link to="/dashboard" className="user-menu-item">
                      <span className="menu-icon">📊</span>
                      <span>Dashboard</span>
                    </Link>

                    <Link to="/profile" className="user-menu-item">
                      <span className="menu-icon">👤</span>
                      <span>My Profile</span>
                    </Link>

                    <Link to="/notifications" className="user-menu-item">
                      <span className="menu-icon">🔔</span>
                      <span>Notifications</span>
                    </Link>

                    <Link to="/issues?reportedBy=me" className="user-menu-item">
                      <span className="menu-icon">📝</span>
                      <span>My Issues</span>
                    </Link>

                    {user?.role === 'admin' && (
                      <>
                        <div className="user-menu-divider" />
                        <div className="dropdown-section-title">Admin</div>
                        <Link to="/categories" className="user-menu-item">
                          <span className="menu-icon">📁</span>
                          <span>Manage Categories</span>
                        </Link>
                        <Link to="/analytics" className="user-menu-item">
                          <span className="menu-icon">📈</span>
                          <span>Analytics</span>
                        </Link>
                      </>
                    )}

                    {user?.role === 'authority' && (
                      <>
                        <div className="user-menu-divider" />
                        <Link to="/analytics" className="user-menu-item">
                          <span className="menu-icon">📈</span>
                          <span>Analytics</span>
                        </Link>
                      </>
                    )}

                    <div className="user-menu-divider" />

                    <button onClick={handleLogout} className="user-menu-item logout">
                      <span className="menu-icon">🚪</span>
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="btn btn-secondary btn-sm hide-mobile"
              >
                Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Sign Up
              </Link>
            </>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="mobile-menu-toggle"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            aria-label="Toggle menu"
          >
            {showMobileMenu ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="mobile-menu">
          <Link
            to="/"
            className={`mobile-nav-link ${isActive('/') ? 'active' : ''}`}
          >
            <span className="nav-icon">🏠</span>
            <span>Home</span>
          </Link>

          <Link
            to="/issues"
            className={`mobile-nav-link ${isActive('/issues') ? 'active' : ''}`}
          >
            <span className="nav-icon">📋</span>
            <span>Issues</span>
          </Link>

          <Link
            to="/map"
            className={`mobile-nav-link ${isActive('/map') ? 'active' : ''}`}
          >
            <span className="nav-icon">🗺️</span>
            <span>Map</span>
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className={`mobile-nav-link ${
                  isActive('/dashboard') ? 'active' : ''
                }`}
              >
                <span className="nav-icon">📊</span>
                <span>Dashboard</span>
              </Link>

              <Link
                to="/profile"
                className={`mobile-nav-link ${
                  isActive('/profile') ? 'active' : ''
                }`}
              >
                <span className="nav-icon">👤</span>
                <span>Profile</span>
              </Link>

              <Link
                to="/notifications"
                className={`mobile-nav-link ${
                  isActive('/notifications') ? 'active' : ''
                }`}
              >
                <span className="nav-icon">🔔</span>
                <span>Notifications</span>
              </Link>

              {(user?.role === 'authority' || user?.role === 'admin') && (
                <Link
                  to="/analytics"
                  className={`mobile-nav-link ${
                    isActive('/analytics') ? 'active' : ''
                  }`}
                >
                  <span className="nav-icon">📈</span>
                  <span>Analytics</span>
                </Link>
              )}

              {user?.role === 'admin' && (
                <Link
                  to="/categories"
                  className={`mobile-nav-link ${
                    isActive('/categories') ? 'active' : ''
                  }`}
                >
                  <span className="nav-icon">📁</span>
                  <span>Categories</span>
                </Link>
              )}

              <div className="mobile-menu-divider" />

              <button onClick={handleLogout} className="mobile-nav-link logout">
                <span className="nav-icon">🚪</span>
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/about"
                className={`mobile-nav-link ${
                  isActive('/about') ? 'active' : ''
                }`}
              >
                <span className="nav-icon">ℹ️</span>
                <span>About</span>
              </Link>

              <div className="mobile-menu-divider" />

              <Link to="/login" className="mobile-nav-link">
                <span className="nav-icon">🔐</span>
                <span>Login</span>
              </Link>

              <Link to="/register" className="mobile-nav-link highlight">
                <span className="nav-icon">📝</span>
                <span>Sign Up</span>
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
