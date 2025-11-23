import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import FloorPlanEditor from './components/FloorPlanEditor/FloorPlanEditor';
import OfflineIndicator from './components/OfflineIndicator/OfflineIndicator';
import { useAuthStore } from './stores/authStore';
import { useOfflineStore } from './stores/offlineStore';
import socketService from './services/socket';
import './App.css';

function App() {
  const { user, token, logout } = useAuthStore();
  const { checkConnection } = useOfflineStore();
  const [selectedFloorPlan, setSelectedFloorPlan] = useState(null);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    const { initialize } = useOfflineStore.getState();
    initialize(); // Load queue on mount

    const handleOnline = () => checkConnection(true);
    const handleOffline = () => checkConnection(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkConnection(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  useEffect(() => {
    if (token) {
      socketService.connect(token);
      return () => socketService.disconnect();
    }
  }, [token]);

  if (!user || !token) {
    return (
      <div className="auth-container">
        {showRegister ? (
          <Register onSwitchToLogin={() => setShowRegister(false)} />
        ) : (
          <Login onSwitchToRegister={() => setShowRegister(true)} />
        )}
        <Toaster position="top-right" />
      </div>
    );
  }

  return (
    <div className="app">
      <OfflineIndicator />
      <header className="app-header">
        <h1>Floor Plan Admin System</h1>
        <div className="user-info">
          <span>Welcome, {user.name} ({user.role})</span>
          <button onClick={logout} className="btn-logout">Logout</button>
        </div>
      </header>
      <main className="app-main">
        {selectedFloorPlan ? (
          <FloorPlanEditor
            floorPlanId={selectedFloorPlan}
            onBack={() => setSelectedFloorPlan(null)}
          />
        ) : (
          <Dashboard onSelectFloorPlan={setSelectedFloorPlan} />
        )}
      </main>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
