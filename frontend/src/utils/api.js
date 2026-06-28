import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    let url = import.meta.env.VITE_API_URL;
    if (!url.endsWith('/api')) {
      url = url.replace(/\/$/, '') + '/api';
    }
    return url;
  }
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5000/api';
  }
  return 'https://ai-powered-travel-planner-2tm6.onrender.com/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
});

// Interceptor to add JWT token to every request if user is logged in
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
