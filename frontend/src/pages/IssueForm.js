import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import issueService from '../services/issueService';
import categoryService from '../services/categoryService';
import PhotoUpload from '../components/PhotoUpload';
import LocationPicker from '../components/LocationPicker';
import Feedback from '../components/Feedback';
import './IssueForm.css';

const IssueForm = () => {
  const { id } = useParams(); // For editing existing issue
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);
  const [categories, setCategories] = useState([]);
  const [currentStep, setCurrentStep] = useState(1); // 1: Details, 2: Location, 3: Photos

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    latitude: '',
    longitude: '',
    address: '',
    tags: [],
  });

  const [photos, setPhotos] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadCategories();
    if (id) {
      loadIssue();
    }
  }, [id]);

  const loadCategories = async () => {
    try {
      const response = await categoryService.getCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Load categories error:', error);
      showError('Failed to load categories');
    }
  };

  const loadIssue = async () => {
    try {
      setInitialLoading(true);
      const response = await issueService.getIssueById(id);
      const issue = response.data;

      setFormData({
        title: issue.title || '',
        description: issue.description || '',
        category: issue.category?._id || '',
        priority: issue.priority || 'medium',
        latitude: issue.location?.coordinates?.[1] || '', // coordinates are [lng, lat]
        longitude: issue.location?.coordinates?.[0] || '',
        address: issue.location?.address || '',
        tags: issue.tags || [],
      });

      setExistingPhotos(issue.images || []);
    } catch (error) {
      console.error('Load issue error:', error);
      showError('Failed to load issue');
      navigate('/issues');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleLocationChange = (location) => {
    setFormData((prev) => ({
      ...prev,
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address || '',
    }));

    if (errors.location) {
      setErrors((prev) => ({
        ...prev,
        location: '',
      }));
    }
  };

  const handlePhotosChange = (newPhotos) => {
    setPhotos(newPhotos);
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!formData.latitude || !formData.longitude) {
      newErrors.location =
        'Location is required. Please select a location on the map.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

    if (!validateStep1() || !validateStep2()) {
      setCurrentStep(1);
      return;
    }

    try {
      setLoading(true);

      const issueData = new FormData();
      issueData.append('title', formData.title.trim());
      issueData.append('description', formData.description.trim());
      issueData.append('category', formData.category);
      issueData.append('priority', formData.priority);
      issueData.append('latitude', formData.latitude);
      issueData.append('longitude', formData.longitude);
      issueData.append('address', formData.address || '');

      // Add tags as array
      formData.tags.forEach((tag) => {
        issueData.append('tags', tag);
      });

      // Add new photos
      photos.forEach((photo) => {
        issueData.append('images', photo);
      });

      if (id) {
        // Update existing issue
        await issueService.updateIssue(id, issueData);
        success('Issue updated successfully!');
      } else {
        // Create new issue
        await issueService.createIssue(issueData);
        success('Issue reported successfully!');
      }

      navigate('/issues');
    } catch (error) {
      console.error('Submit error:', error);
      showError(error.response?.data?.message || 'Failed to submit issue');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="step-indicator">
      <div
        className={`step ${currentStep >= 1 ? 'active' : ''} ${
          currentStep > 1 ? 'completed' : ''
        }`}
      >
        <div className="step-number">{currentStep > 1 ? '✓' : '1'}</div>
        <div className="step-label">Details</div>
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
        <div className="step-label">Photos</div>
      </div>
    </div>
  );

  if (initialLoading) {
    return (
      <div className="issue-form-page">
        <Feedback type="loading" fullPage={true} />
      </div>
    );
  }

  return (
    <div className="issue-form-page">
      <div className="issue-form-container">
        {/* Header */}
        <div className="form-header">
          <h1 className="form-title">
            {id ? 'Edit Issue' : 'Report New Issue'}
          </h1>
          <p className="form-subtitle">
            {id
              ? 'Update the details of your reported issue'
              : 'Help improve your community by reporting an issue'}
          </p>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Form */}
        <form onSubmit={handleSubmit} className="issue-form">
          {/* Step 1: Details */}
          {currentStep === 1 && (
            <div className="form-step">
              <div className="form-step-content">
                {/* Title */}
                <div className="form-group">
                  <label htmlFor="title" className="form-label">
                    Issue Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className={`form-input ${errors.title ? 'error' : ''}`}
                    placeholder="e.g., Broken streetlight on Main Street"
                    disabled={loading}
                    maxLength="100"
                  />
                  {errors.title && (
                    <span className="field-error">{errors.title}</span>
                  )}
                  <span className="field-hint">
                    {formData.title.length}/100 characters
                  </span>
                </div>

                {/* Description */}
                <div className="form-group">
                  <label htmlFor="description" className="form-label">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className={`form-textarea ${
                      errors.description ? 'error' : ''
                    }`}
                    placeholder="Provide detailed information about the issue..."
                    disabled={loading}
                    rows="6"
                  />
                  {errors.description && (
                    <span className="field-error">{errors.description}</span>
                  )}
                  <span className="field-hint">
                    Minimum 20 characters ({formData.description.length}{' '}
                    characters)
                  </span>
                </div>

                {/* Category & Priority */}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="category" className="form-label">
                      Category *
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className={`form-input ${errors.category ? 'error' : ''}`}
                      disabled={loading}
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.icon} {cat.displayName}
                        </option>
                      ))}
                    </select>
                    {errors.category && (
                      <span className="field-error">{errors.category}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="priority" className="form-label">
                      Priority
                    </label>
                    <select
                      id="priority"
                      name="priority"
                      value={formData.priority}
                      onChange={handleChange}
                      className="form-input"
                      disabled={loading}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Tags */}
                <div className="form-group">
                  <label className="form-label">Tags (Optional)</label>
                  <div className="tags-input-container">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag(e)}
                      className="form-input"
                      placeholder="Add tags (press Enter)"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="btn btn-secondary btn-sm"
                      disabled={loading}
                    >
                      Add
                    </button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="tags-list">
                      {formData.tags.map((tag, index) => (
                        <span key={index} className="tag">
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="tag-remove"
                            disabled={loading}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate('/issues')}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleNextStep}
                  disabled={loading}
                >
                  Next: Location →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {currentStep === 2 && (
            <div className="form-step">
              <div className="form-step-content">
                <div className="form-group">
                  <label className="form-label">Location *</label>
                  <p className="form-hint">
                    Click on the map or use your current location to pinpoint
                    the issue
                  </p>
                  <LocationPicker
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    address={formData.address}
                    onLocationChange={handleLocationChange}
                    showMap={true}
                    height="400px"
                  />
                  {errors.location && (
                    <span className="field-error">{errors.location}</span>
                  )}
                </div>
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
                  Next: Photos →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Photos */}
          {currentStep === 3 && (
            <div className="form-step">
              <div className="form-step-content">
                <PhotoUpload
                  onPhotosChange={handlePhotosChange}
                  maxFiles={5}
                  maxSize={5}
                  existingPhotos={existingPhotos}
                  disabled={loading}
                />
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
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-small"></span>
                      <span>{id ? 'Updating...' : 'Submitting...'}</span>
                    </>
                  ) : (
                    <span>{id ? 'Update Issue' : 'Submit Issue'}</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default IssueForm;
