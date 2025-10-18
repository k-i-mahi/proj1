import React from 'react';
import './Badge.css';

const Badge = ({
  type = 'status', // 'status', 'priority', 'role', 'custom'
  value,
  size = 'medium',
  variant = 'default',
  icon,
  onClick,
}) => {
  const getConfig = () => {
    const configs = {
      status: {
        open: { icon: '🔓', color: '#3b82f6', label: 'Open' },
        'in-progress': { icon: '⚙️', color: '#f59e0b', label: 'In Progress' },
        resolved: { icon: '✅', color: '#10b981', label: 'Resolved' },
        closed: { icon: '🔒', color: '#6b7280', label: 'Closed' },
        rejected: { icon: '❌', color: '#ef4444', label: 'Rejected' },
      },
      priority: {
        low: { icon: '⬇️', color: '#6b7280', label: 'Low' },
        medium: { icon: '➡️', color: '#f59e0b', label: 'Medium' },
        high: { icon: '⬆️', color: '#ef4444', label: 'High' },
        urgent: { icon: '🚨', color: '#dc2626', label: 'Urgent' },
      },
      role: {
        admin: { icon: '👑', color: '#8b5cf6', label: 'Admin' },
        authority: { icon: '🏛️', color: '#3b82f6', label: 'Authority' },
        resident: { icon: '👤', color: '#10b981', label: 'Resident' },
      },
    };

    if (type === 'custom') {
      return {
        icon: icon || '',
        color: variant,
        label: value,
      };
    }

    return (
      configs[type]?.[value] || { icon: '', color: '#6b7280', label: value }
    );
  };

  const config = getConfig();

  return (
    <span
      className={`badge badge-${size} ${onClick ? 'clickable' : ''}`}
      style={{
        backgroundColor: config.color,
        borderColor: config.color,
      }}
      onClick={onClick}
    >
      {config.icon && <span className="badge-icon">{config.icon}</span>}
      <span className="badge-label">{config.label}</span>
    </span>
  );
};

export default Badge;
