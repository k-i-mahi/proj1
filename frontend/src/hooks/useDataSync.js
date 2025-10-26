/**
 * React Hook for Data Synchronization
 * Provides easy-to-use hooks for components to sync data with backend
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import dataSyncService from '../services/dataSyncService';
import { useToast } from '../context/ToastContext';

/**
 * Hook for synced data with automatic updates
 */
export const useSyncedData = (dataType, endpoint, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const { showToast } = useToast();
  const unsubscribeRef = useRef(null);

  const {
    autoSync = true,
    showSyncToasts = false,
    refreshInterval = null
  } = options;

  // Handle data updates from sync service
  const handleDataUpdate = useCallback((syncData) => {
    const { data: newData, action, timestamp } = syncData;
    
    switch (action) {
      case 'fetch':
      case 'update':
        setData(newData);
        setLastSync(timestamp);
        if (showSyncToasts) {
          showToast(`${dataType} updated`, 'success');
        }
        break;
      case 'create':
        if (Array.isArray(data)) {
          setData(prev => [...(prev || []), newData]);
        } else {
          setData(newData);
        }
        setLastSync(timestamp);
        if (showSyncToasts) {
          showToast(`New ${dataType} created`, 'success');
        }
        break;
      case 'delete':
        if (Array.isArray(data)) {
          setData(prev => prev.filter(item => item._id !== newData?.id));
        } else {
          setData(null);
        }
        setLastSync(timestamp);
        if (showSyncToasts) {
          showToast(`${dataType} deleted`, 'info');
        }
        break;
      case 'conflict':
        setError(`Data conflict detected for ${dataType}`);
        if (showSyncToasts) {
          showToast(`Data conflict in ${dataType} - please refresh`, 'warning');
        }
        break;
      case 'inconsistency':
        console.warn(`Data inconsistency in ${dataType}:`, syncData);
        if (showSyncToasts) {
          showToast(`Data sync warning for ${dataType}`, 'warning');
        }
        break;
      default:
        console.warn(`Unknown sync action: ${action}`);
        break;
    }
  }, [data, dataType, showSyncToasts, showToast]);

  // Initial data fetch
  const fetchData = useCallback(async () => {
    if (!endpoint) return;

    setLoading(true);
    setError(null);

    try {
      const response = await dataSyncService.syncedFetch(dataType, endpoint);
      
      if (response.success) {
        setData(response.data);
        setLastSync(Date.now());
      } else {
        setError(response.message || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  }, [dataType, endpoint]);

  // Refresh data manually
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Setup sync subscription
  useEffect(() => {
    if (autoSync && dataType) {
      unsubscribeRef.current = dataSyncService.subscribe(dataType, handleDataUpdate);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [autoSync, dataType, handleDataUpdate]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Setup refresh interval
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refresh, refreshInterval]);

  return {
    data,
    loading,
    error,
    lastSync,
    refresh,
    isStale: lastSync && (Date.now() - lastSync) > 60000 // 1 minute
  };
};

/**
 * Hook for synced operations (create, update, delete)
 */
export const useSyncedOperations = (dataType) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  const create = useCallback(async (endpoint, data) => {
    setLoading(true);
    setError(null);

    try {
      const response = await dataSyncService.syncedCreate(dataType, endpoint, data);
      
      if (response.success) {
        showToast(`${dataType} created successfully`, 'success');
        return response;
      } else {
        setError(response.message);
        showToast(response.message || `Failed to create ${dataType}`, 'error');
        return response;
      }
    } catch (err) {
      const errorMsg = err.message || 'Creation failed';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dataType, showToast]);

  const update = useCallback(async (endpoint, data, clientData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await dataSyncService.syncedUpdate(dataType, endpoint, data, clientData);
      
      if (response.success) {
        showToast(`${dataType} updated successfully`, 'success');
        return response;
      } else {
        setError(response.message);
        showToast(response.message || `Failed to update ${dataType}`, 'error');
        return response;
      }
    } catch (err) {
      const errorMsg = err.message || 'Update failed';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dataType, showToast]);

  const remove = useCallback(async (endpoint) => {
    setLoading(true);
    setError(null);

    try {
      const response = await dataSyncService.syncedDelete(dataType, endpoint);
      
      if (response.success) {
        showToast(`${dataType} deleted successfully`, 'success');
        return response;
      } else {
        setError(response.message);
        showToast(response.message || `Failed to delete ${dataType}`, 'error');
        return response;
      }
    } catch (err) {
      const errorMsg = err.message || 'Deletion failed';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dataType, showToast]);

  return {
    create,
    update,
    remove,
    loading,
    error
  };
};

/**
 * Hook for sync status monitoring
 */
export const useSyncStatus = () => {
  const [status, setStatus] = useState(dataSyncService.getSyncStatus());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateStatus = () => setStatus(dataSyncService.getSyncStatus());
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Update status periodically
    const interval = setInterval(updateStatus, 5000);

    // Listen for network changes
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const enableSync = useCallback(() => {
    dataSyncService.enableSync();
    setStatus(dataSyncService.getSyncStatus());
  }, []);

  const disableSync = useCallback(() => {
    dataSyncService.disableSync();
    setStatus(dataSyncService.getSyncStatus());
  }, []);

  const performSync = useCallback(async () => {
    await dataSyncService.performSync();
    setStatus(dataSyncService.getSyncStatus());
  }, []);

  return {
    ...status,
    isOnline,
    enableSync,
    disableSync,
    performSync
  };
};

/**
 * Hook for offline capabilities
 */
export const useOfflineSupport = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const { showToast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Connection restored - syncing data...', 'success');
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('Connection lost - working offline', 'warning');
    };

    const updateOfflineQueue = () => {
      const status = dataSyncService.getSyncStatus();
      setOfflineQueue(status.offlineQueueLength || 0);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update queue status periodically
    const interval = setInterval(updateOfflineQueue, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [showToast]);

  return {
    isOnline,
    hasOfflineOperations: offlineQueue > 0,
    offlineOperationCount: offlineQueue
  };
};

/**
 * Hook for conflict resolution
 */
export const useConflictResolution = () => {
  const [conflicts, setConflicts] = useState([]);
  const unsubscribeRef = useRef(null);

  const handleConflict = useCallback((syncData) => {
    if (syncData.action === 'conflict') {
      setConflicts(prev => [...prev, {
        id: Date.now(),
        ...syncData.data
      }]);
    }
  }, []);

  useEffect(() => {
    // Subscribe to conflict notifications
    unsubscribeRef.current = dataSyncService.subscribe('conflict', handleConflict);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [handleConflict]);

  const resolveConflict = useCallback((conflictId, resolution) => {
    setConflicts(prev => prev.filter(c => c.id !== conflictId));
    // Additional conflict resolution logic would go here
  }, []);

  const dismissConflict = useCallback((conflictId) => {
    setConflicts(prev => prev.filter(c => c.id !== conflictId));
  }, []);

  return {
    conflicts,
    hasConflicts: conflicts.length > 0,
    resolveConflict,
    dismissConflict
  };
};

const dataSyncHooks = {
  useSyncedData,
  useSyncedOperations,
  useSyncStatus,
  useOfflineSupport,
  useConflictResolution
};

export default dataSyncHooks;