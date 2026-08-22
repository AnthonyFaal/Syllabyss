import { Navigate } from 'react-router-dom';
import { getAuthToken } from '../utils/authToken';

const ProtectedRoute = ({ children }) => {
  const token = getAuthToken();
  return token ? children : <Navigate to="/auth" replace />;
};

export default ProtectedRoute;
