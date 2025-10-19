import React from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from './Badge';
import Avatar from './Avatar';
import './IssueCard.css';

const IssueCard = ({ issue, onClick, viewMode = 'grid' }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(issue);
    } else {
      navigate(`/issues/${issue._id}`);
    }
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
    <div
      className={`issue-card ${
        viewMode === 'list' ? 'list-mode' : 'grid-mode'
      }`}
      onClick={handleClick}
    >
      {/* Image Section */}
      {issue.images && issue.images.length > 0 && (
        <div className="issue-card-image">
          <img src={issue.images[0].url} alt={issue.title} />
          {issue.images.length > 1 && (
            <span className="image-count">+{issue.images.length - 1}</span>
          )}
          {issue.priority === 'urgent' && (
            <span className="urgent-badge">🚨 Urgent</span>
          )}
        </div>
      )}

      {/* Content Section */}
      <div className="issue-card-content">
        {/* Header with Badges */}
        <div className="issue-card-header">
          <div className="issue-card-badges">
            <Badge type="status" value={issue.status} size="small" />
            <Badge type="priority" value={issue.priority} size="small" />
          </div>
        </div>

        {/* Title */}
        <h3 className="issue-card-title">{issue.title}</h3>

        {/* Description */}
        <p className="issue-card-description">
          {issue.description.length > 120
            ? `${issue.description.substring(0, 120)}...`
            : issue.description}
        </p>

        {/* Category */}
        <div className="issue-card-category">
          <span className="category-icon">{issue.category?.icon}</span>
          <span className="category-name">{issue.category?.displayName}</span>
        </div>

        {/* Reporter Info (List view only) */}
        {viewMode === 'list' && issue.reportedBy && (
          <div className="issue-card-reporter">
            <span className="reporter-label">Reported by:</span>
            <div className="reporter-info">
              <Avatar
                src={issue.reportedBy.avatar}
                name={issue.reportedBy.name}
                size="small"
              />
              <span className="reporter-name">{issue.reportedBy.name}</span>
            </div>
          </div>
        )}

        {/* Location (List view only) */}
        {viewMode === 'list' && issue.location?.address && (
          <div className="issue-card-location">
            <span className="location-icon">📍</span>
            <span className="location-text">{issue.location.address}</span>
          </div>
        )}

        {/* Footer */}
        <div className="issue-card-footer">
          <div className="issue-card-stats">
            <span className="stat-item" title="Upvotes">
              <span className="stat-icon">👍</span>
              <span className="stat-value">{issue.stats?.upvotes || 0}</span>
            </span>
            <span className="stat-item" title="Comments">
              <span className="stat-icon">💬</span>
              <span className="stat-value">
                {issue.stats?.commentCount || 0}
              </span>
            </span>
            <span className="stat-item" title="Views">
              <span className="stat-icon">👁</span>
              <span className="stat-value">{issue.stats?.views || 0}</span>
            </span>
          </div>
          <span className="issue-card-time">{getTimeAgo(issue.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};

export default IssueCard;
