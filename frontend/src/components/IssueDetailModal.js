import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import issueService from '../services/issueService';
import './IssueDetailModal.css';

const IssueDetailModal = ({ issue, isOpen, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');

  // Issue data
  const [issueData, setIssueData] = useState(null);
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);

  // Comment form
  const [commentText, setCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  // Vote state
  const [voteStatus, setVoteStatus] = useState({
    voted: false,
    voteType: null,
  });
  const [isFollowing, setIsFollowing] = useState(false);

  // Status change
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');

  useEffect(() => {
    if (isOpen && issue) {
      loadIssueDetails();
    }
  }, [isOpen, issue]);

  const loadIssueDetails = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await issueService.getIssueById(issue._id);
      setIssueData(response.data);
      setComments(response.data.comments || []);
      setActivities(response.data.activities || []);
      setIsFollowing(response.data.followers?.includes(user?._id));

      // Get vote status if authenticated
      if (user) {
        const voteResponse = await issueService.getVoteStatus(issue._id);
        setVoteStatus(voteResponse.data);
      }
    } catch (err) {
      console.error('Load issue error:', err);
      setError('Failed to load issue details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();

    if (!commentText.trim()) return;

    try {
      setIsCommenting(true);
      setError('');

      await issueService.addComment(issueData._id, commentText);
      setCommentText('');
      await loadIssueDetails();
    } catch (err) {
      console.error('Add comment error:', err);
      setError('Failed to add comment');
    } finally {
      setIsCommenting(false);
    }
  };

  const handleVote = async (voteType) => {
    if (!user) {
      setError('Please login to vote');
      return;
    }

    try {
      setError('');
      await issueService.voteOnIssue(issueData._id, voteType);
      await loadIssueDetails();
    } catch (err) {
      console.error('Vote error:', err);
      setError('Failed to vote');
    }
  };

  const handleToggleFollow = async () => {
    if (!user) {
      setError('Please login to follow');
      return;
    }

    try {
      setError('');
      await issueService.toggleFollow(issueData._id);
      setIsFollowing(!isFollowing);
      await loadIssueDetails();
    } catch (err) {
      console.error('Follow error:', err);
      setError('Failed to update follow status');
    }
  };

  const handleStatusChange = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError('');

      await issueService.changeStatus(issueData._id, newStatus, statusReason);
      setShowStatusModal(false);
      setNewStatus('');
      setStatusReason('');
      await loadIssueDetails();
      onUpdate && onUpdate();
    } catch (err) {
      console.error('Status change error:', err);
      setError('Failed to change status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      open: 'badge-open',
      'in-progress': 'badge-progress',
      resolved: 'badge-resolved',
      closed: 'badge-closed',
      rejected: 'badge-rejected',
    };
    return classes[status] || '';
  };

  const getPriorityBadgeClass = (priority) => {
    const classes = {
      low: 'badge-low',
      medium: 'badge-medium',
      high: 'badge-high',
      urgent: 'badge-urgent',
    };
    return classes[priority] || '';
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

    return new Date(date).toLocaleDateString();
  };

  const canChangeStatus = () => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'authority' && issueData?.assignedTo?._id === user._id)
      return true;
    return false;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {loading && !issueData ? (
          <div className="modal-loading">
            <div className="spinner"></div>
            <p>Loading issue details...</p>
          </div>
        ) : issueData ? (
          <>
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-header-content">
                <h2 className="modal-title">{issueData.title}</h2>
                <div className="modal-badges">
                  <span
                    className={`status-badge ${getStatusBadgeClass(
                      issueData.status,
                    )}`}
                  >
                    {issueData.status.replace('-', ' ')}
                  </span>
                  <span
                    className={`priority-badge ${getPriorityBadgeClass(
                      issueData.priority,
                    )}`}
                  >
                    {issueData.priority}
                  </span>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={onClose}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="alert alert-error">
                <span className="alert-icon">⚠</span>
                {error}
              </div>
            )}

            {/* Modal Actions */}
            <div className="modal-actions">
              <div className="action-group">
                <button
                  className={`action-btn ${
                    voteStatus.voteType === 'upvote' ? 'active' : ''
                  }`}
                  onClick={() => handleVote('upvote')}
                  disabled={!user}
                >
                  <span className="action-icon">👍</span>
                  <span className="action-count">
                    {issueData.stats?.upvotes || 0}
                  </span>
                </button>

                <button
                  className={`action-btn ${
                    voteStatus.voteType === 'downvote' ? 'active' : ''
                  }`}
                  onClick={() => handleVote('downvote')}
                  disabled={!user}
                >
                  <span className="action-icon">👎</span>
                  <span className="action-count">
                    {issueData.stats?.downvotes || 0}
                  </span>
                </button>

                <button
                  className={`action-btn ${isFollowing ? 'active' : ''}`}
                  onClick={handleToggleFollow}
                  disabled={!user}
                >
                  <span className="action-icon">{isFollowing ? '★' : '☆'}</span>
                  <span className="action-text">
                    {isFollowing ? 'Following' : 'Follow'}
                  </span>
                </button>

                <button className="action-btn">
                  <span className="action-icon">👁</span>
                  <span className="action-count">
                    {issueData.stats?.views || 0}
                  </span>
                </button>
              </div>

              {canChangeStatus() && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowStatusModal(true)}
                >
                  Change Status
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="modal-tabs">
              <button
                className={`tab ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                Details
              </button>
              <button
                className={`tab ${activeTab === 'comments' ? 'active' : ''}`}
                onClick={() => setActiveTab('comments')}
              >
                Comments ({issueData.stats?.commentCount || 0})
              </button>
              <button
                className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
                onClick={() => setActiveTab('activity')}
              >
                Activity
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {activeTab === 'details' && (
                <div className="details-tab">
                  {/* Description */}
                  <section className="detail-section">
                    <h3 className="section-title">Description</h3>
                    <p className="description-text">{issueData.description}</p>
                  </section>

                  {/* Images */}
                  {issueData.images && issueData.images.length > 0 && (
                    <section className="detail-section">
                      <h3 className="section-title">Images</h3>
                      <div className="image-gallery">
                        {issueData.images.map((image, index) => (
                          <img
                            key={index}
                            src={image.url}
                            alt={`Issue ${index + 1}`}
                            className="gallery-image"
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Details Grid */}
                  <section className="detail-section">
                    <h3 className="section-title">Information</h3>
                    <div className="details-grid">
                      <div className="detail-item">
                        <span className="detail-label">Category</span>
                        <span className="detail-value">
                          <span className="category-icon">
                            {issueData.category?.icon}
                          </span>
                          {issueData.category?.displayName}
                        </span>
                      </div>

                      <div className="detail-item">
                        <span className="detail-label">Reported By</span>
                        <div className="user-info">
                          {issueData.reportedBy?.avatar ? (
                            <img
                              src={issueData.reportedBy.avatar}
                              alt=""
                              className="user-avatar"
                            />
                          ) : (
                            <div className="user-avatar-placeholder">
                              {issueData.reportedBy?.name?.charAt(0)}
                            </div>
                          )}
                          <span>{issueData.reportedBy?.name}</span>
                        </div>
                      </div>

                      {issueData.assignedTo && (
                        <div className="detail-item">
                          <span className="detail-label">Assigned To</span>
                          <div className="user-info">
                            {issueData.assignedTo.avatar ? (
                              <img
                                src={issueData.assignedTo.avatar}
                                alt=""
                                className="user-avatar"
                              />
                            ) : (
                              <div className="user-avatar-placeholder">
                                {issueData.assignedTo.name?.charAt(0)}
                              </div>
                            )}
                            <span>{issueData.assignedTo.name}</span>
                          </div>
                        </div>
                      )}

                      <div className="detail-item">
                        <span className="detail-label">Location</span>
                        <span className="detail-value">
                          📍{' '}
                          {issueData.location?.address || 'Location provided'}
                        </span>
                      </div>

                      <div className="detail-item">
                        <span className="detail-label">Created</span>
                        <span className="detail-value">
                          {getTimeAgo(issueData.createdAt)}
                        </span>
                      </div>

                      <div className="detail-item">
                        <span className="detail-label">Updated</span>
                        <span className="detail-value">
                          {getTimeAgo(issueData.updatedAt)}
                        </span>
                      </div>

                      {issueData.resolvedAt && (
                        <div className="detail-item">
                          <span className="detail-label">Resolved</span>
                          <span className="detail-value">
                            {getTimeAgo(issueData.resolvedAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Tags */}
                  {issueData.tags && issueData.tags.length > 0 && (
                    <section className="detail-section">
                      <h3 className="section-title">Tags</h3>
                      <div className="tags-list">
                        {issueData.tags.map((tag, index) => (
                          <span key={index} className="tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}

              {activeTab === 'comments' && (
                <div className="comments-tab">
                  {/* Add Comment */}
                  {user && (
                    <form onSubmit={handleAddComment} className="comment-form">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        className="comment-input"
                        rows="3"
                      />
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={isCommenting || !commentText.trim()}
                      >
                        {isCommenting ? 'Posting...' : 'Post Comment'}
                      </button>
                    </form>
                  )}

                  {/* Comments List */}
                  <div className="comments-list">
                    {comments.length === 0 ? (
                      <div className="empty-state">
                        <p>No comments yet. Be the first to comment!</p>
                      </div>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment._id} className="comment-item">
                          <div className="comment-header">
                            <div className="user-info">
                              {comment.user?.avatar ? (
                                <img
                                  src={comment.user.avatar}
                                  alt=""
                                  className="user-avatar"
                                />
                              ) : (
                                <div className="user-avatar-placeholder">
                                  {comment.user?.name?.charAt(0)}
                                </div>
                              )}
                              <div>
                                <span className="user-name">
                                  {comment.user?.name}
                                </span>
                                <span className="comment-time">
                                  {getTimeAgo(comment.createdAt)}
                                </span>
                              </div>
                            </div>
                            {comment.isInternal && (
                              <span className="badge-internal">Internal</span>
                            )}
                          </div>
                          <p className="comment-text">{comment.commentText}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="activity-tab">
                  <div className="activity-timeline">
                    {activities.length === 0 ? (
                      <div className="empty-state">
                        <p>No activity yet</p>
                      </div>
                    ) : (
                      activities.map((activity) => (
                        <div key={activity._id} className="activity-item">
                          <div className="activity-icon">
                            {activity.action === 'created' && '➕'}
                            {activity.action === 'updated' && '✏️'}
                            {activity.action === 'status_changed' && '🔄'}
                            {activity.action === 'assigned' && '📌'}
                            {activity.action === 'commented' && '💬'}
                          </div>
                          <div className="activity-content">
                            <div className="activity-header">
                              <span className="user-name">
                                {activity.user?.name}
                              </span>
                              <span className="activity-action">
                                {activity.action.replace('_', ' ')}
                              </span>
                            </div>
                            {activity.reason && (
                              <p className="activity-reason">
                                {activity.reason}
                              </p>
                            )}
                            <span className="activity-time">
                              {getTimeAgo(activity.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>Issue not found</p>
          </div>
        )}

        {/* Status Change Modal */}
        {showStatusModal && (
          <div
            className="status-modal-overlay"
            onClick={() => setShowStatusModal(false)}
          >
            <div className="status-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Change Status</h3>
              <form onSubmit={handleStatusChange}>
                <div className="form-group">
                  <label>New Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="form-control"
                    required
                  >
                    <option value="">Select status</option>
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                    {user?.role === 'admin' && (
                      <option value="rejected">Rejected</option>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>Reason (optional)</label>
                  <textarea
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    className="form-control"
                    rows="3"
                    placeholder="Provide a reason for this status change..."
                  />
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowStatusModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Update Status'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueDetailModal;
