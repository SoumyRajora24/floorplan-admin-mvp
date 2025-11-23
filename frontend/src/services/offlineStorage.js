import localforage from 'localforage';

localforage.config({
  name: 'FloorPlanApp',
  storeName: 'floorplan_data',
  description: 'Offline storage for floor plan data'
});

class OfflineStorage {
  async saveFloorPlan(floorPlanId, data) {
    return await localforage.setItem(`floorplan_${floorPlanId}`, data);
  }

  async getFloorPlan(floorPlanId) {
    return await localforage.getItem(`floorplan_${floorPlanId}`);
  }

  async removeFloorPlan(floorPlanId) {
    return await localforage.removeItem(`floorplan_${floorPlanId}`);
  }

  async getQueuedOperations() {
    const queue = await localforage.getItem('operations_queue');
    return queue || [];
  }

  async addQueuedOperation(operation) {
    const queue = await this.getQueuedOperations();
    queue.push({
      ...operation,
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    });
    await localforage.setItem('operations_queue', queue);
    return queue;
  }

  async removeQueuedOperation(operationId) {
    const queue = await this.getQueuedOperations();
    const filtered = queue.filter(op => op.id !== operationId);
    await localforage.setItem('operations_queue', filtered);
    return filtered;
  }

  async clearQueue() {
    await localforage.setItem('operations_queue', []);
  }

  async saveUser(user) {
    return await localforage.setItem('current_user', user);
  }

  async getUser() {
    return await localforage.getItem('current_user');
  }

  async removeUser() {
    return await localforage.removeItem('current_user');
  }

  async clearAll() {
    return await localforage.clear();
  }
}

export default new OfflineStorage();
