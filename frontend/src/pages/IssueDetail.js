import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import issueService from '../services/issueService';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import Feedback from '../components/Feedback';
import Modal, { ConfirmDialog } from '../components/Modal';
import './IssueDetail.css';

const IssueDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [commentText, setCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');

  // Load issue details
  const loadIssueDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await issueService.getIssueById(id);
      // Handle response format from service
      const issueData = response?.data || response;
      setIssue(issueData);
    } catch (err) {
      console.error('Load issue error:', err);
      showError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to load issue details',
      );
    } finally {
      setLoading(false);
    }
  }, [id, showError]);

  useEffect(() => {
    loadIssueDetails();
  }, [loadIssueDetails]);

  // Derived states
  const voteStatus = (() => {
    if (!user || !issue || !issue.votes)
      return { voted: false, voteType: null };
    const hasUpvoted = issue.votes.upvotes?.some(
      (v) => (typeof v === 'object' ? v._id : v)?.toString() === user._id,
    );
    const hasDownvoted = issue.votes.downvotes?.some(
      (v) => (typeof v === 'object' ? v._id : v)?.toString() === user._id,
    );
    return {
      voted: hasUpvoted || hasDownvoted,
      voteType: hasUpvoted ? 'upvote' : hasDownvoted ? 'downvote' : null,
    };
  })();

  const isFollowing = (() => {
    if (!user || !issue) return false;
    return issue.followers?.some(
      (f) => (typeof f === 'object' ? f._id : f)?.toString() === user._id,
    );
  })();

  // Voting
  const handleVote = async (voteType) => {
    if (!user) return showError('Please login to vote');
    try {
      const response = await issueService.voteOnIssue(id, voteType);
      // Handle response format
      const updatedIssue = response?.data || response;
      setIssue(updatedIssue);
      success('Vote recorded');
    } catch (err) {
      console.error('Vote error:', err);
      showError(
        err?.response?.data?.message || err?.message || 'Failed to vote',
      );
    }
  };

  // Follow/unfollow
  const handleToggleFollow = async () => {
    if (!user) return showError('Please login to follow');
    try {
      const response = await issueService.toggleFollow(id);
      // Handle response format
      const updatedIssue = response?.data || response;
      setIssue(updatedIssue);
      success(isFollowing ? 'Unfollowed issue' : 'Following issue');
    } catch (err) {
      console.error('Toggle follow error:', err);
      showError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to update follow status',
      );
    }
  };

  // Add comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!user) return showError('Please login to comment');
    try {
      setIsCommenting(true);
      const response = await issueService.addComment(id, commentText.trim());
      // Backend returns the new comment, not the full issue
      // So we need to reload the issue
      await loadIssueDetails();
      setCommentText('');
      success('Comment added');
    } catch (err) {
      console.error('Add comment error:', err);
      showError(
        err?.response?.data?.message || err?.message || 'Failed to add comment',
      );
    } finally {
      setIsCommenting(false);
    }
  };

  // Status change
  const handleStatusChange = async (e) => {
    e.preventDefault();
    if (!newStatus) {
      showError('Please select a status');
      return;
    }
    try {
      const response = await issueService.changeStatus(
        id,
        newStatus,
        statusReason,
      );
      // Handle response format
      const updatedIssue = response?.data || response;
      setIssue(updatedIssue);
      setShowStatusModal(false);
      setNewStatus('');
      setStatusReason('');
      success('Status updated');
    } catch (err) {
      console.error('Status change error:', err);
      showError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to update status',
      );
    }
  };

  // Delete issue
  const handleDelete = async () => {
    try {
      await issueService.deleteIssue(id);
      success('Issue deleted');
      navigate('/issues');
    } catch (err) {
      console.error('Delete error:', err);
      showError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to delete issue',
      );
    }
  };

  // Permission checks
  const canEdit =
    user && (user._id === issue?.reportedBy?._id || user.role === 'admin');
  const canDelete = canEdit;
  const canChangeStatus =
    user &&
    (user.role === 'admin' ||
      user.role === 'authority' ||
      issue?.assignedTo?._id === user._id);

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  if (loading) return <Feedback type="loading" fullPage />;

  if (!issue)
    return (
      <Feedback
        type="error"
        title="Issue Not Found"
        message="The issue doesn't exist."
        fullPage
      />
    );

  return (
    <div className="issue-detail-page">
      <div className="issue-detail-container">
        <Link to="/issues" className="back-link">
          ← Back to Issues
        </Link>

        <div className="issue-header">
          <div className="issue-title-section">
            <h1>{issue.title}</h1>
            <div className="issue-badges">
              <Badge type="status" value={issue.status} />
              <Badge type="priority" value={issue.priority} />
            </div>
          </div>

          <div className="issue-action-buttons">
            <button
              className={`action-btn ${
                voteStatus.voteType === 'upvote' ? 'active' : ''
              }`}
              onClick={() => handleVote('upvote')}
              disabled={!user}
            >
              👍 {issue.stats?.upvotes || 0}
            </button>
            <button
              className={`action-btn ${
                voteStatus.voteType === 'downvote' ? 'active' : ''
              }`}
              onClick={() => handleVote('downvote')}
              disabled={!user}
            >
              👎 {issue.stats?.downvotes || 0}
            </button>
            <button
              className={`action-btn ${isFollowing ? 'active' : ''}`}
              onClick={handleToggleFollow}
              disabled={!user}
            >
              {isFollowing ? '★ Following' : '☆ Follow'}
            </button>
            <span className="stat-display">👁 {issue.stats?.views || 0}</span>

            {canEdit && (
              <button
                className="action-btn edit"
                onClick={() => navigate(`/issues/${id}/edit`)}
              >
                ✏️ Edit
              </button>
            )}

            {canChangeStatus && (
              <button
                className="action-btn status"
                onClick={() => setShowStatusModal(true)}
              >
                Change Status
              </button>
            )}

            {canDelete && (
              <button
                className="action-btn delete"
                onClick={() => setShowDeleteConfirm(true)}
              >
                🗑️ Delete
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="issue-tabs">
          <button
            className={activeTab === 'details' ? 'active' : ''}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button
            className={activeTab === 'comments' ? 'active' : ''}
            onClick={() => setActiveTab('comments')}
          >
            Comments ({issue.stats?.commentCount || issue.comments?.length || 0}
            )
          </button>
          <button
            className={activeTab === 'activity' ? 'active' : ''}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
        </div>

        <div className="issue-content">
          {activeTab === 'details' && (
            <div className="details-tab">
              {issue.images?.length > 0 && (
                <div className="issue-images">
                  {issue.images.map((img, i) => (
                    <img key={i} src={img.url} alt={`Issue ${i + 1}`} />
                  ))}
                </div>
              )}
              <h3>Description</h3>
              <p className="issue-description">{issue.description}</p>

              <h3>Information</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <strong>Category:</strong>{' '}
                  {issue.category?.displayName || 'N/A'}
                </div>
                <div className="detail-item">
                  <strong>Reported By:</strong>
                  {issue.reportedBy && (
                    <>
                      <Avatar
                        src={issue.reportedBy?.avatar}
                        name={issue.reportedBy?.name}
                        size="small"
                      />
                      <span>{issue.reportedBy?.name}</span>
                    </>
                  )}
                </div>
                {issue.assignedTo && (
                  <div className="detail-item">
                    <strong>Assigned To:</strong>
                    <Avatar
                      src={issue.assignedTo.avatar}
                      name={issue.assignedTo.name}
                      size="small"
                    />
                    <span>{issue.assignedTo.name}</span>
                  </div>
                )}
                <div className="detail-item">
                  <strong>Location:</strong> {issue.location?.address || 'N/A'}
                </div>
                <div className="detail-item">
                  <strong>Created:</strong> {getTimeAgo(issue.createdAt)}
                </div>
                <div className="detail-item">
                  <strong>Updated:</strong> {getTimeAgo(issue.updatedAt)}
                </div>
              </div>

              {issue.tags?.length > 0 && (
                <div className="tags-section">
                  <h3>Tags</h3>
                  <div className="tags-list">
                    {issue.tags.map((t, i) => (
                      <span key={i} className="tag">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="comments-tab">
              {user && (
                <form onSubmit={handleAddComment} className="comment-form">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    rows="4"
                  />
                  <button
                    type="submit"
                    disabled={isCommenting || !commentText.trim()}
                    className="btn btn-primary"
                  >
                    {isCommenting ? 'Posting...' : 'Post Comment'}
                  </button>
                </form>
              )}

              {!user && (
                <div className="login-prompt">
                  <p>
                    Please <Link to="/login">login</Link> to add comments
                  </p>
                </div>
              )}

              {issue.comments?.length === 0 ? (
                <Feedback
                  type="empty"
                  title="No Comments"
                  message="Be the first to comment on this issue"
                />
              ) : (
                <div className="comments-list">
                  {issue.comments?.map((c) => (
                    <div key={c._id} className="comment-item">
                      <Avatar
                        src={c.user?.avatar}
                        name={c.user?.name}
                        size="medium"
                      />
                      <div className="comment-content">
                        <div className="comment-header">
                          <strong className="comment-author">
                            {c.user?.name}
                          </strong>
                          <span className="comment-time">
                            · {getTimeAgo(c.createdAt)}
                          </span>
                          {c.user?.role && (
                            <Badge
                              type="custom"
                              value={c.user.role}
                              size="small"
                            />
                          )}
                        </div>
                        <p className="comment-text">{c.commentText}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="activity-tab">
              {!issue.activities || issue.activities.length === 0 ? (
                <Feedback
                  type="empty"
                  title="No Activity"
                  message="No activity recorded for this issue yet"
                />
              ) : (
                <div className="activity-list">
                  {issue.activities.map((a) => (
                    <div key={a._id} className="activity-item">
                      <div className="activity-icon">
                        {a.action === 'created' && '➕'}
                        {a.action === 'updated' && '✏️'}
                        {a.action === 'commented' && '💬'}
                        {a.action === 'voted' && '👍'}
                        {a.action === 'status_changed' && '🔄'}
                        {a.action === 'assigned' && '👤'}
                        {![
                          'created',
                          'updated',
                          'commented',
                          'voted',
                          'status_changed',
                          'assigned',
                        ].includes(a.action) && '📌'}
                      </div>
                      <div className="activity-content">
                        <div className="activity-header">
                          <strong>{a.user?.name || 'Unknown User'}</strong>
                          <span className="activity-action">
                            {' '}
                            {a.description || a.action.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="activity-time">
                          {getTimeAgo(a.createdAt)}
                        </span>
                        {a.metadata?.reason && (
                          <p className="activity-reason">{a.metadata.reason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Issue"
        message="Are you sure you want to delete this issue? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {showStatusModal && (
        <Modal
          isOpen={showStatusModal}
          onClose={() => {
            setShowStatusModal(false);
            setNewStatus('');
            setStatusReason('');
          }}
          title="Change Status"
          size="medium"
          footer={
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowStatusModal(false);
                  setNewStatus('');
                  setStatusReason('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStatusChange}
                disabled={!newStatus}
              >
                Update Status
              </button>
            </>
          }
        >
          <form onSubmit={handleStatusChange} className="status-form">
            <div className="form-group">
              <label htmlFor="status" className="form-label">
                New Status *
              </label>
              <select
                id="status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                required
                className="form-input"
              >
                <option value="">Select Status</option>
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
              <label htmlFor="reason" className="form-label">
                Reason (optional)
              </label>
              <textarea
                id="reason"
                placeholder="Explain the reason for status change..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                rows="3"
                className="form-input"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default IssueDetail;
