import React, { useState } from 'react';
import { forgotPassword } from '../../api/APIs';
import './UpdatePasswordPage.css';

const UpdatePasswordPage = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!email || !newPassword) {
      setError('Please provide your email and a new password.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await forgotPassword({ email, newPassword });

      setMessage(
        response.data.message || 'Your password has been reset successfully.'
      );
      setEmail('');
      setNewPassword('');
    } catch (err) {
      console.error('Password reset error:', err);
      const serverError = err.response?.data?.error;

      if (serverError) {
        setError(serverError);
      } else if (err.response?.status === 500) {
        setError('Server error occurred. Please try again later.');
      } else {
        setError('Something went wrong. Please check your details and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="update-password-container">
      <div className="update-password-card">
        <h2 className="update-password-title">Reset Your Password</h2>

        <form onSubmit={handleUpdate}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-input"
              placeholder="Enter new password"
              minLength={6}
              required
            />
          </div>

          {error && (
            <div className="error-message" role="alert">
              ⚠️ {error}
            </div>
          )}
          {message && (
            <div className="success-message" role="status">
              ✅ {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="submit-button"
          >
            {loading ? 'Processing...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdatePasswordPage;
