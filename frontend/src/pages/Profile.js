import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import authService from '../services/authService';
import Modal from '../components/Modal';
import Feedback from '../components/Feedback';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import LocationPicker from '../components/LocationPicker';
import './Profile.css';

const Profile = () => {
  const { user, updateUser, changePassword } = useAuth();
  const { success, error: showError } = useToast();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [userStats, setUserStats] = useState(null);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    gender: user?.gender || '',
    dateOfBirth: user?.dateOfBirth?.split('T')[0] || '',
    profession: user?.profession || '',
    latitude: user?.location?.latitude || '',
    longitude: user?.location?.longitude || '',
    address: user?.location?.address || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadUserStats();
  }, []);

  // Update profileData when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        gender: user.gender || '',
        dateOfBirth: user.dateOfBirth?.split('T')[0] || '',
        profession: user.profession || '',
        latitude: user.location?.latitude || '',
        longitude: user.location?.longitude || '',
        address: user.location?.address || '',
      });
    }
  }, [user]);

  const loadUserStats = async () => {
    try {
      const stats = await authService.getUserStats();
      setUserStats(stats);
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleLocationChange = (location) => {
    setProfileData((prev) => ({
      ...prev,
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address || '',
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateProfile = () => {
    const newErrors = {};

    if (!profileData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!profileData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      newErrors.email = 'Email is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    if (!validateProfile()) {
      return;
    }

    try {
      setLoading(true);

      // Prepare data for submission
      const updateData = {
        name: profileData.name,
        email: profileData.email,
        gender: profileData.gender || null,
        profession: profileData.profession || '',
      };

      // Add date of birth if provided
      if (profileData.dateOfBirth) {
        updateData.dateOfBirth = profileData.dateOfBirth;
      }

      // Add location if both latitude and longitude are provided
      if (profileData.latitude && profileData.longitude) {
        updateData.latitude = parseFloat(profileData.latitude);
        updateData.longitude = parseFloat(profileData.longitude);
        if (profileData.address) {
          updateData.address = profileData.address;
        }
      }

      await updateUser(updateData);
      success('Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      showError(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!validatePassword()) {
      return;
    }

    try {
      setLoading(true);
      await changePassword(
        passwordData.currentPassword,
        passwordData.newPassword,
      );
      success('Password changed successfully');
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setErrors({});
    } catch (error) {
      showError(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-header-content">
            <Avatar src={user?.avatar} name={user?.name} size="large" />
            <div className="profile-header-info">
              <h1 className="profile-name">{user?.name}</h1>
              <p className="profile-email">{user?.email}</p>
              <Badge type="role" value={user?.role} size="medium" />
            </div>
          </div>
          <div className="profile-header-actions">
            <button
              className="btn btn-outline"
              onClick={() => setShowPasswordModal(true)}
            >
              🔒 Change Password
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          <button
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile Information
          </button>
          <button
            className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            Statistics
          </button>
          <button
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        {/* Tab Content */}
        <div className="profile-content">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="profile-tab">
              <form onSubmit={handleProfileSubmit} className="profile-form">
                <div className="form-section">
                  <h3 className="section-title">Basic Information</h3>

                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="name" className="form-label">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={profileData.name}
                        onChange={handleProfileChange}
                        className={`form-input ${errors.name ? 'error' : ''}`}
                        disabled={loading}
                      />
                      {errors.name && (
                        <span className="field-error">{errors.name}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="email" className="form-label">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={profileData.email}
                        onChange={handleProfileChange}
                        className={`form-input ${errors.email ? 'error' : ''}`}
                        disabled={loading}
                      />
                      {errors.email && (
                        <span className="field-error">{errors.email}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="gender" className="form-label">
                        Gender
                      </label>
                      <select
                        id="gender"
                        name="gender"
                        value={profileData.gender}
                        onChange={handleProfileChange}
                        className="form-input"
                        disabled={loading}
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="dateOfBirth" className="form-label">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        id="dateOfBirth"
                        name="dateOfBirth"
                        value={profileData.dateOfBirth}
                        onChange={handleProfileChange}
                        className="form-input"
                        disabled={loading}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    <div className="form-group form-group-full">
                      <label htmlFor="profession" className="form-label">
                        Profession
                      </label>
                      <input
                        type="text"
                        id="profession"
                        name="profession"
                        value={profileData.profession}
                        onChange={handleProfileChange}
                        className="form-input"
                        placeholder="e.g., Software Engineer"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="section-title">Location</h3>
                  <LocationPicker
                    latitude={profileData.latitude}
                    longitude={profileData.longitude}
                    address={profileData.address}
                    onLocationChange={handleLocationChange}
                    disabled={loading}
                    showMap={true}
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'stats' && (
            <div className="stats-tab">
              {!userStats ? (
                <Feedback type="loading" />
              ) : (
                <>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon stat-icon-primary">📝</div>
                      <div className="stat-content">
                        <div className="stat-value">
                          {userStats.issues?.totalReported || 0}
                        </div>
                        <div className="stat-label">Issues Reported</div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon stat-icon-success">✅</div>
                      <div className="stat-content">
                        <div className="stat-value">
                          {userStats.issues?.resolved || 0}
                        </div>
                        <div className="stat-label">Issues Resolved</div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon stat-icon-warning">⚙️</div>
                      <div className="stat-content">
                        <div className="stat-value">
                          {userStats.issues?.inProgress || 0}
                        </div>
                        <div className="stat-label">In Progress</div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon stat-icon-info">🔔</div>
                      <div className="stat-content">
                        <div className="stat-value">
                          {userStats.issues?.open || 0}
                        </div>
                        <div className="stat-label">Open Issues</div>
                      </div>
                    </div>
                  </div>

                  <div className="stats-section">
                    <h3 className="section-title">Engagement</h3>
                    <div className="engagement-stats">
                      <div className="engagement-item">
                        <span className="engagement-icon">💬</span>
                        <span className="engagement-label">Comments</span>
                        <span className="engagement-value">
                          {userStats.interactions?.comments || 0}
                        </span>
                      </div>
                      <div className="engagement-item">
                        <span className="engagement-icon">👍</span>
                        <span className="engagement-label">Upvotes</span>
                        <span className="engagement-value">
                          {userStats.interactions?.upvotes || 0}
                        </span>
                      </div>
                      <div className="engagement-item">
                        <span className="engagement-icon">⭐</span>
                        <span className="engagement-label">Following</span>
                        <span className="engagement-value">
                          {userStats.interactions?.follows || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="settings-tab">
              <div className="settings-section">
                <h3 className="section-title">Account Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Account Status</span>
                    <Badge
                      type="custom"
                      value={user?.isActive ? 'Active' : 'Inactive'}
                      variant={user?.isActive ? '#10b981' : '#ef4444'}
                    />
                  </div>
                  <div className="info-item">
                    <span className="info-label">Role</span>
                    <Badge type="role" value={user?.role} />
                  </div>
                  <div className="info-item">
                    <span className="info-label">Member Since</span>
                    <span className="info-value">
                      {formatDate(user?.createdAt)}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Last Updated</span>
                    <span className="info-value">
                      {formatDate(user?.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3 className="section-title">Security</h3>
                <div className="security-actions">
                  <button
                    className="btn btn-outline"
                    onClick={() => setShowPasswordModal(true)}
                  >
                    🔒 Change Password
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Password Change Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          });
          setErrors({});
        }}
        title="Change Password"
        size="small"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowPasswordModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              onClick={handlePasswordSubmit}
              disabled={loading}
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </>
        }
      >
        <form onSubmit={handlePasswordSubmit} className="password-form">
          <div className="form-group">
            <label htmlFor="currentPassword" className="form-label">
              Current Password
            </label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              className={`form-input ${errors.currentPassword ? 'error' : ''}`}
              placeholder="Enter current password"
            />
            {errors.currentPassword && (
              <span className="field-error">{errors.currentPassword}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="newPassword" className="form-label">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              className={`form-input ${errors.newPassword ? 'error' : ''}`}
              placeholder="Enter new password"
            />
            {errors.newPassword && (
              <span className="field-error">{errors.newPassword}</span>
            )}
            <span className="field-hint">Minimum 6 characters</span>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
              placeholder="Re-enter new password"
            />
            {errors.confirmPassword && (
              <span className="field-error">{errors.confirmPassword}</span>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Profile;
