// components/Error/Unauthorized.js
import { FaLock } from "react-icons/fa";
import { Link } from "react-router-dom";
import './Unauthorized.css';

const Unauthorized = () => {
  return (
    <div className="unauthorized-container">
      <div className="unauthorized-content">
        <FaLock size={64} className="unauthorized-icon" />
        <h1>Access Denied</h1>
        <p>You don't have permission to access this page.</p>
        <Link to="/" className="home-link">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;