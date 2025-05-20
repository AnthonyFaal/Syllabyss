import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:4000/api',
  timeout: 10000, // 10 seconds timeout
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Check internet connection before making request
    if (!navigator.onLine) {
      throw new axios.Cancel('No internet connection');
    }

    // Add authorization token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;  // Fixed missing closing backtick
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with retry logic
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If request was canceled or timeout occurred
    if (axios.isCancel(error)) {
      throw { 
        message: error.message || 'Request canceled',
        isNetworkError: true 
      };
    }
    
    // If timeout error
    if (error.code === 'ECONNABORTED') {
      throw {
        message: 'Request timeout',
        isNetworkError: true
      };
    }

    // If 401 Unauthorized, you might want to refresh token here
    if (error.response?.status === 401) {
      // Add token refresh logic if needed
      // Example:
      // try {
      //   const newToken = await refreshToken();
      //   localStorage.setItem('token', newToken);
      //   originalRequest.headers.Authorization = `Bearer ${newToken}`;
      //   return axiosInstance(originalRequest);
      // } catch (refreshError) {
      //   // Redirect to login or handle token refresh failure
      // }
    }

    // Retry logic (for 5xx errors or network issues)
    if (!originalRequest._retry && 
        (error.response?.status >= 500 || !error.response)) {
      originalRequest._retry = true;
      await new Promise(resolve => setTimeout(resolve, 1000));
      return axiosInstance(originalRequest);
    }

    // Format consistent error response
    const errorMessage = error.response?.data?.message || 
                       error.message || 
                       'Request failed';
    
    throw {
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
      isNetworkError: !error.response
    };
  }
);

export default axiosInstance;