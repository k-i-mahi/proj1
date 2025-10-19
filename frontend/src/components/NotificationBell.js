import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import Avatar from './Avatar';
import './NotificationBell.css';

const NotificationBell = () => {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    fetchNotifications,
  } = useNotification();

  const [showDropdown, setShowDropdown] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);

  useEffect(() => {
    if (showDropdown && notifications.length === 0) {
      fetchNotifications({ page: 1, limit: 5 });
    }
  }, [showDropdown, notifications.length, fetchNotifications]);

  useEffect(() => {
    setRecentNotifications(notifications.slice(0, 5));
  }, [notifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await markAsRead(notification._id);
      } catch (error) {
        console.error('Mark as read error:', error);
      }
    }

    setShowDropdown(false);

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleViewAll = () => {
    setShowDropdown(false);
    navigate('/notifications');
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    const icons = {
      issue_created: '🆕',
      issue_assigned: '📌',
      status_changed: '🔄',
      new_comment: '💬',
      mentioned: '@',
      issue_resolved: '✅',
      upvote_received: '👍',
      follower_update: '⭐',
    };
    return icons[type] || '🔔';
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        className="notification-bell-btn"
        onClick={() => setShowDropdown(!showDropdown)}
        aria-label="Notifications"
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="dropdown-header">
            <h3 className="dropdown-title">Notifications</h3>
            {unreadCount > 0 && (
              <span className="unread-count">{unreadCount} new</span>
            )}
          </div>

          {loading ? (
            <div className="dropdown-loading">
              <div className="spinner-small"></div>
              <span>Loading...</span>
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="dropdown-empty">
              <div className="empty-icon">🔔</div>
              <p className="empty-text">No notifications yet</p>
            </div>
          ) : (
            <>
              <div className="notifications-dropdown-list">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`notification-dropdown-item ${
                      !notification.isRead ? 'unread' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-dropdown-icon">
                      {notification.icon ||
                        getNotificationIcon(notification.type)}
                    </div>

                    <div className="notification-dropdown-content">
                      <div className="notification-dropdown-header">
                        <p className="notification-dropdown-title">
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="unread-indicator"></span>
                        )}
                      </div>

                      <p className="notification-dropdown-message">
                        {notification.message}
                      </p>

                      <div className="notification-dropdown-footer">
                        {notification.sender && (
                          <div className="notification-dropdown-sender">
                            <Avatar
                              src={notification.sender.avatar}
                              name={notification.sender.name}
                              size="small"
                            />
                            <span>{notification.sender.name}</span>
                          </div>
                        )}
                        <span className="notification-dropdown-time">
                          {getTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="dropdown-footer">
                <button className="view-all-btn" onClick={handleViewAll}>
                  View All Notifications
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
