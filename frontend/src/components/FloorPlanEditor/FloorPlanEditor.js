import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { floorPlanAPI } from '../../services/api';
import socketService from '../../services/socket';
import { useOfflineStore } from '../../stores/offlineStore';
import BookingPanel from '../BookingPanel/BookingPanel';
import ConflictDialog from '../ConflictDialog/ConflictDialog';
import VersionHistory from '../VersionHistory/VersionHistory';
import toast from 'react-hot-toast';
import './FloorPlanEditor.css';

const FloorPlanEditor = ({ floorPlanId, onBack }) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [floorPlan, setFloorPlan] = useState(null);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [versions, setVersions] = useState([]);
  const [conflict, setConflict] = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imageOpacity, setImageOpacity] = useState(0.3);
  const [showImage, setShowImage] = useState(true);
  const { isOnline, addOperation } = useOfflineStore();

  const loadFloorPlanRef = useRef();
  const loadVersionHistoryRef = useRef();

  const loadFloorPlan = useCallback(async () => {
    try {
      const response = await floorPlanAPI.get(floorPlanId);
      
      let floorPlanData = response;
      
      if (response && response.data && (response.data.id || response.data.currentVersion)) {
        floorPlanData = response.data;
      }
      
      setFloorPlan(floorPlanData);
      
      const currentVersion = floorPlanData.currentVersion;
      const snapshot = currentVersion?.snapshot;
      
      if (snapshot) {
        setNodes(Array.isArray(snapshot.nodes) ? snapshot.nodes : []);
        setEdges(Array.isArray(snapshot.edges) ? snapshot.edges : []);
      } else {
        setNodes([]);
        setEdges([]);
      }
      
      setCurrentVersion(currentVersion || null);
    } catch (error) {
      toast.error('Failed to load floor plan');
      setNodes([]);
      setEdges([]);
    }
  }, [floorPlanId]);

  const loadVersionHistory = useCallback(async () => {
    try {
      const response = await floorPlanAPI.getVersionHistory(floorPlanId, 20);
      setVersions(response.data);
    } catch (error) {
      // Silently fail - version history is not critical
    }
  }, [floorPlanId]);

  loadFloorPlanRef.current = loadFloorPlan;
  loadVersionHistoryRef.current = loadVersionHistory;

  useEffect(() => {
    loadFloorPlan();
    loadVersionHistory();

    socketService.joinFloorPlan(floorPlanId);

    const handleUpdate = (data) => {
      if (data.floorPlanId === floorPlanId) {
        toast('Floor plan updated by ' + data.author.name, { icon: '🔄' });
        loadFloorPlanRef.current();
        loadVersionHistoryRef.current();
      }
    };

    const handleConflict = (data) => {
      if (data.floorPlanId === floorPlanId) {
        toast.error('Conflict detected! Please review before saving.');
      }
    };

    socketService.on('floorPlanUpdated', handleUpdate);
    socketService.on('conflictNotification', handleConflict);

    return () => {
      socketService.leaveFloorPlan(floorPlanId);
      socketService.off('floorPlanUpdated', handleUpdate);
      socketService.off('conflictNotification', handleConflict);
    };
  }, [floorPlanId, loadFloorPlan, loadVersionHistory]);



  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge(params, eds));
  }, []);

  const handleSave = async () => {
    const snapshot = { nodes, edges };

    if (!isOnline) {
      await addOperation({
        type: 'floor_plan_edit',
        floorPlanId,
        baseVersionId: currentVersion?.id,
        changes: snapshot
      });
      toast.success('Changes saved locally. Will sync when online.');
      return;
    }

    try {
      const response = await floorPlanAPI.update(floorPlanId, {
        changes: snapshot,
        baseVersionId: currentVersion?.id,
        changeSummary: 'Floor plan edit'
      }, selectedImageFile);

      if (response.conflict) {
        setConflict(response.data);
        toast.error('Conflict detected! Please resolve.');
      } else {
        toast.success('Floor plan saved successfully');
        setSelectedImageFile(null);
        await loadFloorPlan();
        loadVersionHistory();
      }
    } catch (error) {
      toast.error('Failed to save floor plan');
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImageFile) {
      toast.error('Please select an image file');
      return;
    }

    try {
      await floorPlanAPI.update(floorPlanId, {
        changes: { nodes, edges },
        baseVersionId: currentVersion?.id,
        changeSummary: 'Floor plan image updated'
      }, selectedImageFile);
      toast.success('Image updated successfully');
      setSelectedImageFile(null);
      setShowImageUpload(false);
      await loadFloorPlan();
    } catch (error) {
      toast.error('Failed to update image');
    }
  };

  const addRoom = () => {
    const newNode = {
      id: `room-${Date.now()}`,
      type: 'default',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: `Room ${nodes.length + 1}` },
      style: {
        background: '#e3f2fd',
        border: '1px solid #1976d2',
        borderRadius: '8px',
        padding: '10px',
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <div className="floor-plan-editor">
      <div className="editor-header">
        <button onClick={onBack} className="btn-back">← Back to Dashboard</button>
        <h2>{floorPlan?.name || 'Floor Plan Editor'}</h2>
        <div className="editor-actions">
          <button onClick={addRoom} className="btn-action">+ Add Room</button>
          <button onClick={() => setShowImageUpload(true)} className="btn-action">📷 Upload Image</button>
          {floorPlan?.imageUrl && (
            <>
              <button 
                onClick={() => setShowImage(!showImage)} 
                className="btn-action"
                title={showImage ? "Hide floor plan image" : "Show floor plan image"}
              >
                {showImage ? "👁️ Hide Image" : "👁️‍🗨️ Show Image"}
              </button>
              {showImage && (
                <div className="image-opacity-control">
                  <label>Opacity:</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={imageOpacity * 100}
                    onChange={(e) => setImageOpacity(e.target.value / 100)}
                    title="Adjust image opacity"
                  />
                  <span>{Math.round(imageOpacity * 100)}%</span>
                </div>
              )}
            </>
          )}
          <button onClick={() => setShowBooking(true)} className="btn-action">📅 Bookings</button>
          <button onClick={() => setShowVersions(!showVersions)} className="btn-action">
            📜 History
          </button>
          <button onClick={handleSave} className="btn-save">💾 Save</button>
        </div>
      </div>

      <div className="editor-content">
        <div className={`editor-canvas ${showVersions ? 'with-sidebar' : ''}`}>
          {floorPlan?.imageUrl && showImage && (
            <div className="floor-plan-image-background">
              <img 
                src={floorPlan.imageUrl}
                alt="Floor Plan Background"
                style={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  opacity: imageOpacity,
                  zIndex: 0,
                  pointerEvents: 'none'
                }}
              />
            </div>
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            style={{ position: 'relative', zIndex: 1 }}
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {showVersions && (
          <div className="editor-sidebar">
            <VersionHistory
              floorPlanId={floorPlanId}
              versions={versions}
              currentVersionId={currentVersion?.id}
              onClose={() => setShowVersions(false)}
              onReload={() => {
                loadFloorPlan();
                loadVersionHistory();
              }}
            />
          </div>
        )}
      </div>

      {showBooking && (
        <BookingPanel
          floorPlanId={floorPlanId}
          onClose={() => setShowBooking(false)}
        />
      )}

      {conflict && (
        <ConflictDialog
          conflict={conflict}
          floorPlanId={floorPlanId}
          onResolved={() => {
            setConflict(null);
            loadFloorPlan();
            loadVersionHistory();
          }}
          onCancel={() => setConflict(null)}
        />
      )}

      {showImageUpload && (
        <div className="modal-overlay" onClick={() => setShowImageUpload(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Upload Floor Plan Image</h3>
            <div className="form-group">
              <label>Select Floor Plan Image</label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setSelectedImageFile(e.target.files[0] || null)}
              />
              {selectedImageFile && (
                <p className="file-info">Selected: {selectedImageFile.name}</p>
              )}
              <small>
                Upload a blueprint, architectural drawing, or photo of the floor plan. 
                This will be displayed as a background reference in the editor.
                <br />
                Supported formats: JPEG, PNG, GIF, SVG, PDF (Max 10MB)
              </small>
            </div>
            {floorPlan?.imageUrl && (
              <div className="current-image-preview">
                <p>Current Image:</p>
                <img 
                  src={floorPlan.imageUrl}
                  alt="Current floor plan"
                  style={{ maxWidth: '100%', maxHeight: '200px', marginTop: '10px' }}
                />
              </div>
            )}
            <div className="modal-actions">
              <button type="button" onClick={() => {
                setShowImageUpload(false);
                setSelectedImageFile(null);
              }}>
                Cancel
              </button>
              <button type="button" onClick={handleImageUpload} className="btn-primary" disabled={!selectedImageFile}>
                Upload Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorPlanEditor;
