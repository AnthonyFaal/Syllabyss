import { Navigate } from 'react-router-dom';
import { getAuthToken } from '../utils/authToken';

const GuestRoute = ({ children }) => {
  const token = getAuthToken();
  return token ? <Navigate to="/app/dashboard" replace /> : children;
};

export default GuestRoute;
