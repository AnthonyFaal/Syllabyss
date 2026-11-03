// src/api/axiosInstance.js
import axios from 'axios';
import { clearAuthToken, getAuthToken } from '../utils/authToken';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const axiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  // Auth should fail fast with a useful message rather than leaving users on a
  // loading button for half a minute when the API is unavailable.
  timeout: 15000,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error) 
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname.startsWith('/app')) {
      clearAuthToken();
      window.location.replace('/auth');
    }

    const errorMessage = error.code === 'ECONNABORTED'
      ? 'The server took too long to respond. Please try again.'
      : error.response?.data?.message ||
                         error.message || 
                         'Request failed';
    
    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
      response: error.response,
    });
  }
);

export default axiosInstance;
