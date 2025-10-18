import React, { useEffect } from 'react';
import './Feedback.css';

const Feedback = ({
  type = 'loading', // 'loading', 'empty', 'error', 'toast'
  title,
  message,
  icon,
  action,
  actionText,
  onClose,
  autoClose = 3000,
  fullPage = false,
}) => {
  useEffect(() => {
    if (type === 'toast' && autoClose && onClose) {
      const timer = setTimeout(onClose, autoClose);
      return () => clearTimeout(timer);
    }
  }, [type, autoClose, onClose]);

  const getDefaultConfig = () => {
    const configs = {
      loading: {
        icon: <div className="spinner"></div>,
        title: title || 'Loading...',
        message: message || 'Please wait',
      },
      empty: {
        icon: icon || '📭',
        title: title || 'No data found',
        message: message || 'There are no items to display',
      },
      error: {
        icon: icon || '⚠️',
        title: title || 'Something went wrong',
        message: message || 'An error occurred. Please try again.',
      },
      success: {
        icon: icon || '✅',
        title: title || 'Success',
        message: message || 'Operation completed successfully',
      },
      warning: {
        icon: icon || '⚡',
        title: title || 'Warning',
        message: message || 'Please review this information',
      },
      info: {
        icon: icon || 'ℹ️',
        title: title || 'Information',
        message: message || 'Here is some information',
      },
    };
    return configs[type] || configs.loading;
  };

  const config = getDefaultConfig();

  // Toast variant
  if (
    type === 'toast' ||
    ['success', 'warning', 'info', 'error'].includes(type)
  ) {
    return (
      <div className={`toast toast-${type}`}>
        <span className="toast-icon">{config.icon}</span>
        <div className="toast-content">
          {config.title && <div className="toast-title">{config.title}</div>}
          <div className="toast-message">{config.message}</div>
        </div>
        {onClose && (
          <button className="toast-close" onClick={onClose}>
            ✕
          </button>
        )}
      </div>
    );
  }

  // Full page or inline variant
  return (
    <div className={`feedback feedback-${type} ${fullPage ? 'fullpage' : ''}`}>
      <div className="feedback-content">
        <div className="feedback-icon">{config.icon}</div>
        {config.title && <h3 className="feedback-title">{config.title}</h3>}
        {config.message && <p className="feedback-message">{config.message}</p>}
        {action && actionText && (
          <button className="btn btn-primary" onClick={action}>
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
};

export default Feedback;
