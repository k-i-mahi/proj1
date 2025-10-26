import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { useToast } from '../context/ToastContext';
import dataService from '../services/dataService';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import Feedback from '../components/Feedback';
import Pagination from '../components/Pagination';
import './Notifications.css';

const Notifications = () => {
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToast();
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearReadNotifications,
  } = useNotification();

  const [filter, setFilter] = useState('all'); // all, unread, read
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    limit: 20,
  });

  const loadNotifications = useCallback(async () => {
    try {
      const params = {
        page,
        limit: 20,
        sortBy: '-createdAt',
      };

      if (filter === 'unread') params.isRead = false;
      if (filter === 'read') params.isRead = true;
      if (typeFilter) params.type = typeFilter;

      const response = await fetchNotifications(params);

      if (response?.pagination) {
        setPagination(response.pagination);
      }
    } catch (error) {
      showError('Failed to load notifications');
    }
  }, [filter, typeFilter, page, fetchNotifications, showError]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await markAsRead(notification._id);
      } catch (error) {
        console.error('Mark as read error:', error);
      }
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      showSuccess('All notifications marked as read');
      loadNotifications();
    } catch (error) {
      showError('Failed to mark all as read');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      showSuccess('Notification deleted');
    } catch (error) {
      showError('Failed to delete notification');
    }
  };

  const handleClearRead = async () => {
    try {
      await clearReadNotifications();
      showSuccess('Read notifications cleared');
      loadNotifications();
    } catch (error) {
      showError('Failed to clear notifications');
    }
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

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="notifications-page">
      <div className="notifications-container">
        {/* Header */}
        <div className="notifications-header">
          <div className="header-content">
            <h1 className="page-title">Notifications</h1>
            <p className="page-subtitle">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${
                    unreadCount > 1 ? 's' : ''
                  }`
                : 'All caught up!'}
            </p>
          </div>

          <div className="header-actions">
            {unreadCount > 0 && (
              <button
                className="btn btn-outline btn-sm"
                onClick={handleMarkAllRead}
              >
                Mark All Read
              </button>
            )}
            <button
              className="btn btn-outline btn-sm"
              onClick={handleClearRead}
            >
              Clear Read
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="notifications-filters">
          <div className="filter-tabs">
            <button
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => {
                setFilter('all');
                setPage(1);
              }}
            >
              All
            </button>
            <button
              className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => {
                setFilter('unread');
                setPage(1);
              }}
            >
              Unread
              {unreadCount > 0 && (
                <span className="filter-badge">{unreadCount}</span>
              )}
            </button>
            <button
              className={`filter-tab ${filter === 'read' ? 'active' : ''}`}
              onClick={() => {
                setFilter('read');
                setPage(1);
              }}
            >
              Read
            </button>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="type-filter"
          >
            <option value="">All Types</option>
            <option value="issue_created">New Issues</option>
            <option value="issue_assigned">Assignments</option>
            <option value="status_changed">Status Changes</option>
            <option value="new_comment">Comments</option>
            <option value="issue_resolved">Resolutions</option>
            <option value="upvote_received">Upvotes</option>
            <option value="follower_update">Updates</option>
          </select>
        </div>

        {/* Notifications List */}
        {loading ? (
          <Feedback type="loading" />
        ) : notifications.length === 0 ? (
          <Feedback
            type="empty"
            title="No Notifications"
            message={
              filter === 'unread'
                ? "You're all caught up! No unread notifications."
                : 'No notifications to display.'
            }
            icon="🔔"
          />
        ) : (
          <>
            <div className="notifications-list">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`notification-item ${
                    !notification.isRead ? 'unread' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {notification.icon ||
                      getNotificationIcon(notification.type)}
                  </div>

                  <div className="notification-content">
                    <div className="notification-header">
                      <h3 className="notification-title">
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <span className="unread-dot"></span>
                      )}
                    </div>

                    <p className="notification-message">
                      {notification.message}
                    </p>

                    <div className="notification-footer">
                      {notification.sender && (
                        <div className="notification-sender">
                          <Avatar
                            src={notification.sender.avatar}
                            name={notification.sender.name}
                            size="small"
                          />
                          <span className="sender-name">
                            {notification.sender.name}
                          </span>
                        </div>
                      )}

                      <span className="notification-time">
                        {getTimeAgo(notification.createdAt)}
                      </span>

                      <button
                        className="delete-btn"
                        onClick={(e) => handleDelete(notification._id, e)}
                        title="Delete notification"
                      >
                        🗑️
                      </button>
                    </div>

                    {notification.metadata && (
                      <div className="notification-metadata">
                        {notification.metadata.newStatus && (
                          <Badge
                            type="status"
                            value={notification.metadata.newStatus}
                            size="small"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
                showInfo={true}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Notifications;
