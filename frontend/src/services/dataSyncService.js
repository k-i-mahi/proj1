/**
 * Data Synchronization Service
 * Handles real-time data updates, cache management, and sync between frontend and backend
 */

import dataService from './dataService';
import { checkDataConsistency } from '../utils/dataValidation';

class DataSyncService {
  constructor() {
    this.syncInterval = null;
    this.syncFrequency = 30000; // 30 seconds
    this.syncEnabled = false;
    this.callbacks = new Map();
    this.lastSync = new Map();
    this.syncQueue = [];
    this.syncInProgress = false;
    this.conflictResolution = 'server-wins'; // server-wins, client-wins, manual
    this.offlineQueue = [];
    this.isOnline = navigator.onLine;
    
    // Setup online/offline listeners
    this.setupNetworkListeners();
    
    // Setup periodic sync
    this.setupPeriodicSync();
  }

  /**
   * Setup network event listeners
   */
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('🟢 Network connection restored');
      this.isOnline = true;
      this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      console.log('🔴 Network connection lost');
      this.isOnline = false;
    });
  }

  /**
   * Setup periodic sync
   */
  setupPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.syncEnabled && this.isOnline) {
        this.performSync();
      }
    }, this.syncFrequency);
  }

  /**
   * Enable/disable sync
   */
  enableSync() {
    this.syncEnabled = true;
    console.log('📡 Data sync enabled');
  }

  disableSync() {
    this.syncEnabled = false;
    console.log('📡 Data sync disabled');
  }

  /**
   * Register callback for data changes
   */
  subscribe(dataType, callback) {
    if (!this.callbacks.has(dataType)) {
      this.callbacks.set(dataType, new Set());
    }
    this.callbacks.get(dataType).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.callbacks.get(dataType);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.callbacks.delete(dataType);
        }
      }
    };
  }

  /**
   * Notify subscribers of data changes
   */
  notify(dataType, data, action = 'update') {
    const callbacks = this.callbacks.get(dataType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback({ dataType, data, action, timestamp: Date.now() });
        } catch (error) {
          console.error('Sync callback error:', error);
        }
      });
    }
  }

  /**
   * Add operation to sync queue
   */
  queueSync(operation) {
    this.syncQueue.push({
      ...operation,
      timestamp: Date.now(),
      id: this.generateId()
    });

    // Process queue if not already processing
    if (!this.syncInProgress) {
      this.processQueue();
    }
  }

  /**
   * Process sync queue
   */
  async processQueue() {
    if (this.syncInProgress || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;

    try {
      while (this.syncQueue.length > 0) {
        const operation = this.syncQueue.shift();
        await this.processSyncOperation(operation);
      }
    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process individual sync operation
   */
  async processSyncOperation(operation) {
    const { type, method, endpoint, data, clientData, dataType } = operation;

    try {
      switch (type) {
        case 'create':
          await this.syncCreate(method, endpoint, data, dataType);
          break;
        case 'update':
          await this.syncUpdate(method, endpoint, data, clientData, dataType);
          break;
        case 'delete':
          await this.syncDelete(method, endpoint, dataType);
          break;
        case 'fetch':
          await this.syncFetch(endpoint, dataType);
          break;
        default:
          console.warn('Unknown sync operation type:', type);
      }
    } catch (error) {
      console.error(`Sync operation failed (${type}):`, error);
      
      // Add to offline queue if network error
      if (!this.isOnline || this.isNetworkError(error)) {
        this.addToOfflineQueue(operation);
      }
    }
  }

  /**
   * Sync create operation
   */
  async syncCreate(method, endpoint, data, dataType) {
    const response = await dataService.request(method, endpoint, data);
    
    if (response.success) {
      this.notify(dataType, response.data, 'create');
      this.updateLastSync(dataType);
    }

    return response;
  }

  /**
   * Sync update operation with conflict resolution
   */
  async syncUpdate(method, endpoint, data, clientData, dataType) {
    // First, get the latest server data
    const serverResponse = await dataService.request('GET', endpoint);
    
    if (serverResponse.success) {
      const serverData = serverResponse.data;
      
      // Check for conflicts
      const conflicts = this.detectConflicts(clientData, serverData);
      
      if (conflicts.length > 0) {
        const resolvedData = await this.resolveConflicts(conflicts, clientData, serverData);
        data = resolvedData;
      }
    }

    // Perform the update
    const response = await dataService.request(method, endpoint, data);
    
    if (response.success) {
      this.notify(dataType, response.data, 'update');
      this.updateLastSync(dataType);
    }

    return response;
  }

  /**
   * Sync delete operation
   */
  async syncDelete(method, endpoint, dataType) {
    const response = await dataService.request(method, endpoint);
    
    if (response.success) {
      this.notify(dataType, null, 'delete');
      this.updateLastSync(dataType);
    }

    return response;
  }

  /**
   * Sync fetch operation
   */
  async syncFetch(endpoint, dataType) {
    const response = await dataService.request('GET', endpoint);
    
    if (response.success) {
      this.notify(dataType, response.data, 'fetch');
      this.updateLastSync(dataType);
    }

    return response;
  }

  /**
   * Detect conflicts between client and server data
   */
  detectConflicts(clientData, serverData) {
    const conflicts = [];

    // Check modification timestamps
    if (clientData.updatedAt && serverData.updatedAt) {
      const clientTime = new Date(clientData.updatedAt);
      const serverTime = new Date(serverData.updatedAt);
      
      if (serverTime > clientTime) {
        conflicts.push({
          type: 'timestamp',
          field: 'updatedAt',
          clientValue: clientData.updatedAt,
          serverValue: serverData.updatedAt
        });
      }
    }

    // Check for field-level conflicts
    const fieldsToCheck = ['title', 'description', 'status', 'priority', 'assignedTo'];
    fieldsToCheck.forEach(field => {
      if (clientData[field] !== undefined && 
          serverData[field] !== undefined && 
          clientData[field] !== serverData[field]) {
        conflicts.push({
          type: 'field',
          field,
          clientValue: clientData[field],
          serverValue: serverData[field]
        });
      }
    });

    return conflicts;
  }

  /**
   * Resolve conflicts based on strategy
   */
  async resolveConflicts(conflicts, clientData, serverData) {
    switch (this.conflictResolution) {
      case 'server-wins':
        return { ...clientData, ...serverData };
      
      case 'client-wins':
        return clientData;
      
      case 'manual':
        return await this.handleManualConflictResolution(conflicts, clientData, serverData);
      
      default:
        return serverData;
    }
  }

  /**
   * Handle manual conflict resolution
   */
  async handleManualConflictResolution(conflicts, clientData, serverData) {
    // This would typically show a UI for the user to resolve conflicts
    // For now, we'll log the conflicts and default to server-wins
    console.warn('Manual conflict resolution required:', conflicts);
    
    // Emit conflict event for UI to handle
    this.notify('conflict', {
      conflicts,
      clientData,
      serverData
    }, 'conflict');

    return serverData; // Default to server-wins
  }

  /**
   * Perform full sync of all data types
   */
  async performSync() {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    const syncStartTime = Date.now();
    console.log('🔄 Starting data sync...');

    try {
      // Define data types to sync
      const dataTypes = [
        { name: 'issues', endpoint: '/issues', priority: 1 },
        { name: 'categories', endpoint: '/categories', priority: 2 },
        { name: 'notifications', endpoint: '/notifications', priority: 3 },
        { name: 'userStats', endpoint: '/auth/stats', priority: 4 }
      ];

      // Sort by priority
      dataTypes.sort((a, b) => a.priority - b.priority);

      // Sync each data type
      for (const dataType of dataTypes) {
        try {
          const lastSyncTime = this.lastSync.get(dataType.name);
          const params = {};

          // Add since parameter if we have a last sync time
          if (lastSyncTime) {
            params.since = new Date(lastSyncTime).toISOString();
          }

          await this.syncFetch(dataType.endpoint, dataType.name);
          
          // Small delay between syncs to prevent overwhelming the server
          await this.delay(100);
        } catch (error) {
          console.error(`Failed to sync ${dataType.name}:`, error);
        }
      }

      const syncDuration = Date.now() - syncStartTime;
      console.log(`✅ Data sync completed in ${syncDuration}ms`);

    } catch (error) {
      console.error('❌ Data sync failed:', error);
    }
  }

  /**
   * Add operation to offline queue
   */
  addToOfflineQueue(operation) {
    this.offlineQueue.push({
      ...operation,
      queuedAt: Date.now()
    });

    console.log(`📥 Added operation to offline queue (${this.offlineQueue.length} pending)`);
  }

  /**
   * Process offline queue when connection is restored
   */
  async processOfflineQueue() {
    if (this.offlineQueue.length === 0) {
      return;
    }

    console.log(`📤 Processing offline queue (${this.offlineQueue.length} operations)`);

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const operation of queue) {
      try {
        await this.processSyncOperation(operation);
      } catch (error) {
        console.error('Failed to process offline operation:', error);
        // Re-add to queue if still failing
        this.addToOfflineQueue(operation);
      }
    }
  }

  /**
   * Validate sync consistency
   */
  async validateConsistency(dataType, clientData, serverId) {
    try {
      const serverResponse = await dataService.request('GET', `/api/${dataType}/${serverId}`);
      
      if (serverResponse.success) {
        const consistency = checkDataConsistency(clientData, serverResponse.data, dataType);
        
        if (!consistency.isConsistent) {
          console.warn(`Data inconsistency detected for ${dataType}:`, consistency.issues);
          this.notify('inconsistency', {
            dataType,
            clientData,
            serverData: serverResponse.data,
            issues: consistency.issues
          }, 'inconsistency');
        }

        return consistency;
      }
    } catch (error) {
      console.error('Consistency validation failed:', error);
    }

    return { isConsistent: false, issues: ['Validation failed'] };
  }

  /**
   * Utility methods
   */
  updateLastSync(dataType) {
    this.lastSync.set(dataType, Date.now());
  }

  generateId() {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isNetworkError(error) {
    return error.code === 'ERR_NETWORK' || 
           error.message.includes('Network') ||
           !navigator.onLine;
  }

  /**
   * High-level sync methods for different data operations
   */

  // Create with sync
  async syncedCreate(dataType, endpoint, data) {
    if (!this.isOnline) {
      this.addToOfflineQueue({
        type: 'create',
        method: 'POST',
        endpoint,
        data,
        dataType
      });
      return { success: false, message: 'Queued for sync when online' };
    }

    return await this.syncCreate('POST', endpoint, data, dataType);
  }

  // Update with sync
  async syncedUpdate(dataType, endpoint, data, clientData = null) {
    if (!this.isOnline) {
      this.addToOfflineQueue({
        type: 'update',
        method: 'PUT',
        endpoint,
        data,
        clientData,
        dataType
      });
      return { success: false, message: 'Queued for sync when online' };
    }

    return await this.syncUpdate('PUT', endpoint, data, clientData, dataType);
  }

  // Delete with sync
  async syncedDelete(dataType, endpoint) {
    if (!this.isOnline) {
      this.addToOfflineQueue({
        type: 'delete',
        method: 'DELETE',
        endpoint,
        dataType
      });
      return { success: false, message: 'Queued for sync when online' };
    }

    return await this.syncDelete('DELETE', endpoint, dataType);
  }

  // Fetch with sync
  async syncedFetch(dataType, endpoint) {
    if (!this.isOnline) {
      // Try to return cached data
      const cached = dataService.getFromCache(`${dataType}_${endpoint}`);
      if (cached) {
        return cached;
      }
      return { success: false, message: 'No cached data available offline' };
    }

    return await this.syncFetch(endpoint, dataType);
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      enabled: this.syncEnabled,
      online: this.isOnline,
      queueLength: this.syncQueue.length,
      offlineQueueLength: this.offlineQueue.length,
      inProgress: this.syncInProgress,
      lastSyncTimes: Object.fromEntries(this.lastSync),
      subscriptions: Array.from(this.callbacks.keys())
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.callbacks.clear();
    this.syncQueue = [];
    this.offlineQueue = [];
    this.lastSync.clear();
  }
}

// Create singleton instance
const dataSyncService = new DataSyncService();

export default dataSyncService;