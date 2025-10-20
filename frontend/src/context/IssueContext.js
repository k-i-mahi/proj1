import React, { createContext, useState, useContext, useCallback } from 'react';
import issueService from '../services/issueService';

const IssueContext = createContext();

export const useIssue = () => {
  const context = useContext(IssueContext);
  if (!context) {
    throw new Error('useIssue must be used within IssueProvider');
  }
  return context;
};

export const IssueProvider = ({ children }) => {
  const [issues, setIssues] = useState([]);
  const [currentIssue, setCurrentIssue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const clearError = useCallback(() => setError(null), []);

  // Fetch all issues
  const fetchIssues = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      const response = await issueService.getIssues(params);
      setIssues(response.data || []);
      if (response.pagination) setPagination(response.pagination);

      return response.data;
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to fetch issues';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch single issue
  const fetchIssue = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);

      const response = await issueService.getIssueById(id);
      setCurrentIssue(response.data);
      return response.data;
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to fetch issue';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create issue
  const createIssue = useCallback(async (issueData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await issueService.createIssue(issueData);
      setIssues((prev) => [response.data, ...prev]);

      return response.data;
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to create issue';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update issue
  const updateIssue = useCallback(async (id, issueData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await issueService.updateIssue(id, issueData);
      setIssues((prev) =>
        prev.map((issue) => (issue._id === id ? response.data : issue)),
      );
      setCurrentIssue((prev) => (prev?._id === id ? response.data : prev));

      return response.data;
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to update issue';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete issue
  const deleteIssue = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);

      await issueService.deleteIssue(id);
      setIssues((prev) => prev.filter((issue) => issue._id !== id));
      setCurrentIssue((prev) => (prev?._id === id ? null : prev));

      return true;
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to delete issue';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Vote on issue
  const voteOnIssue = useCallback(async (id, voteType) => {
    try {
      setError(null);
      setLoading(true);

      const response = await issueService.voteOnIssue(id, voteType);
      const updatedIssue = response.data; // Full issue from backend

      setIssues((prev) =>
        prev.map((issue) => (issue._id === id ? updatedIssue : issue)),
      );
      setCurrentIssue((prev) => (prev?._id === id ? updatedIssue : prev));

      return updatedIssue;
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || 'Failed to vote';
      setError(errorMessage);
      console.error('❌ Vote error in context:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Toggle follow issue
  const toggleFollow = useCallback(async (id) => {
    try {
      setError(null);
      setLoading(true);

      const response = await issueService.toggleFollow(id);
      const updatedIssue = response.data; // Full issue from backend

      setIssues((prev) =>
        prev.map((issue) => (issue._id === id ? updatedIssue : issue)),
      );
      setCurrentIssue((prev) => (prev?._id === id ? updatedIssue : prev));

      return updatedIssue;
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || 'Failed to toggle follow';
      setError(errorMessage);
      console.error('❌ Toggle follow error in context:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    issues,
    currentIssue,
    loading,
    error,
    pagination,

    fetchIssues,
    fetchIssue,
    createIssue,
    updateIssue,
    deleteIssue,
    voteOnIssue,
    toggleFollow,
    clearError,
    setCurrentIssue,
  };

  return (
    <IssueContext.Provider value={value}>{children}</IssueContext.Provider>
  );
};

export default IssueContext;
