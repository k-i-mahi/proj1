import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './IssueFilters.css';

const IssueFilters = ({
  categories = [],
  onFiltersChange,
  initialFilters = {},
  showUserFilters = true,
}) => {
  const { user } = useAuth();

  const [filters, setFilters] = useState({
    search: initialFilters.search || '',
    status: initialFilters.status || '',
    category: initialFilters.category || '',
    priority: initialFilters.priority || '',
    assignedTo: initialFilters.assignedTo || '',
    reportedBy: initialFilters.reportedBy || '',
    dateRange: initialFilters.dateRange || '',
    sortBy: initialFilters.sortBy || '-createdAt',
    myIssues: initialFilters.myIssues || false,
    following: initialFilters.following || false,
    ...initialFilters,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  useEffect(() => {
    // Count active filters
    const count = Object.entries(filters).filter(([key, value]) => {
      if (key === 'sortBy') return false; // Don't count sort
      return value !== '' && value !== false;
    }).length;

    setActiveFilterCount(count);

    onFiltersChange && onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setFilters((prev) => ({
      ...prev,
      search: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      category: '',
      priority: '',
      assignedTo: '',
      reportedBy: '',
      dateRange: '',
      sortBy: '-createdAt',
      myIssues: false,
      following: false,
    });
  };

  const toggleAdvanced = () => {
    setShowAdvanced(!showAdvanced);
  };

  const quickFilters = [
    { label: 'All', status: '' },
    { label: 'Open', status: 'open' },
    { label: 'In Progress', status: 'in-progress' },
    { label: 'Resolved', status: 'resolved' },
  ];

  return (
    <div className="issue-filters">
      {/* Search Bar */}
      <div className="filter-search">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search issues..."
            value={filters.search}
            onChange={handleSearchChange}
            className="search-input"
          />
          {filters.search && (
            <button
              className="search-clear"
              onClick={() => handleFilterChange('search', '')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Quick Filters */}
      <div className="quick-filters">
        {quickFilters.map((filter) => (
          <button
            key={filter.status}
            className={`quick-filter-btn ${
              filters.status === filter.status ? 'active' : ''
            }`}
            onClick={() => handleFilterChange('status', filter.status)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Main Filters Row */}
      <div className="main-filters">
        {/* Category Filter */}
        <div className="filter-group">
          <label className="filter-label">Category</label>
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="filter-select"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.icon} {cat.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div className="filter-group">
          <label className="filter-label">Priority</label>
          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="filter-select"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {/* Sort Filter */}
        <div className="filter-group">
          <label className="filter-label">Sort By</label>
          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="filter-select"
          >
            <option value="-createdAt">Newest First</option>
            <option value="createdAt">Oldest First</option>
            <option value="-updatedAt">Recently Updated</option>
            <option value="title">Title (A-Z)</option>
            <option value="-title">Title (Z-A)</option>
            <option value="-priority">Priority (High to Low)</option>
            <option value="priority">Priority (Low to High)</option>
            <option value="-stats.upvotes">Most Upvoted</option>
            <option value="-stats.views">Most Viewed</option>
          </select>
        </div>

        {/* Advanced Toggle */}
        <div className="filter-group">
          <button className="btn-advanced" onClick={toggleAdvanced}>
            <span>Advanced</span>
            <span className={`arrow ${showAdvanced ? 'up' : 'down'}`}>▼</span>
            {activeFilterCount > 0 && (
              <span className="filter-badge">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="advanced-filters">
          <div className="advanced-grid">
            {/* Status Filter (detailed) */}
            <div className="filter-group">
              <label className="filter-label">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="filter-group">
              <label className="filter-label">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) =>
                  handleFilterChange('dateRange', e.target.value)
                }
                className="filter-select"
              >
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">Last 3 Months</option>
                <option value="year">This Year</option>
              </select>
            </div>

            {/* User-specific Filters */}
            {showUserFilters && user && (
              <>
                {/* My Issues */}
                <div className="filter-group">
                  <label className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.myIssues}
                      onChange={(e) =>
                        handleFilterChange('myIssues', e.target.checked)
                      }
                    />
                    <span>My Issues Only</span>
                  </label>
                </div>

                {/* Following */}
                <div className="filter-group">
                  <label className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.following}
                      onChange={(e) =>
                        handleFilterChange('following', e.target.checked)
                      }
                    />
                    <span>Following</span>
                  </label>
                </div>

                {/* Assigned to Me (for authority/admin) */}
                {(user.role === 'authority' || user.role === 'admin') && (
                  <div className="filter-group">
                    <label className="filter-checkbox">
                      <input
                        type="checkbox"
                        checked={filters.assignedTo === user._id}
                        onChange={(e) =>
                          handleFilterChange(
                            'assignedTo',
                            e.target.checked ? user._id : '',
                          )
                        }
                      />
                      <span>Assigned to Me</span>
                    </label>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Clear Filters Button */}
          {activeFilterCount > 0 && (
            <div className="filter-actions">
              <button className="btn-clear-filters" onClick={clearFilters}>
                <span>✕</span>
                Clear All Filters ({activeFilterCount})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active Filters Pills */}
      {activeFilterCount > 0 && (
        <div className="active-filters">
          <span className="active-filters-label">Active Filters:</span>
          <div className="filter-pills">
            {filters.search && (
              <div className="filter-pill">
                <span>Search: "{filters.search}"</span>
                <button onClick={() => handleFilterChange('search', '')}>
                  ✕
                </button>
              </div>
            )}
            {filters.status && (
              <div className="filter-pill">
                <span>Status: {filters.status}</span>
                <button onClick={() => handleFilterChange('status', '')}>
                  ✕
                </button>
              </div>
            )}
            {filters.category && (
              <div className="filter-pill">
                <span>
                  Category:{' '}
                  {
                    categories.find((c) => c._id === filters.category)
                      ?.displayName
                  }
                </span>
                <button onClick={() => handleFilterChange('category', '')}>
                  ✕
                </button>
              </div>
            )}
            {filters.priority && (
              <div className="filter-pill">
                <span>Priority: {filters.priority}</span>
                <button onClick={() => handleFilterChange('priority', '')}>
                  ✕
                </button>
              </div>
            )}
            {filters.dateRange && (
              <div className="filter-pill">
                <span>Date: {filters.dateRange}</span>
                <button onClick={() => handleFilterChange('dateRange', '')}>
                  ✕
                </button>
              </div>
            )}
            {filters.myIssues && (
              <div className="filter-pill">
                <span>My Issues</span>
                <button onClick={() => handleFilterChange('myIssues', false)}>
                  ✕
                </button>
              </div>
            )}
            {filters.following && (
              <div className="filter-pill">
                <span>Following</span>
                <button onClick={() => handleFilterChange('following', false)}>
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueFilters;
