import React from 'react';
import './Modal.css';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'medium', // 'small', 'medium', 'large'
  closeOnOverlay = true,
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (closeOnOverlay && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className={`modal modal-${size}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

// ConfirmDialog as a specialized Modal
export const ConfirmDialog = ({
  isOpen,
  onClose,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  type = 'danger',
}) => {
  const getIcon = () => {
    const icons = {
      danger: '⚠️',
      warning: '⚡',
      info: 'ℹ️',
      success: '✅',
    };
    return icons[type] || '❓';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="small"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            {cancelText}
          </button>
          <button className={`btn btn-${type}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </>
      }
    >
      <div className="confirm-content">
        <div className={`confirm-icon confirm-${type}`}>{getIcon()}</div>
        <p className="confirm-message">{message}</p>
      </div>
    </Modal>
  );
};

export default Modal;
