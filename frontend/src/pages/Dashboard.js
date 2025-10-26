import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import dataService from '../services/dataService';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Feedback from '../components/Feedback';
import IssueDetailModal from '../components/IssueDetailModal';
import './Dashboard.css';

const Dashboard = () => {
  const { user, getUserStats } = useAuth(); // Get getUserStats from context
  const { error: showError } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalIssues: 0,
    myIssues: 0,
    resolved: 0,
    inProgress: 0,
    open: 0,
  });
  const [recentIssues, setRecentIssues] = useState([]);
  const [myIssues, setMyIssues] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showIssueModal, setShowIssueModal] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Use batch requests for better performance
      const requests = [
        // User stats
        { method: 'GET', endpoint: '/auth/stats', options: { useCache: true, cacheKey: 'user_stats' } },
        // Recent issues
        { method: 'GET', endpoint: '/issues', data: { limit: 6, sort: '-createdAt' }, options: { useCache: true, cacheKey: 'recent_issues' } },
        // My issues
        { method: 'GET', endpoint: '/issues', data: { reportedBy: user._id, limit: 5, sort: '-createdAt' }, options: { useCache: false } },
        // Categories
        { method: 'GET', endpoint: '/categories', data: { limit: 8, isActive: true }, options: { useCache: true, cacheKey: 'dashboard_categories' } }
      ];

      const [statsResponse, recentResponse, myIssuesResponse, categoriesResponse] = await dataService.batchRequests(requests);

      // Process user stats
      if (statsResponse.success && statsResponse.data) {
        const statsData = statsResponse.data;
        setStats({
          totalIssues: statsData.issues?.totalReported || 0,
          myIssues: statsData.issues?.totalReported || 0,
          resolved: statsData.issues?.resolved || 0,
          inProgress: statsData.issues?.inProgress || 0,
          open: statsData.issues?.open || 0,
        });
      } else {
        // Fallback: try to get stats from AuthContext
        try {
          const authStats = await getUserStats();
          setStats({
            totalIssues: authStats.issues?.totalReported || 0,
            myIssues: authStats.issues?.totalReported || 0,
            resolved: authStats.issues?.resolved || 0,
            inProgress: authStats.issues?.inProgress || 0,
            open: authStats.issues?.open || 0,
          });
        } catch (authError) {
          console.warn('Could not load user stats:', authError);
          setStats({
            totalIssues: 0,
            myIssues: 0,
            resolved: 0,
            inProgress: 0,
            open: 0,
          });
        }
      }

      // Process recent issues
      if (recentResponse.success) {
        setRecentIssues(recentResponse.data || []);
      } else {
        console.warn('Failed to load recent issues:', recentResponse.message);
        setRecentIssues([]);
      }

      // Process my issues
      if (myIssuesResponse.success) {
        setMyIssues(myIssuesResponse.data || []);
      } else {
        console.warn('Failed to load my issues:', myIssuesResponse.message);
        setMyIssues([]);
      }

      // Process categories
      if (categoriesResponse.success) {
        setCategories(categoriesResponse.data || []);
      } else {
        console.warn('Failed to load categories:', categoriesResponse.message);
        setCategories([]);
      }

    } catch (err) {
      console.error('Load dashboard error:', err);
      showError('Failed to load dashboard data. Please refresh the page.');
      
      // Set default empty states
      setStats({
        totalIssues: 0,
        myIssues: 0,
        resolved: 0,
        inProgress: 0,
        open: 0,
      });
      setRecentIssues([]);
      setMyIssues([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [user, getUserStats, showError]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleIssueClick = (issue) => {
    setSelectedIssue(issue);
    setShowIssueModal(true);
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <Feedback type="loading" fullPage={true} />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Welcome Section */}
        <div className="welcome-section">
          <div className="welcome-content">
            <h1 className="welcome-title">
              {getGreeting()}, {user.name}! 👋
            </h1>
            <p className="welcome-subtitle">
              Welcome back to your dashboard. Here's what's happening in your
              community.
            </p>
          </div>
          <Link to="/issues/new" className="btn btn-primary btn-large">
            <span className="btn-icon">➕</span>
            <span>Report New Issue</span>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="stats-grid">
          <Card className="stat-card" hover={false} padding="large">
            <div className="stat-icon stat-icon-primary">📊</div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalIssues}</div>
              <div className="stat-label">Total Issues</div>
            </div>
          </Card>

          <Card className="stat-card" hover={false} padding="large">
            <div className="stat-icon stat-icon-warning">⚙️</div>
            <div className="stat-content">
              <div className="stat-value">{stats.inProgress}</div>
              <div className="stat-label">In Progress</div>
            </div>
          </Card>

          <Card className="stat-card" hover={false} padding="large">
            <div className="stat-icon stat-icon-success">✅</div>
            <div className="stat-content">
              <div className="stat-value">{stats.resolved}</div>
              <div className="stat-label">Resolved</div>
            </div>
          </Card>

          <Card className="stat-card" hover={false} padding="large">
            <div className="stat-icon stat-icon-info">🔓</div>
            <div className="stat-content">
              <div className="stat-value">{stats.open}</div>
              <div className="stat-label">Open Issues</div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions-section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="quick-actions-grid">
            <Card
              className="action-card"
              onClick={() => navigate('/issues')}
              hover={true}
            >
              <div className="action-icon">📋</div>
              <h3 className="action-title">Browse Issues</h3>
              <p className="action-description">
                View and track community issues
              </p>
            </Card>

            <Card
              className="action-card"
              onClick={() => navigate('/map')}
              hover={true}
            >
              <div className="action-icon">🗺️</div>
              <h3 className="action-title">Map View</h3>
              <p className="action-description">
                See issues on interactive map
              </p>
            </Card>

            <Card
              className="action-card"
              onClick={() => navigate('/issues/new')}
              hover={true}
            >
              <div className="action-icon">➕</div>
              <h3 className="action-title">Report Issue</h3>
              <p className="action-description">Submit a new community issue</p>
            </Card>

            <Card
              className="action-card"
              onClick={() => navigate('/profile')}
              hover={true}
            >
              <div className="action-icon">👤</div>
              <h3 className="action-title">My Profile</h3>
              <p className="action-description">View and edit your profile</p>
            </Card>
          </div>
        </div>

        {/* My Issues */}
        {myIssues.length > 0 && (
          <div className="my-issues-section">
            <div className="section-header">
              <h2 className="section-title">My Recent Issues</h2>
              <Link to="/my-issues" className="section-link">
                View All →
              </Link>
            </div>
            <div className="issues-list">
              {myIssues.map((issue) => (
                <Card
                  key={issue._id}
                  className="issue-list-item"
                  onClick={() => handleIssueClick(issue)}
                  hover={true}
                  padding="medium"
                >
                  <div className="issue-item-content">
                    <div className="issue-item-header">
                      <h3 className="issue-item-title">{issue.title}</h3>
                      <div className="issue-item-badges">
                        <Badge
                          type="status"
                          value={issue.status}
                          size="small"
                        />
                        <Badge
                          type="priority"
                          value={issue.priority}
                          size="small"
                        />
                      </div>
                    </div>

                    <p className="issue-item-description">
                      {issue.description.substring(0, 100)}
                      {issue.description.length > 100 ? '...' : ''}
                    </p>

                    <div className="issue-item-footer">
                      <div className="issue-item-meta">
                        <span className="meta-item">
                          {issue.category?.icon} {issue.category?.displayName}
                        </span>
                      </div>
                      <span className="issue-item-time">
                        {getTimeAgo(issue.createdAt)}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <div className="categories-section">
            <div className="section-header">
              <h2 className="section-title">Browse by Category</h2>
              <Link to="/categories" className="section-link">
                View All →
              </Link>
            </div>
            <div className="categories-grid">
              {categories.slice(0, 8).map((category) => (
                <Card
                  key={category._id}
                  className="category-card-small"
                  onClick={() => navigate(`/issues?category=${category._id}`)}
                  hover={true}
                  padding="medium"
                >
                  <div
                    className="category-icon-small"
                    style={{ background: category.color }}
                  >
                    {category.icon}
                  </div>
                  <div className="category-info">
                    <h3 className="category-name-small">
                      {category.displayName}
                    </h3>
                    <p className="category-count-small">
                      {category.metadata?.issueCount || 0} issues
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="recent-activity-section">
          <div className="section-header">
            <h2 className="section-title">Recent Community Issues</h2>
            <Link to="/issues" className="section-link">
              View All →
            </Link>
          </div>

          {recentIssues.length === 0 ? (
            <Feedback
              type="empty"
              title="No Issues Yet"
              message="Be the first to report an issue in your community"
              icon="📭"
              action={() => navigate('/issues/new')}
              actionText="Report Issue"
            />
          ) : (
            <div className="issues-grid">
              {recentIssues.map((issue) => (
                <Card
                  key={issue._id}
                  image={issue.images?.[0]?.url}
                  badge={issue.priority === 'urgent' ? '🚨 Urgent' : null}
                  onClick={() => handleIssueClick(issue)}
                  hover={true}
                  padding="medium"
                  header={
                    <div className="issue-card-badges">
                      <Badge type="status" value={issue.status} size="small" />
                      <Badge
                        type="priority"
                        value={issue.priority}
                        size="small"
                      />
                    </div>
                  }
                  footer={
                    <div className="issue-card-footer">
                      <div className="issue-stats">
                        <span className="stat-item">
                          👍 {issue.stats?.upvotes || 0}
                        </span>
                        <span className="stat-item">
                          💬 {issue.stats?.commentCount || 0}
                        </span>
                        <span className="stat-item">
                          👁 {issue.stats?.views || 0}
                        </span>
                      </div>
                      <span className="issue-time">
                        {getTimeAgo(issue.createdAt)}
                      </span>
                    </div>
                  }
                >
                  <h3 className="issue-card-title">{issue.title}</h3>
                  <p className="issue-card-description">
                    {issue.description.substring(0, 100)}
                    {issue.description.length > 100 ? '...' : ''}
                  </p>
                  <div className="issue-card-category">
                    <span className="category-icon">
                      {issue.category?.icon}
                    </span>
                    <span className="category-name">
                      {issue.category?.displayName}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Tips Section */}
        <Card className="tips-card" padding="large">
          <div className="tips-icon">💡</div>
          <div className="tips-content">
            <h3 className="tips-title">Pro Tips</h3>
            <ul className="tips-list">
              <li>Add photos to your issue reports for faster resolution</li>
              <li>Use the map view to find issues near you</li>
              <li>Follow issues to get updates on their progress</li>
              <li>Vote on issues to show community support</li>
            </ul>
          </div>
        </Card>
      </div>

      {/* Issue Detail Modal */}
      {showIssueModal && selectedIssue && (
        <IssueDetailModal
          issue={selectedIssue}
          isOpen={showIssueModal}
          onClose={() => {
            setShowIssueModal(false);
            setSelectedIssue(null);
          }}
          onUpdate={loadDashboardData}
        />
      )}
    </div>
  );
};

export default Dashboard;
