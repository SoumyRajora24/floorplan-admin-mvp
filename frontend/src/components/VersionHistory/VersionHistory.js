import React from 'react';
import { floorPlanAPI } from '../../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './VersionHistory.css';

const VersionHistory = ({ floorPlanId, versions, currentVersionId, onClose, onReload }) => {
  const handleRollback = async (versionId) => {
    if (!window.confirm('Are you sure you want to rollback to this version?')) {
      return;
    }

    try {
      await floorPlanAPI.rollback(floorPlanId, versionId);
      toast.success('Rolled back successfully');
      onReload();
    } catch (error) {
      toast.error('Failed to rollback');
    }
  };

  return (
    <div className="version-history">
      <div className="version-header">
        <h3>Version History</h3>
        <button onClick={onClose} className="btn-close-sidebar">×</button>
      </div>

      <div className="version-list">
        {versions.map((version) => (
          <div
            key={version.id}
            className={`version-item ${version.id === currentVersionId ? 'current' : ''}`}
          >
            <div className="version-number">v{version.versionNumber}</div>
            <div className="version-info">
              <div className="version-author">{version.author?.name}</div>
              <div className="version-time">
                {format(new Date(version.createdAt), 'MMM dd, yyyy HH:mm')}
              </div>
              <div className="version-summary">{version.changeSummary}</div>
              {version.changeType && (
                <span className={`change-type ${version.changeType}`}>
                  {version.changeType}
                </span>
              )}
            </div>
            {version.id !== currentVersionId && (
              <button
                onClick={() => handleRollback(version.id)}
                className="btn-rollback"
                title="Rollback to this version"
              >
                ↶
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VersionHistory;
