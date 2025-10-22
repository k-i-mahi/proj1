import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import issueService from '../services/issueService';
import categoryService from '../services/categoryService';
import IssueCard from '../components/IssueCard';
import IssueFilters from '../components/IssueFilters';
import IssueDetailModal from '../components/IssueDetailModal';
import Pagination from '../components/Pagination';
import Feedback from '../components/Feedback';
import './IssueList.css';

const IssueList = () => {
  const { user } = useAuth();
  const { error: showError } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [issues, setIssues] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid or list

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    category: searchParams.get('category') || '',
    priority: searchParams.get('priority') || '',
    sortBy: searchParams.get('sortBy') || '-createdAt',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  // Memoize loadIssues to prevent recreation
  const loadIssues = useCallback(async () => {
    try {
      setLoading(true);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      };

      // Remove empty filter values
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      console.log('📋 Loading issues with params:', params);

      const response = await issueService.getIssues(params);
      
      console.log('📋 Issues response:', {
        dataLength: response.data?.length,
        pagination: response.pagination,
        firstIssue: response.data?.[0]
      });

      setIssues(response.data || []);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination?.total || 0,
        totalPages: response.pagination?.totalPages || 0,
        page: response.pagination?.page || prev.page,
      }));
    } catch (error) {
      console.error('❌ Load issues error:', error);
      showError(error.message || 'Failed to load issues');
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, showError]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]); // Include loadIssues in dependencies

  const loadCategories = async () => {
    try {
      const response = await categoryService.getCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Load categories error:', error);
    }
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleIssueClick = (issue) => {
    setSelectedIssue(issue);
    setShowIssueModal(true);
  };

  const handleIssueUpdate = async () => {
    await loadIssues();
    if (selectedIssue) {
      // Reload selected issue to get updated data
      try {
        const response = await issueService.getIssueById(selectedIssue._id);
        setSelectedIssue(response.data);
      } catch (error) {
        console.error('❌ Failed to reload issue:', error);
        setShowIssueModal(false);
        setSelectedIssue(null);
      }
    }
  };

  return (
    <div className="issue-list-page">
      <div className="issue-list-container">
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">Community Issues</h1>
            <p className="page-subtitle">
              Browse and track issues in your community
            </p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-outline"
              onClick={() => navigate('/map')}
            >
              🗺️ Map View
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/issues/new')}
            >
              ➕ Report Issue
            </button>
          </div>
        </div>

        {/* Filters */}
        <IssueFilters
          categories={categories}
          onFiltersChange={handleFiltersChange}
          initialFilters={filters}
          showUserFilters={!!user}
        />

        {/* View Mode Toggle */}
        <div className="view-controls">
          <div className="view-mode-toggle">
            <button
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              ⊞
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              ☰
            </button>
          </div>

          <div className="results-info">
            {loading ? (
              <span>Loading...</span>
            ) : (
              <span>
                Showing {issues.length} of {pagination.total} issues
              </span>
            )}
          </div>
        </div>

        {/* Issues Grid/List */}
        {loading ? (
          <Feedback type="loading" />
        ) : issues.length === 0 ? (
          <Feedback
            type="empty"
            title="No Issues Found"
            message="No issues match your current filters. Try adjusting your search criteria."
            icon="📭"
            action={() => navigate('/issues/new')}
            actionText="Report First Issue"
          />
        ) : (
          <>
            <div
              className={`issues-container ${
                viewMode === 'list' ? 'list-view' : 'grid-view'
              }`}
            >
              {issues.map((issue) => (
                <IssueCard
                  key={issue._id}
                  issue={issue}
                  onClick={handleIssueClick}
                  viewMode={viewMode}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                showInfo={true}
              />
            )}
          </>
        )}
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
          onUpdate={handleIssueUpdate}
        />
      )}
    </div>
  );
};

export default IssueList;
