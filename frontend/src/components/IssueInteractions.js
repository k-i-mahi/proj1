import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import interactionService from '../services/interactionService';
import './IssueInteractions.css';

const IssueInteractions = ({ 
  issue, 
  onInteractionUpdate, 
  showComments = true, 
  showVoting = true, 
  showFollow = true,
  className = ''
}) => {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  
  const [interactions, setInteractions] = useState({
    votes: { upvotes: 0, downvotes: 0 },
    commentCount: 0,
    followerCount: 0
  });
  
  const [userStatus, setUserStatus] = useState({
    hasUpvoted: false,
    hasDownvoted: false,
    isFollowing: false
  });
  
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showCommentsSection, setShowCommentsSection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);

  // Initialize interactions from issue prop
  useEffect(() => {
    if (issue) {
      setInteractions({
        votes: {
          upvotes: issue.votes?.upvotes?.length || 0,
          downvotes: issue.votes?.downvotes?.length || 0
        },
        commentCount: issue.comments?.length || 0,
        followerCount: issue.followers?.length || 0
      });

      // Check user's interaction status
      if (isAuthenticated && user) {
        const hasUpvoted = issue.votes?.upvotes?.includes(user._id) || false;
        const hasDownvoted = issue.votes?.downvotes?.includes(user._id) || false;
        const isFollowing = issue.followers?.includes(user._id) || false;

        setUserStatus({
          hasUpvoted,
          hasDownvoted,
          isFollowing
        });
      }
    }
  }, [issue, isAuthenticated, user]);

  // Load user interaction status from API
  useEffect(() => {
    const loadStatus = async () => {
      if (isAuthenticated && issue?._id) {
        try {
          const [voteStatus, followStatus] = await Promise.all([
            interactionService.getVoteStatus(issue._id),
            interactionService.getFollowStatus(issue._id)
          ]);

          if (voteStatus.success) {
            setUserStatus(prev => ({
              ...prev,
              hasUpvoted: voteStatus.data.hasUpvoted,
              hasDownvoted: voteStatus.data.hasDownvoted
            }));
            
            setInteractions(prev => ({
              ...prev,
              votes: {
                upvotes: voteStatus.data.upvotes,
                downvotes: voteStatus.data.downvotes
              }
            }));
          }

          if (followStatus.success) {
            setUserStatus(prev => ({
              ...prev,
              isFollowing: followStatus.data.isFollowing
            }));
            
            setInteractions(prev => ({
              ...prev,
              followerCount: followStatus.data.followerCount
            }));
          }
        } catch (error) {
          console.error('Failed to load interaction status:', error);
        }
      }
    };

    loadStatus();
  }, [isAuthenticated, issue?._id]);



  const handleVote = async (voteType) => {
    if (!isAuthenticated) {
      showToast('Please login to vote', 'warning');
      return;
    }

    setLoading(true);
    try {
      let response;
      
      // If user already voted this way, remove the vote
      if ((voteType === 'upvote' && userStatus.hasUpvoted) || 
          (voteType === 'downvote' && userStatus.hasDownvoted)) {
        response = await interactionService.removeVote(issue._id);
        
        setUserStatus(prev => ({
          ...prev,
          hasUpvoted: false,
          hasDownvoted: false
        }));
      } else {
        // Cast new vote
        response = await interactionService.voteOnIssue(issue._id, voteType);
        
        setUserStatus(prev => ({
          ...prev,
          hasUpvoted: voteType === 'upvote',
          hasDownvoted: voteType === 'downvote'
        }));
      }

      if (response.success) {
        setInteractions(prev => ({
          ...prev,
          votes: {
            upvotes: response.data.upvotes,
            downvotes: response.data.downvotes
          }
        }));

        if (onInteractionUpdate) {
          onInteractionUpdate('vote', response.data);
        }
      }
    } catch (error) {
      console.error('Vote error:', error);
      showToast('Failed to record vote', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!isAuthenticated) {
      showToast('Please login to follow issues', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await interactionService.toggleFollow(issue._id);
      
      if (response.success) {
        setUserStatus(prev => ({
          ...prev,
          isFollowing: response.data.isFollowing
        }));
        
        setInteractions(prev => ({
          ...prev,
          followerCount: response.data.followerCount
        }));

        showToast(response.message, 'success');
        
        if (onInteractionUpdate) {
          onInteractionUpdate('follow', response.data);
        }
      }
    } catch (error) {
      console.error('Follow error:', error);
      showToast('Failed to update follow status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    if (!showCommentsSection || comments.length > 0) return;

    setCommentLoading(true);
    try {
      const response = await interactionService.getComments(issue._id, {
        page: 1,
        limit: 20,
        sortBy: '-createdAt'
      });

      if (response.success) {
        setComments(response.data);
      }
    } catch (error) {
      console.error('Load comments error:', error);
      showToast('Failed to load comments', 'error');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      showToast('Please login to comment', 'warning');
      return;
    }

    if (!newComment.trim()) {
      showToast('Please enter a comment', 'warning');
      return;
    }

    const validation = interactionService.validateComment(newComment);
    if (!validation.isValid) {
      showToast(validation.errors.text, 'error');
      return;
    }

    setCommentLoading(true);
    try {
      const response = await interactionService.addComment(issue._id, newComment.trim());
      
      if (response.success) {
        setComments(prev => [response.data, ...prev]);
        setNewComment('');
        
        setInteractions(prev => ({
          ...prev,
          commentCount: prev.commentCount + 1
        }));

        showToast('Comment added successfully', 'success');
        
        if (onInteractionUpdate) {
          onInteractionUpdate('comment', response.data);
        }
      }
    } catch (error) {
      console.error('Add comment error:', error);
      showToast('Failed to add comment', 'error');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      const response = await interactionService.deleteComment(issue._id, commentId);
      
      if (response.success) {
        setComments(prev => prev.filter(c => c._id !== commentId));
        
        setInteractions(prev => ({
          ...prev,
          commentCount: Math.max(0, prev.commentCount - 1)
        }));

        showToast('Comment deleted successfully', 'success');
        
        if (onInteractionUpdate) {
          onInteractionUpdate('comment_delete', { commentId });
        }
      }
    } catch (error) {
      console.error('Delete comment error:', error);
      showToast('Failed to delete comment', 'error');
    }
  };

  const toggleCommentsSection = () => {
    setShowCommentsSection(!showCommentsSection);
    if (!showCommentsSection) {
      loadComments();
    }
  };

  const getTimeAgo = (date) => {
    return interactionService.getTimeAgo(date);
  };

  const canDeleteComment = (comment) => {
    if (!user) return false;
    return comment.user._id === user._id || user.role === 'admin';
  };

  return (
    <div className={`issue-interactions ${className}`}>
      {/* Interaction Buttons */}
      <div className="interaction-buttons">
        {showVoting && (
          <div className="vote-section">
            <button
              className={`vote-btn upvote ${userStatus.hasUpvoted ? 'active' : ''}`}
              onClick={() => handleVote('upvote')}
              disabled={loading}
              title="Upvote this issue"
            >
              <span className="vote-icon">👍</span>
              <span className="vote-count">{interactions.votes.upvotes}</span>
            </button>
            
            <button
              className={`vote-btn downvote ${userStatus.hasDownvoted ? 'active' : ''}`}
              onClick={() => handleVote('downvote')}
              disabled={loading}
              title="Downvote this issue"
            >
              <span className="vote-icon">👎</span>
              <span className="vote-count">{interactions.votes.downvotes}</span>
            </button>
          </div>
        )}

        {showComments && (
          <button
            className="interaction-btn comment-btn"
            onClick={toggleCommentsSection}
            title="View comments"
          >
            <span className="interaction-icon">💬</span>
            <span className="interaction-count">{interactions.commentCount}</span>
            <span className="interaction-label">Comments</span>
          </button>
        )}

        {showFollow && (
          <button
            className={`interaction-btn follow-btn ${userStatus.isFollowing ? 'active' : ''}`}
            onClick={handleFollow}
            disabled={loading}
            title={userStatus.isFollowing ? 'Unfollow issue' : 'Follow issue'}
          >
            <span className="interaction-icon">
              {userStatus.isFollowing ? '⭐' : '☆'}
            </span>
            <span className="interaction-count">{interactions.followerCount}</span>
            <span className="interaction-label">
              {userStatus.isFollowing ? 'Following' : 'Follow'}
            </span>
          </button>
        )}
      </div>

      {/* Comments Section */}
      {showCommentsSection && (
        <div className="comments-section">
          <div className="comments-header">
            <h4>Comments ({interactions.commentCount})</h4>
          </div>

          {/* Add Comment Form */}
          {isAuthenticated && (
            <form className="add-comment-form" onSubmit={handleAddComment}>
              <div className="comment-input-group">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows="3"
                  maxLength="1000"
                  disabled={commentLoading}
                />
                <div className="comment-actions">
                  <span className="char-count">
                    {newComment.length}/1000
                  </span>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={commentLoading || !newComment.trim()}
                  >
                    {commentLoading ? 'Adding...' : 'Add Comment'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Comments List */}
          <div className="comments-list">
            {commentLoading && comments.length === 0 ? (
              <div className="loading-comments">Loading comments...</div>
            ) : comments.length === 0 ? (
              <div className="no-comments">
                <span className="no-comments-icon">💬</span>
                <p>No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment._id} className="comment-item">
                  <div className="comment-avatar">
                    {comment.user.avatar ? (
                      <img src={comment.user.avatar} alt={comment.user.name} />
                    ) : (
                      <div className="avatar-placeholder">
                        {comment.user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <div className="comment-content">
                    <div className="comment-header">
                      <span className="comment-author">{comment.user.name}</span>
                      <span className="comment-role">
                        {comment.user.role === 'admin' && '👑'}
                        {comment.user.role === 'authority' && '⚡'}
                      </span>
                      <span className="comment-time">{getTimeAgo(comment.createdAt)}</span>
                      
                      {canDeleteComment(comment) && (
                        <button
                          className="delete-comment-btn"
                          onClick={() => handleDeleteComment(comment._id)}
                          title="Delete comment"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                    
                    <div className="comment-text">
                      {comment.commentText}
                    </div>
                    
                    {comment.isInternal && (
                      <div className="internal-badge">Internal Comment</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueInteractions;