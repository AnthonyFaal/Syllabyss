import { Navigate } from 'react-router-dom';
import { getAuthToken } from '../utils/authToken';

const ProtectedRoute = ({ children }) => {
  const token = getAuthToken();
  const remember = localStorage.getItem('rememberMe') === 'true';

  return token && remember ? children : <Navigate to="/auth" replace />;
};

export default ProtectedRoute;
