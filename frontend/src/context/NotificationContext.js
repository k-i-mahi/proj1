import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
} from 'react';
import { useAuth } from './AuthContext';
import notificationService from '../services/notificationService';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);

      const response = await notificationService.getNotifications();

      setNotifications(response.data || []);

      // Count unread notifications
      const unread = response.data?.filter((n) => !n.isRead).length || 0;
      setUnreadCount(unread);

      return response.data;
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to fetch notifications';
      setError(errorMessage);
      console.error('Fetch notifications error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Load notifications on mount and when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, user, fetchNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (id) => {
    try {
      await notificationService.markAsRead(id);

      // Update notification in state
      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === id
            ? { ...notification, isRead: true }
            : notification,
        ),
      );

      // Decrease unread count
      setUnreadCount((prev) => Math.max(0, prev - 1));

      return true;
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to mark as read';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();

      // Update all notifications in state
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true })),
      );

      // Reset unread count
      setUnreadCount(0);

      return true;
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to mark all as read';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(
    async (id) => {
      try {
        await notificationService.deleteNotification(id);

        // Find if notification was unread
        const notification = notifications.find((n) => n._id === id);
        const wasUnread = notification && !notification.isRead;

        // Remove notification from state
        setNotifications((prev) => prev.filter((n) => n._id !== id));

        // Decrease unread count if it was unread
        if (wasUnread) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }

        return true;
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || 'Failed to delete notification';
        setError(errorMessage);
        throw err;
      }
    },
    [notifications],
  );

  // Add notification (for real-time updates via WebSocket)
  const addNotification = useCallback((notification) => {
    setNotifications((prev) => [notification, ...prev]);

    if (!notification.isRead) {
      setUnreadCount((prev) => prev + 1);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    // State
    notifications,
    unreadCount,
    loading,
    error,

    // Actions
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification,
    clearError,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
