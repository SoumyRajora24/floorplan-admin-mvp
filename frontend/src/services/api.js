import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Don't set Content-Type for FormData, let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error.response?.data || error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me')
};

export const floorPlanAPI = {
  list: () => api.get('/floorplans'),
  get: (id) => api.get(`/floorplans/${id}`),
  delete: (id) => api.delete(`/floorplans/${id}`),
  create: (data, file) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        if (typeof data[key] === 'object') {
          formData.append(key, JSON.stringify(data[key]));
        } else {
          formData.append(key, data[key]);
        }
      }
    });
    if (file) {
      formData.append('image', file);
    }
    return api.post('/floorplans', formData);
  },
  update: (id, data, file) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        if (typeof data[key] === 'object') {
          formData.append(key, JSON.stringify(data[key]));
        } else {
          formData.append(key, data[key]);
        }
      }
    });
    if (file) {
      formData.append('image', file);
    }
    return api.put(`/floorplans/${id}`, formData);
  },
  resolveConflict: (id, data) => api.post(`/floorplans/${id}/resolve-conflict`, data),
  getVersionHistory: (id, limit = 50) => api.get(`/floorplans/${id}/versions?limit=${limit}`),
  getVersion: (floorPlanId, versionId) => api.get(`/floorplans/${floorPlanId}/versions/${versionId}`),
  rollback: (floorPlanId, versionId) => api.post(`/floorplans/${floorPlanId}/rollback/${versionId}`),
  compareVersions: (floorPlanId, v1, v2) => api.get(`/floorplans/${floorPlanId}/versions/compare/${v1}/${v2}`)
};

export const bookingAPI = {
  suggest: (data) => api.post('/bookings/suggest', data),
  create: (data) => api.post('/bookings', data),
  getMyBookings: (status) => api.get(`/bookings/my-bookings${status ? `?status=${status}` : ''}`),
  cancel: (id) => api.put(`/bookings/${id}/cancel`),
  submitFeedback: (data) => api.post('/bookings/feedback', data)
};

export const syncAPI = {
  syncOffline: (operations) => api.post('/sync/offline', { operations })
};

export const auditAPI = {
  getEntityTrail: (entityType, entityId, limit = 100) => 
    api.get(`/audit/entity/${entityType}/${entityId}?limit=${limit}`),
  getUserActivity: (userId, limit = 100) => 
    api.get(`/audit/user/${userId}?limit=${limit}`),
  getRecentActivity: (limit = 50) => 
    api.get(`/audit/recent?limit=${limit}`)
};

export default api;
