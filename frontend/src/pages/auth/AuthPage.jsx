import React, { useState, useEffect } from 'react';
import { registerUser, loginUser } from '../../api/APIs';
import { useNavigate, useLocation } from 'react-router-dom';
import FormField from '../../components/Fields/FormField';
import './AuthPage.css';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [agree, setAgree] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const verified = query.get('verified');
    const userId = query.get('userId');
    const error = query.get('error');

    if (verified === 'true' && userId) {
      setMessage({ text: 'Email verified successfully. Complete your profile.', type: 'success' });
      navigate('/user-interest', { state: { userId } });
    } else if (verified === 'false' && error) {
      setMessage({ text: decodeURIComponent(error), type: 'error' });
    }
  }, [location]);

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
  try {
    if (!isLogin && !agree) {
      return setMessage({ text: 'You must agree to the Terms & Conditions', type: 'error' });
    }

    if (isLogin) {
  const res = await loginUser(formData);
  const token = res.data.token;
  const userId = res.data.userId;

  localStorage.setItem('token', token);
  localStorage.setItem('userId', userId);

  if (rememberMe) {
    localStorage.setItem('rememberMe', 'true');
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7);
    localStorage.setItem('tokenExpiration', expirationDate.toISOString());
  }

  setMessage({ text: 'Login successful!', type: 'success' });

  // Navigate with token and userId in URL
  navigate(`/app/dashboard?token=${encodeURIComponent(token)}&userId=${encodeURIComponent(userId)}`,
  {replace: true }
);
}
 else {
      const res = await registerUser(formData);
      setMessage({
        text: res.message || 'Registered! Check your email to verify.',
        type: 'success'
      });
      setIsLogin(true);
      setFormData(prev => ({ name: '', email: prev.email, password: '' }));
      setAgree(false);
    }
  } catch (error) {
      let errorMessage = 'Something went wrong';
      if (error.response?.status === 422 && error.response.data.errors) {
        errorMessage = error.response.data.errors[0].msg;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setMessage({ text: errorMessage, type: 'error' });
    }
  }

  return (
    <div className="auth-page-container">
      <div className="auth-branding">
        <div className="branding-content">
          <h1>Welcome to LearnUp</h1>
          <p className="tagline">Your AI-powered personalized learning companion</p>
          <div className="features-list">
            <div className="feature-item"><div className="feature-icon">🎯</div><div className="feature-text">Adaptive learning paths</div></div>
            <div className="feature-item"><div className="feature-icon">🤖</div><div className="feature-text">24/7 AI tutor support</div></div>
            <div className="feature-item"><div className="feature-icon">🏆</div><div className="feature-text">Gamified learning rewards</div></div>
          </div>
        </div>
      </div>

      <div className="auth-form-container">
        <div className="auth-form-wrapper">
          <h2 className="form-title">{isLogin ? 'Welcome Back!' : 'Get Started'}</h2>
          <p className="form-subtitle">
            {isLogin
              ? 'Log in to continue your learning journey'
              : 'Create an account to experience personalized learning'}
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <FormField
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your username"
                required
              />
            )}

            <FormField
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />

            <FormField
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />

            {isLogin && (
              <a href="/forgot-password" className="forgot-password">Forgot password?</a>
            )}

            <div className="form-options">
              {!isLogin && (
                <div className="form-check">
                  <input
                    type="checkbox"
                    id="agree-terms"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                  />
                  <label htmlFor="agree-terms">
                    I agree to the <a href="/terms" target="_blank">Terms & Conditions</a>
                  </label>
                </div>
              )}

              <div className="form-check">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember-me">Remember me</label>
              </div>
            </div>

            <button type="submit" className="submit-btn">
              {isLogin ? 'Log In' : 'Sign Up'}
            </button>

            {message.text && (
              <div className={`message ${message.type}`}>{message.text}</div>
            )}
          </form>

          <div className="divider"><span>or continue with</span></div>

          <div className="social-auth">
            <button className="social-btn google-btn">
              <span className="social-icon">G</span> Google
            </button>
            <button className="social-btn facebook-btn">
              <span className="social-icon">f</span> Facebook
            </button>
          </div>

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
