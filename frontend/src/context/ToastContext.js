import React, { createContext, useState, useContext, useCallback } from 'react';
import './ToastContext.css';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (message, type = 'info', duration = 3000) => {
      const id = Date.now() + Math.random();
      const toast = { id, message, type, duration };

      setToasts((prev) => [...prev, toast]);

      // Auto remove
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast],
  );

  const success = useCallback(
    (message, duration) => {
      return addToast(message, 'success', duration);
    },
    [addToast],
  );

  const error = useCallback(
    (message, duration) => {
      return addToast(message, 'error', duration);
    },
    [addToast],
  );

  const warning = useCallback(
    (message, duration) => {
      return addToast(message, 'warning', duration);
    },
    [addToast],
  );

  const info = useCallback(
    (message, duration) => {
      return addToast(message, 'info', duration);
    },
    [addToast],
  );

  const value = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Toast Component
const Toast = ({ toast, onClose }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div className={`toast toast-${toast.type}`}>
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-message">{toast.message}</div>
      <button className="toast-close" onClick={onClose}>
        ✕
      </button>
    </div>
  );
};

export default ToastContext;
