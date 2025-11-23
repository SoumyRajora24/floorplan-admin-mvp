import { create } from 'zustand';
import offlineStorage from '../services/offlineStorage';
import { syncAPI } from '../services/api';
import toast from 'react-hot-toast';

export const useOfflineStore = create((set, get) => ({
  isOnline: navigator.onLine,
  queuedOperations: [],
  syncing: false,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    
    const queue = await offlineStorage.getQueuedOperations();
    set({ queuedOperations: queue, initialized: true });
    
    // Auto-sync if online
    if (get().isOnline && queue.length > 0) {
      get().syncOfflineChanges();
    }
  },

  checkConnection: async (online) => {
    set({ isOnline: online });
    
    if (online) {
      toast.success('Back online');
      // Ensure queue is loaded
      if (!get().initialized) {
        await get().initialize();
      } else {
        get().syncOfflineChanges();
      }
    } else {
      toast.error('You are offline. Changes will be saved locally.');
    }
  },

  addOperation: async (operation) => {
    const queue = await offlineStorage.addQueuedOperation(operation);
    set({ queuedOperations: queue });
    
    if (get().isOnline) {
      get().syncOfflineChanges();
    }
  },

  syncOfflineChanges: async () => {
    const { isOnline, syncing } = get();
    
    if (!isOnline || syncing) return;

    const operations = await offlineStorage.getQueuedOperations();
    
    if (operations.length === 0) return;

    set({ syncing: true });

    try {
      const response = await syncAPI.syncOffline(operations);
      const { applied, skipped, conflicts } = response.data;

      // All operations sent to the backend have been processed
      // Remove all of them from the queue (applied, skipped, and conflicts)
      // Conflicts were processed but need manual resolution, but we still remove them
      // from the queue since they've been handled by the backend
      for (const operation of operations) {
        await offlineStorage.removeQueuedOperation(operation.id);
      }

      if (conflicts.length > 0) {
        toast.error(`${conflicts.length} conflict(s) need manual resolution`);
      }

      if (skipped.length > 0) {
        toast.error(`${skipped.length} operation(s) were skipped`);
      }

      // Refresh queue from storage to get accurate count
      const remainingQueue = await offlineStorage.getQueuedOperations();
      set({ queuedOperations: remainingQueue, syncing: false });

      if (applied.length > 0) {
        toast.success(`${applied.length} change(s) synced successfully`);
      }

    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Sync failed. Will retry later.');
      set({ syncing: false });
    }
  }
}));
