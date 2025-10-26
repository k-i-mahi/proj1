import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import issueService from '../services/issueService';
import categoryService from '../services/categoryService';
import './Home.css';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState({
    totalIssues: 0,
    resolved: 0,
    active: 0,
    users: 0,
  });
  const [recentIssues, setRecentIssues] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      // Fetch stats
      const statsResponse = await issueService.getIssueStats();
      setStats({
        totalIssues: statsResponse.data.overall.total || 0,
        resolved: statsResponse.data.overall.resolved || 0,
        active:
          statsResponse.data.overall.open +
            statsResponse.data.overall.inProgress || 0,
        users: 500, // Mock data - replace with actual user count API
      });

      // Fetch recent issues
      const issuesResponse = await issueService.getIssues({
        limit: 6,
        sort: '-createdAt',
      });
      setRecentIssues(issuesResponse.data || []);

      // Fetch categories
      const categoriesResponse = await categoryService.getCategories({
        limit: 8,
      });
      setCategories(categoriesResponse.data || []);
    } catch (err) {
      console.error('Load home data error:', err);
    }
  };

  const features = [
    {
      icon: '📝',
      title: 'Report Issues',
      description: 'Easily report community issues with photos and location',
      color: '#667eea',
    },
    {
      icon: '🗺️',
      title: 'Interactive Map',
      description: 'View issues on an interactive map with real-time updates',
      color: '#f59e0b',
    },
    {
      icon: '📊',
      title: 'Track Progress',
      description: 'Monitor issue status and resolution progress',
      color: '#10b981',
    },
    {
      icon: '👥',
      title: 'Community Driven',
      description: 'Vote, comment, and follow issues that matter to you',
      color: '#8b5cf6',
    },
  ];

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // --- START FIX ---
  // This redirect was preventing logged-in users from seeing the home page.
  /*
  if (isAuthenticated) {
    navigate('/dashboard');
    return null;
  }
  */
  // --- END FIX ---

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="hero-gradient"></div>
          <div className="hero-pattern"></div>
        </div>

        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-icon">🎉</span>
            <span className="badge-text">Making Communities Better</span>
          </div>

          <h1 className="hero-title">
            Welcome to <span className="gradient-text">Civita</span>
          </h1>

          <p className="hero-subtitle">
            Empower your community with modern civic engagement. Report issues,
            track progress, and make a real difference.
          </p>

          {/* --- START FIX --- */}
          {/* Conditionally show Dashboard or Auth buttons */}
          <div className="hero-actions">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary btn-large">
                Go to Dashboard
                <span className="btn-arrow">→</span>
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-large">
                  Get Started
                  <span className="btn-arrow">→</span>
                </Link>
                <Link to="/login" className="btn btn-outline btn-large">
                  Sign In
                </Link>
              </>
            )}
          </div>
          {/* --- END FIX --- */}

          {/* Stats */}
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number">{stats.totalIssues}+</div>
              <div className="stat-label">Issues Reported</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-number">{stats.resolved}+</div>
              <div className="stat-label">Issues Resolved</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-number">{stats.active}+</div>
              <div className="stat-label">Active Now</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-header">
          <h2 className="section-title">Why Choose Civita?</h2>
          <p className="section-subtitle">
            Everything you need to manage and improve your community
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div
                className="feature-icon"
                style={{ background: feature.color }}
              >
                {feature.icon}
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories Section */}
      {categories.length > 0 && (
        <section className="categories-section">
          <div className="section-header">
            <h2 className="section-title">Popular Categories</h2>
            <p className="section-subtitle">Browse issues by category</p>
          </div>

          <div className="categories-grid">
            {categories.map((category) => (
              <Link
                key={category._id}
                to={`/issues?category=${category._id}`}
                className="category-card"
              >
                <span className="category-icon">{category.icon}</span>
                <span className="category-name">{category.displayName}</span>
                <span className="category-count">
                  {category.metadata?.issueCount || 0} issues
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent Issues Section */}
      {recentIssues.length > 0 && (
        <section className="recent-section">
          <div className="section-header">
            <h2 className="section-title">Recent Issues</h2>
            <p className="section-subtitle">
              See what's happening in your community
            </p>
          </div>

          <div className="issues-grid">
            {recentIssues.map((issue) => (
              <div key={issue._id} className="issue-card">
                {issue.images && issue.images.length > 0 && (
                  <div className="issue-image">
                    <img src={issue.images[0].url} alt={issue.title} />
                  </div>
                )}

                <div className="issue-content">
                  <div className="issue-badges">
                    <span className={`status-badge status-${issue.status}`}>
                      {issue.status}
                    </span>
                    <span
                      className={`priority-badge priority-${issue.priority}`}
                    >
                      {issue.priority}
                    </span>
                  </div>

                  <h3 className="issue-title">{issue.title}</h3>

                  <p className="issue-description">
                    {issue.description.substring(0, 80)}...
                  </p>

                  <div className="issue-footer">
                    <div className="issue-meta">
                      <span className="issue-category">
                        {issue.category?.icon} {issue.category?.displayName}
                      </span>
                    </div>
                    <span className="issue-time">
                      {getTimeAgo(issue.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="section-actions">
            {/* --- START FIX --- */}
            {/* Conditionally show Dashboard or Auth button */}
            {isAuthenticated ? (
              <Link to="/issues" className="btn btn-primary">
                See All Issues →
              </Link>
            ) : (
              <Link to="/register" className="btn btn-primary">
                Join to See More →
              </Link>
            )}
            {/* --- END FIX --- */}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Make a Difference?</h2>
          <p className="cta-subtitle">
            Join thousands of community members making their neighborhoods
            better
          </p>
          {/* --- START FIX --- */}
          {/* Conditionally show Dashboard or Auth buttons */}
          <div className="cta-actions">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary btn-large">
                View Your Dashboard
              </Link>
            ) : (
              <Link to="/register" className="btn btn-primary btn-large">
                Create Free Account
              </Link>
            )}
            <Link to="/about" className="btn btn-outline btn-large">
              Learn More
            </Link>
          </div>
          {/* --- END FIX --- */}
        </div>
      </section>


    </div>
  );
};

export default Home;
