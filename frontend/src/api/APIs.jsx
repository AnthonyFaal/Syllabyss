import axiosInstance from './axiosInstance';

const apiRequest = async ({ method, url, data = null, params = null, headers = {} }) => {
  try {
    const response = await axiosInstance({
      method,
      url,
      data,
      params,
      headers,
    });
    return response;
  } catch (error) {
    console.error('API Error:', error);

    if (error.isNetworkError) {
      throw { message: 'Network error. Please check your connection.' };
    }

    if (error.response?.status === 401) {
      // Handle unauthorized here (optional)
    }

    throw error;
  }
};

export const get = (url, params = {}, headers = {}) =>
  apiRequest({ method: 'get', url, params, headers });

export const post = (url, data = {}, headers = {}) =>
  apiRequest({ method: 'post', url, data, headers });

export const put = (url, data = {}, headers = {}) =>
  apiRequest({ method: 'put', url, data, headers });

export const del = (url, data = {}, headers = {}) =>
  apiRequest({ method: 'delete', url, data, headers });

// Now export the auth API calls using these helpers

export const registerUser = (data) => post('/auth/register', data);

export const loginUser = (data) => post('/auth/login', data);

export const verifyEmail = (token) => get(`/auth/verify/${token}`);

export const updatePassword = (data) => put('/auth/update-password', data);

export const updateUserBio = (userId, bio) => put(`/users/${userId}/bio`, bio);

export const getUsers = () => get('/users');

export const getUserById = (userId) => get(`/users/${userId}`);

export const uploadProfileImage = (userId, file) => {
  const formData = new FormData();
  formData.append('image', file);
  return put(`/users/${userId}/profile-image`, formData, {
    'Content-Type': 'multipart/form-data',
  });
};

// Interest flow API calls

export const createInterestFlow = (data) => post('/interest-flow', data);

export const getInterestFlowsByUserId = (userId) => get(`/interest-flow/user/${userId}`);

export const updateInterestFlow = (interestFlowId, data) => put(`/interest-flow/${interestFlowId}`, data);
