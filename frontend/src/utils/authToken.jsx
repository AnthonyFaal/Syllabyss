let authToken = null;
let userId = null;

export const setAuthToken = (token, id) => {
  authToken = token;
  userId = id;
  if (token) {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', id);
  } else {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
  }
};

export const getAuthToken = () => {
  return authToken || localStorage.getItem('token');
};

export const getUserId = () => {
  return userId || localStorage.getItem('userId');
};

export const clearAuthToken = () => {
  authToken = null;
  userId = null;
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
};

