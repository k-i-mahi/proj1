/**
 * Real-time Data Sync Component
 * Provides UI for monitoring and controlling data synchronization
 */

import React, { useState } from 'react';
import { useSyncStatus, useOfflineSupport, useConflictResolution } from '../hooks/useDataSync';
import './SyncStatusIndicator.css';

const SyncStatusIndicator = ({ showDetails = false, position = 'bottom-right' }) => {
  const [expanded, setExpanded] = useState(false);
  const syncStatus = useSyncStatus();
  const offlineSupport = useOfflineSupport();
  const conflictResolution = useConflictResolution();

  const {
    enabled: syncEnabled,
    queueLength,
    inProgress,
    lastSyncTimes,
    enableSync,
    disableSync,
    performSync
  } = syncStatus;

  const {
    isOnline,
    hasOfflineOperations,
    offlineOperationCount
  } = offlineSupport;

  const {
    conflicts,
    hasConflicts,
    resolveConflict,
    dismissConflict
  } = conflictResolution;

  const getSyncStatusColor = () => {
    if (!isOnline) return '#ff6b6b'; // Red for offline
    if (hasConflicts) return '#ffa726'; // Orange for conflicts
    if (inProgress) return '#42a5f5'; // Blue for syncing
    if (syncEnabled) return '#66bb6a'; // Green for active
    return '#bdbdbd'; // Gray for disabled
  };

  const getSyncStatusText = () => {
    if (!isOnline) return 'Offline';
    if (hasConflicts) return `${conflicts.length} Conflicts`;
    if (inProgress) return 'Syncing...';
    if (hasOfflineOperations) return `${offlineOperationCount} Queued`;
    if (syncEnabled) return 'Live';
    return 'Paused';
  };

  const handleToggleSync = () => {
    if (syncEnabled) {
      disableSync();
    } else {
      enableSync();
    }
  };

  const handleConflictResolve = (conflictId, useServer = true) => {
    resolveConflict(conflictId, useServer ? 'server' : 'client');
  };

  if (!showDetails) {
    return (
      <div className={`sync-indicator compact ${position}`}>
        <div 
          className="sync-status"
          style={{ backgroundColor: getSyncStatusColor() }}
          title={getSyncStatusText()}
        >
          <span className="sync-text">{getSyncStatusText()}</span>
          {inProgress && <div className="sync-spinner"></div>}
        </div>
      </div>
    );
  }

  return (
    <div className={`sync-indicator detailed ${position} ${expanded ? 'expanded' : ''}`}>
      <div className="sync-header" onClick={() => setExpanded(!expanded)}>
        <div 
          className="sync-status"
          style={{ backgroundColor: getSyncStatusColor() }}
        >
          <span className="sync-text">{getSyncStatusText()}</span>
          {inProgress && <div className="sync-spinner"></div>}
        </div>
        <button className="expand-btn">
          {expanded ? '▼' : '▲'}
        </button>
      </div>

      {expanded && (
        <div className="sync-details">
          {/* Connection Status */}
          <div className="detail-section">
            <h4>Connection</h4>
            <div className="status-row">
              <span>Network:</span>
              <span className={`status ${isOnline ? 'online' : 'offline'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="status-row">
              <span>Sync:</span>
              <span className={`status ${syncEnabled ? 'enabled' : 'disabled'}`}>
                {syncEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Queue Status */}
          {(queueLength > 0 || hasOfflineOperations) && (
            <div className="detail-section">
              <h4>Queue</h4>
              {queueLength > 0 && (
                <div className="status-row">
                  <span>Pending:</span>
                  <span>{queueLength}</span>
                </div>
              )}
              {hasOfflineOperations && (
                <div className="status-row">
                  <span>Offline:</span>
                  <span>{offlineOperationCount}</span>
                </div>
              )}
            </div>
          )}

          {/* Last Sync Times */}
          {Object.keys(lastSyncTimes).length > 0 && (
            <div className="detail-section">
              <h4>Last Sync</h4>
              {Object.entries(lastSyncTimes).map(([dataType, timestamp]) => (
                <div key={dataType} className="status-row">
                  <span>{dataType}:</span>
                  <span className="sync-time">
                    {new Date(timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Conflicts */}
          {hasConflicts && (
            <div className="detail-section conflicts">
              <h4>Conflicts ({conflicts.length})</h4>
              {conflicts.map((conflict) => (
                <div key={conflict.id} className="conflict-item">
                  <div className="conflict-info">
                    <span className="conflict-type">{conflict.dataType}</span>
                    <span className="conflict-desc">Data conflict detected</span>
                  </div>
                  <div className="conflict-actions">
                    <button 
                      className="btn-resolve server"
                      onClick={() => handleConflictResolve(conflict.id, true)}
                    >
                      Use Server
                    </button>
                    <button 
                      className="btn-resolve client"
                      onClick={() => handleConflictResolve(conflict.id, false)}
                    >
                      Use Local
                    </button>
                    <button 
                      className="btn-dismiss"
                      onClick={() => dismissConflict(conflict.id)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="detail-section actions">
            <button 
              className={`btn-action ${syncEnabled ? 'pause' : 'play'}`}
              onClick={handleToggleSync}
            >
              {syncEnabled ? 'Pause Sync' : 'Start Sync'}
            </button>
            <button 
              className="btn-action sync"
              onClick={performSync}
              disabled={!isOnline || inProgress}
            >
              Sync Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncStatusIndicator;