import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '');

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('swasthid_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const getPhotoUrl = (photo) => {
  if (!photo || typeof photo !== 'string') return null;
  if (photo.startsWith('data:image') || photo.startsWith('http://') || photo.startsWith('https://')) {
    return photo;
  }
  const cleanPath = photo.startsWith('/') ? photo : `/${photo}`;
  return `${API_BASE}${cleanPath}`;
};

export default api;
