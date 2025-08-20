import { Navigate } from 'react-router-dom';
import { getAuthToken } from '../utils/authToken';

const GuestRoute = ({ children }) => {
  const token = getAuthToken();
  const remember = localStorage.getItem('rememberMe') === 'true';

  return token && remember ? <Navigate to="/app/dashboard" replace /> : children;
};

export default GuestRoute;
