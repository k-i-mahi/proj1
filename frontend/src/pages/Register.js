import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LocationPicker from '../components/LocationPicker';
import './Auth.css';

const Register = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'resident',
    gender: '',
    dateOfBirth: '',
    profession: '',
    latitude: '',
    longitude: '',
    address: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const { register, isAuthenticated, loading, error, clearError } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Clear errors on unmount
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
    clearError();
  };

  const handleLocationChange = (location) => {
    setFormData((prev) => ({
      ...prev,
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address || '',
    }));

    if (validationErrors.latitude || validationErrors.longitude) {
      setValidationErrors((prev) => ({
        ...prev,
        latitude: '',
        longitude: '',
      }));
    }
  };

  const validateStep1 = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors = {};

    if (!formData.latitude || !formData.longitude) {
      errors.location =
        'Location is required. Please use current location or select on map';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep2()) {
      return;
    }

    if (!agreedToTerms) {
      showError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    try {
      const { confirmPassword, ...registrationData } = formData;
      await register(registrationData);
      success('Account created successfully! Welcome to Civita 🎉');
    } catch (err) {
      showError(err.message || 'Registration failed. Please try again.');
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      showError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        success('Location obtained successfully!');
      },
      (error) => {
        showError('Unable to get your location. Please enter manually.');
      },
    );
  };

  const renderStepIndicator = () => (
    <div className="step-indicator">
      <div
        className={`step ${currentStep >= 1 ? 'active' : ''} ${
          currentStep > 1 ? 'completed' : ''
        }`}
      >
        <div className="step-number">{currentStep > 1 ? '✓' : '1'}</div>
        <div className="step-label">Account</div>
      </div>
      <div className="step-line"></div>
      <div
        className={`step ${currentStep >= 2 ? 'active' : ''} ${
          currentStep > 2 ? 'completed' : ''
        }`}
      >
        <div className="step-number">{currentStep > 2 ? '✓' : '2'}</div>
        <div className="step-label">Location</div>
      </div>
      <div className="step-line"></div>
      <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
        <div className="step-number">3</div>
        <div className="step-label">Profile</div>
      </div>
    </div>
  );

  return (
    <div className="auth-container">
      <div className="auth-wrapper register-wrapper">
        {/* Left Side - Form */}
        <div className="auth-form-section">
          <div className="auth-form-content">
            {/* Logo */}
            <Link to="/" className="auth-logo">
              <span className="logo-icon">🏙️</span>
              <span className="logo-text">Civita</span>
            </Link>

            {/* Header */}
            <div className="auth-header">
              <h1 className="auth-title">Create Account</h1>
              <p className="auth-subtitle">
                Join our community and make a difference
              </p>
            </div>

            {/* Step Indicator */}
            {renderStepIndicator()}

            {/* Error Alert */}
            {error && (
              <div className="alert alert-error">
                <span className="alert-icon">⚠️</span>
                <span className="alert-message">{error}</span>
                <button className="alert-close" onClick={clearError}>
                  ✕
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="auth-form">
              {/* Step 1: Account Details */}
              {currentStep === 1 && (
                <div className="form-step">
                  {/* Name */}
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">
                      Full Name *
                    </label>
                    <div className="input-wrapper">
                      <span className="input-icon">👤</span>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`form-input ${
                          validationErrors.name ? 'error' : ''
                        }`}
                        placeholder="Khadimul Islam Mahi"
                        disabled={loading}
                      />
                    </div>
                    {validationErrors.name && (
                      <span className="field-error">
                        {validationErrors.name}
                      </span>
                    )}
                  </div>

                  {/* Email */}
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">
                      Email Address *
                    </label>
                    <div className="input-wrapper">
                      <span className="input-icon">📧</span>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`form-input ${
                          validationErrors.email ? 'error' : ''
                        }`}
                        placeholder="you@example.com"
                        disabled={loading}
                      />
                    </div>
                    {validationErrors.email && (
                      <span className="field-error">
                        {validationErrors.email}
                      </span>
                    )}
                  </div>

                  {/* Password */}
                  <div className="form-group">
                    <label htmlFor="password" className="form-label">
                      Password *
                    </label>
                    <div className="input-wrapper">
                      <span className="input-icon">🔒</span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className={`form-input ${
                          validationErrors.password ? 'error' : ''
                        }`}
                        placeholder="At least 6 characters"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                    {validationErrors.password && (
                      <span className="field-error">
                        {validationErrors.password}
                      </span>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="form-group">
                    <label htmlFor="confirmPassword" className="form-label">
                      Confirm Password *
                    </label>
                    <div className="input-wrapper">
                      <span className="input-icon">🔒</span>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`form-input ${
                          validationErrors.confirmPassword ? 'error' : ''
                        }`}
                        placeholder="Re-enter password"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                    {validationErrors.confirmPassword && (
                      <span className="field-error">
                        {validationErrors.confirmPassword}
                      </span>
                    )}
                  </div>

                  {/* Role */}
                  <div className="form-group">
                    <label htmlFor="role" className="form-label">
                      Role *
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="form-input"
                      disabled={loading}
                    >
                      <option value="resident">Resident</option>
                      <option value="authority">Authority</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    onClick={handleNextStep}
                    disabled={loading}
                  >
                    Continue →
                  </button>
                </div>
              )}

              {/* Step 2: Location */}
              {currentStep === 2 && (
                <div className="form-step">
                  <div className="form-group">
                    <label className="form-label">Location *</label>
                    <LocationPicker
                      latitude={formData.latitude}
                      longitude={formData.longitude}
                      address={formData.address}
                      onLocationChange={handleLocationChange}
                      showMap={true}
                      height="300px"
                    />
                    {validationErrors.location && (
                      <span className="field-error">
                        {validationErrors.location}
                      </span>
                    )}
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handlePreviousStep}
                      disabled={loading}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleNextStep}
                      disabled={loading}
                    >
                      Continue →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Additional Info */}
              {currentStep === 3 && (
                <div className="form-step">
                  {/* Gender */}
                  <div className="form-group">
                    <label htmlFor="gender" className="form-label">
                      Gender (Optional)
                    </label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="form-input"
                      disabled={loading}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Date of Birth */}
                  <div className="form-group">
                    <label htmlFor="dateOfBirth" className="form-label">
                      Date of Birth (Optional)
                    </label>
                    <input
                      type="date"
                      id="dateOfBirth"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className="form-input"
                      disabled={loading}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  {/* Profession */}
                  <div className="form-group">
                    <label htmlFor="profession" className="form-label">
                      Profession (Optional)
                    </label>
                    <div className="input-wrapper">
                      <span className="input-icon">💼</span>
                      <input
                        type="text"
                        id="profession"
                        name="profession"
                        value={formData.profession}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="e.g., Engineer, Teacher"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Terms Agreement */}
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        disabled={loading}
                      />
                      <span>
                        I agree to the{' '}
                        <Link to="/terms" target="_blank">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy" target="_blank">
                          Privacy Policy
                        </Link>
                      </span>
                    </label>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handlePreviousStep}
                      disabled={loading}
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading || !agreedToTerms}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-small"></span>
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>

            {/* Sign In Link */}
            <div className="auth-footer">
              <p className="footer-text">
                Already have an account?{' '}
                <Link to="/login" className="footer-link">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Info */}
        <div className="auth-info-section">
          <div className="info-content">
            <div className="info-icon">🚀</div>
            <h2 className="info-title">Join Civita Today</h2>
            <p className="info-description">
              Create your free account and start making a difference in your
              community
            </p>

            <div className="info-stats">
              <div className="stat-box">
                <div className="stat-number">10K+</div>
                <div className="stat-label">Active Users</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">5K+</div>
                <div className="stat-label">Issues Resolved</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">50+</div>
                <div className="stat-label">Cities</div>
              </div>
            </div>

            <div className="info-benefits">
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span className="benefit-text">
                  Free forever, no hidden fees
                </span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span className="benefit-text">Report issues in seconds</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span className="benefit-text">
                  Real-time progress tracking
                </span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span className="benefit-text">Community engagement tools</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
