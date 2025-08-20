// src/api/axiosInstance.js
import axios from 'axios';
import { clearAuthToken } from '../utils/authToken';

export const API_BASE_URL = 'https://final-year-server.onrender.com';

const axiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
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
    if (error.response?.status === 401) {
      clearAuthToken();
      window.location.href = '/auth';
    }

    const errorMessage = error.response?.data?.message || 
                         error.message || 
                         'Request failed';
    
    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);

export default axiosInstance;
