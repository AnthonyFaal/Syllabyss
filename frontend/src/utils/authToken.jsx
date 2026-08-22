let authToken = null;
let userId = null;

export const setAuthToken = (token, id, remember = false) => {
  authToken = token;
  userId = id;
  if (token) {
    const storage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;
    storage.setItem('token', token);
    storage.setItem('userId', id);
    otherStorage.removeItem('token');
    otherStorage.removeItem('userId');
  } else {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userId');
  }
};

export const getAuthToken = () => authToken || localStorage.getItem('token') || sessionStorage.getItem('token');

export const getUserId = () => userId || localStorage.getItem('userId') || sessionStorage.getItem('userId');

export const clearAuthToken = () => {
  authToken = null;
  userId = null;
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('userId');
  localStorage.removeItem('rememberMe');
};

