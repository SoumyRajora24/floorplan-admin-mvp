import React from 'react';
import { floorPlanAPI } from '../../services/api';
import toast from 'react-hot-toast';
import './ConflictDialog.css';

const ConflictDialog = ({ conflict, floorPlanId, onResolved, onCancel }) => {
  const handleResolve = async (resolution) => {
    try {
      await floorPlanAPI.resolveConflict(floorPlanId, {
        resolvedSnapshot: resolution,
        changeSummary: 'Manual conflict resolution',
        baseVersionId: conflict.baseVersionId,
      });
      toast.success('Conflict resolved successfully');
      onResolved();
    } catch (error) {
      toast.error('Failed to resolve conflict');
    }
  };

  return (
    <div className="conflict-overlay">
      <div className="conflict-dialog">
        <h3>⚠️ Conflict Detected</h3>
        <p>
          The floor plan has been modified by another user. Please review the changes
          and choose how to resolve the conflict.
        </p>

        <div className="conflict-details">
          <h4>Conflicting Changes:</h4>
          {conflict.conflictingEntities && conflict.conflictingEntities.length > 0 ? (
            <ul>
              {conflict.conflictingEntities.map((entity, idx) => (
                <li key={idx}>
                  <strong>{entity.entityType}</strong> (ID: {entity.entityId})
                  <br />
                  Resolution: {entity.resolution}
                </li>
              ))}
            </ul>
          ) : (
            <p>Multiple entities were modified.</p>
          )}
        </div>

        <div className="conflict-actions">
          <button onClick={onCancel} className="btn-cancel">
            Cancel My Changes
          </button>
          <button
            onClick={() => handleResolve(conflict.mergedSnapshot)}
            className="btn-accept"
          >
            Accept Auto-Merge
          </button>
        </div>

        <p className="conflict-note">
          <small>
            Note: Conflicts are typically auto-resolved based on user roles and timestamps.
            Manual intervention is only needed when automatic resolution is not possible.
          </small>
        </p>
      </div>
    </div>
  );
};

export default ConflictDialog;
