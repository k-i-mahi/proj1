import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from './Avatar';
import './IssueCard.css';

const IssueCard = ({ issue, onClick, viewMode = 'grid' }) => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick(issue);
    } else {
      navigate(`/issues/${issue._id}`);
    }
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const issueDate = new Date(date);
    const diffInSeconds = Math.floor((now - issueDate) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hr ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return issueDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: issueDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getPriorityIcon = (priority) => {
    const icons = {
      low: '🟢',
      medium: '🟡', 
      high: '🟠',
      urgent: '🔴'
    };
    return icons[priority] || '⚪';
  };

  const getStatusIcon = (status) => {
    const icons = {
      open: '🔴',
      'in-progress': '🟡',
      resolved: '🟢',
      closed: '⚫',
      rejected: '❌'
    };
    return icons[status] || '⚪';
  };

  return (
    <article
      className={`issue-card ${viewMode === 'list' ? 'list-mode' : 'grid-mode'} priority-${issue.priority} status-${issue.status}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      {/* Priority Indicator Strip */}
      <div className={`priority-strip priority-${issue.priority}`} />
      
      {/* Image Section */}
      {issue.images && issue.images.length > 0 && (
        <div className="issue-card-image">
          <img 
            src={issue.images[0].url} 
            alt={issue.title}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            loading="lazy"
          />
          {issue.images.length > 1 && (
            <div className="image-count">
              <span>+{issue.images.length - 1}</span>
            </div>
          )}
          <div className="image-overlay">
            <div className="priority-indicator">
              {getPriorityIcon(issue.priority)}
            </div>
          </div>
        </div>
      )}

      {/* No image placeholder */}
      {(!issue.images || issue.images.length === 0) && (
        <div className="issue-card-placeholder">
          <div className="placeholder-icon">
            {issue.category?.icon || '📝'}
          </div>
          <div className="placeholder-priority">
            {getPriorityIcon(issue.priority)}
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="issue-card-content">
        {/* Header with Status */}
        <div className="issue-card-header">
          <div className="status-indicator">
            <span className="status-icon">{getStatusIcon(issue.status)}</span>
            <span className="status-text">{issue.status.replace('-', ' ')}</span>
          </div>
          <div className={`priority-badge priority-${issue.priority}`}>
            {issue.priority}
          </div>
        </div>

        {/* Title */}
        <h3 className="issue-card-title" title={issue.title}>
          {issue.title.length > 60 
            ? `${issue.title.substring(0, 60)}...` 
            : issue.title}
        </h3>

        {/* Description */}
        <p className="issue-card-description">
          {issue.description.length > 100
            ? `${issue.description.substring(0, 100)}...`
            : issue.description}
        </p>

        {/* Meta Information */}
        <div className="issue-card-meta">
          <div className="issue-category">
            <span className="category-icon">{issue.category?.icon || '📁'}</span>
            <span className="category-name">{issue.category?.displayName || 'General'}</span>
          </div>
          
          {issue.location?.address && (
            <div className="issue-location">
              <span className="location-icon">📍</span>
              <span className="location-text">
                {issue.location.address.split(',')[0]}
              </span>
            </div>
          )}
        </div>

        {/* Reporter Info */}
        {issue.reportedBy && (
          <div className="issue-reporter">
            <Avatar
              src={issue.reportedBy.avatar}
              name={issue.reportedBy.name}
              size="small"
            />
            <div className="reporter-details">
              <span className="reporter-name">{issue.reportedBy.name}</span>
              <span className="report-time">{getTimeAgo(issue.createdAt)}</span>
            </div>
          </div>
        )}

        {/* Engagement Stats */}
        <div className="issue-card-footer">
          <div className="engagement-stats">
            <div className="stat-item upvotes" title={`${issue.votes?.upvotes?.length || 0} upvotes`}>
              <span className="stat-icon">👍</span>
              <span className="stat-value">{issue.votes?.upvotes?.length || 0}</span>
            </div>
            <div className="stat-item comments" title={`${issue.comments?.length || 0} comments`}>
              <span className="stat-icon">💬</span>
              <span className="stat-value">{issue.comments?.length || 0}</span>
            </div>
            <div className="stat-item views" title={`${issue.views || 0} views`}>
              <span className="stat-icon">👁️</span>
              <span className="stat-value">{issue.views || 0}</span>
            </div>
            {issue.followers?.length > 0 && (
              <div className="stat-item followers" title={`${issue.followers.length} followers`}>
                <span className="stat-icon">⭐</span>
                <span className="stat-value">{issue.followers.length}</span>
              </div>
            )}
          </div>
          
          {issue.assignedTo && (
            <div className="assigned-indicator" title={`Assigned to ${issue.assignedTo.name}`}>
              <Avatar
                src={issue.assignedTo.avatar}
                name={issue.assignedTo.name}
                size="tiny"
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default IssueCard;
