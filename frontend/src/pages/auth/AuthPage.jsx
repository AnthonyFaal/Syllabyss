import React, { useState } from 'react';
import { registerUser, loginUser } from '../../api/APIs';
import { useNavigate } from 'react-router-dom';
import FormField from '../../components/Fields/FormField';
import { setAuthToken } from '../../utils/authToken';
import './AuthPage.css';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [agree, setAgree] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setFormData({ name: '', email: '', password: '' });
    setMessage({ text: '', type: '' });
    setAgree(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      if (!isLogin && !agree) {
        setLoading(false);
        return setMessage({ text: 'You must agree to the Terms & Conditions', type: 'error' });
      }

      if (isLogin) {
        const res = await loginUser(formData);
        const { token, userId } = res.data;

        setAuthToken(token, userId, rememberMe);
        rememberMe
          ? localStorage.setItem('rememberMe', 'true')
          : localStorage.removeItem('rememberMe');

        setMessage({ text: 'Login successful!', type: 'success' });
        navigate('/app/dashboard', { replace: true });
      } else {
        const res = await registerUser(formData);
        setMessage({ text: res.data?.message || 'Registered! Check your email to verify.', type: 'success' });
        setIsLogin(true);
        setFormData({ name: '', email: formData.email, password: '' });
        setAgree(false);
      }
    } catch (error) {
      let errorMessage = 'Something went wrong.';
      if (error.response) {
        if (error.response.status === 403) {
          errorMessage = 'Your account is not verified. A new verification email has been sent.';
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      setMessage({ text: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-form-container">
        <div className="auth-form-wrapper">
          <h2 className="form-title">{isLogin ? 'Welcome Back!' : 'Get Started'}</h2>
          <p className="form-subtitle">
            {isLogin ? 'Log in to continue your learning journey' : 'Create an account to experience personalized learning'}
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <FormField type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Enter your username" required />
            )}
            <FormField type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email" required />
            <FormField type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Enter your password" required />

            {isLogin && <a href="/forgot-password" className="forgot-password">Forgot password?</a>}

            <div className="form-options">
              {!isLogin && (
                <div className="form-check">
                  <input type="checkbox" id="agree-terms" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                  <label htmlFor="agree-terms">
                    I agree to the <a href="/terms" target="_blank" rel="noreferrer">Terms & Conditions</a>
                  </label>
                </div>
              )}
              <div className="form-check">
                <input type="checkbox" id="remember-me" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                <label htmlFor="remember-me">Remember me</label>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (isLogin ? 'Logging in...' : 'Signing up...') : (isLogin ? 'Log In' : 'Sign Up')}
            </button>

            {message.text && <div className={`message ${message.type}`}>{message.text}</div>}
          </form>

          <p className="toggle-form">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button type="button" onClick={toggleForm} className="toggle-btn">
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
