import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import authService from '../services/authService';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: verify credentials, 2: reset password
  const [resetToken, setResetToken] = useState('');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { email, username, password, confirmPassword } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleVerifyCredentials = async (e) => {
    e.preventDefault();

    if (!email || !username) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.forgotPassword(email, username);
      
      if (response.success) {
        setResetToken(response.resetToken);
        setStep(2);
        showToast(response.message, 'success');
      } else {
        showToast(response.message || 'Verification failed', 'error');
      }
    } catch (error) {
      showToast(
        error.response?.data?.message || 'Network error occurred',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.resetPassword(resetToken, password);
      
      if (response.success) {
        showToast(response.message, 'success');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        showToast(response.message || 'Password reset failed', 'error');
      }
    } catch (error) {
      showToast(
        error.response?.data?.message || 'Network error occurred',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <div className="forgot-password-header">
          <h2>
            {step === 1 ? 'Forgot Password' : 'Reset Password'}
          </h2>
          <p>
            {step === 1 
              ? 'Enter your email and username to verify your account'
              : 'Enter your new password'
            }
          </p>
        </div>

        {/* Step Indicator */}
        <div className="step-indicator">
          <div className={`step ${step >= 1 ? 'active' : 'inactive'}`}>
            1
          </div>
          <div className={`step-connector ${step >= 2 ? 'active' : ''}`}></div>
          <div className={`step ${step >= 2 ? 'active' : 'inactive'}`}>
            2
          </div>
        </div>

        {step === 1 ? (
          <form onSubmit={handleVerifyCredentials} className="forgot-password-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={onChange}
                placeholder="Enter your email"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={username}
                onChange={onChange}
                placeholder="Enter your username"
                required
                disabled={isLoading}
              />
            </div>

            <button 
              type="submit" 
              className={`forgot-password-btn ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify Account'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="forgot-password-form">
            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={onChange}
                placeholder="Enter new password"
                required
                disabled={isLoading}
                minLength="6"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={onChange}
                placeholder="Confirm new password"
                required
                disabled={isLoading}
                minLength="6"
              />
            </div>

            <button 
              type="submit" 
              className={`forgot-password-btn ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div className="forgot-password-footer">
          <p>
            Remember your password?{' '}
            <Link to="/login" className="forgot-password-link">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;