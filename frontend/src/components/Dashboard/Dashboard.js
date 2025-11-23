import React, { useEffect, useState } from 'react';
import { floorPlanAPI } from '../../services/api';
import toast from 'react-hot-toast';
import './Dashboard.css';

const Dashboard = ({ onSelectFloorPlan }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    buildingName: '',
    floorNumber: 1
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadFloorPlans();
  }, []);

  const loadFloorPlans = async () => {
    try {
      const response = await floorPlanAPI.list();
      setPlans(response.data);
    } catch (error) {
      toast.error('Failed to load floor plans');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      await floorPlanAPI.create({
        ...newPlan,
        initialData: { rooms: [], seats: [], zones: [] }
      }, selectedFile);
      toast.success('Floor plan created successfully');
      setShowCreateModal(false);
      setNewPlan({ name: '', description: '', buildingName: '', floorNumber: 1 });
      setSelectedFile(null);
      loadFloorPlans();
    } catch (error) {
      toast.error(error.message || 'Failed to create floor plan');
    }
  };

  const handleDeletePlan = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(id);
    try {
      await floorPlanAPI.delete(id);
      toast.success('Floor plan deleted successfully');
      loadFloorPlans();
    } catch (error) {
      toast.error(error.message || 'Failed to delete floor plan');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading floor plans...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Floor Plans</h2>
        <button className="btn-create" onClick={() => setShowCreateModal(true)}>
          + Create New Floor Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="empty-state">
          <p>No floor plans found. Create your first one!</p>
        </div>
      ) : (
        <div className="floor-plans-grid">
          {plans.map((plan) => (
            <div key={plan.id} className="floor-plan-card">
              {plan.imageUrl && (
                <div className="plan-image-preview">
                  <img 
                    src={plan.imageUrl.startsWith('http') 
                      ? plan.imageUrl 
                      : `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}${plan.imageUrl.startsWith('/') ? '' : '/'}${plan.imageUrl}`}
                    alt={plan.name}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
              <h3>{plan.name}</h3>
              <p className="plan-description">{plan.description}</p>
              <div className="plan-meta">
                <span>{plan.buildingName}</span>
                <span>Floor {plan.floorNumber}</span>
              </div>
              <div className="card-actions">
                <button
                  className="btn-view"
                  onClick={() => onSelectFloorPlan(plan.id)}
                >
                  Open Editor
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDeletePlan(plan.id, plan.name)}
                  disabled={deletingId === plan.id}
                  title="Delete floor plan"
                >
                  {deletingId === plan.id ? 'Deleting...' : '🗑️ Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Floor Plan</h3>
            <form onSubmit={handleCreatePlan}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Building Name</label>
                <input
                  type="text"
                  value={newPlan.buildingName}
                  onChange={(e) => setNewPlan({ ...newPlan, buildingName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Floor Number</label>
                <input
                  type="number"
                  value={newPlan.floorNumber}
                  onChange={(e) => setNewPlan({ ...newPlan, floorNumber: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Floor Plan Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                />
                {selectedFile && (
                  <p className="file-info">Selected: {selectedFile.name}</p>
                )}
                <small>
                  Upload a blueprint, architectural drawing, or photo of the floor plan. 
                  This will serve as a background reference when editing.
                  <br />
                  Supported formats: JPEG, PNG, GIF, SVG, PDF (Max 10MB)
                </small>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
