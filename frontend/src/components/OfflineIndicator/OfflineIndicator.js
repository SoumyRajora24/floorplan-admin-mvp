import React from 'react';
import { useOfflineStore } from '../../stores/offlineStore';
import './OfflineIndicator.css';

const OfflineIndicator = () => {
  const { isOnline, queuedOperations, syncing } = useOfflineStore();

  if (isOnline && queuedOperations.length === 0) {
    return null;
  }

  return (
    <div className={`offline-indicator ${isOnline ? 'online' : 'offline'}`}>
      <div className="indicator-content">
        {isOnline ? (
          <>
            <span className="status-dot online"></span>
            <span>Online</span>
            {syncing && <span className="sync-status">Syncing...</span>}
            {queuedOperations.length > 0 && !syncing && (
              <span className="queue-count">{queuedOperations.length} pending</span>
            )}
          </>
        ) : (
          <>
            <span className="status-dot offline"></span>
            <span>Offline - Changes will sync when connection restored</span>
            {queuedOperations.length > 0 && (
              <span className="queue-count">{queuedOperations.length} queued</span>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;
