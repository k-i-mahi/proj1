import React, { useState, useRef } from 'react';
import './PhotoUpload.css';

const PhotoUpload = ({
  onPhotosChange,
  maxFiles = 5,
  maxSize = 5, // MB
  existingPhotos = [],
  disabled = false,
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    processFiles(files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const processFiles = (files) => {
    setError('');

    // Filter only image files
    const imageFiles = files.filter((file) => {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        return false;
      }
      return true;
    });

    if (imageFiles.length === 0) return;

    // Check total file count
    const totalFiles =
      selectedFiles.length + imageFiles.length + existingPhotos.length;
    if (totalFiles > maxFiles) {
      setError(`Maximum ${maxFiles} photos allowed`);
      return;
    }

    // Validate file sizes
    const oversizedFiles = imageFiles.filter(
      (file) => file.size > maxSize * 1024 * 1024,
    );
    if (oversizedFiles.length > 0) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Create preview URLs
    const newPreviewUrls = imageFiles.map((file) => URL.createObjectURL(file));

    // Update state
    const updatedFiles = [...selectedFiles, ...imageFiles];
    const updatedPreviews = [...previewUrls, ...newPreviewUrls];

    setSelectedFiles(updatedFiles);
    setPreviewUrls(updatedPreviews);

    // Notify parent
    if (onPhotosChange) {
      onPhotosChange(updatedFiles);
    }
  };

  const removeFile = (index) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    const updatedPreviews = previewUrls.filter((_, i) => i !== index);

    // Revoke URL to prevent memory leaks
    URL.revokeObjectURL(previewUrls[index]);

    setSelectedFiles(updatedFiles);
    setPreviewUrls(updatedPreviews);

    // Notify parent
    if (onPhotosChange) {
      onPhotosChange(updatedFiles);
    }

    setError('');
  };

  const removeExistingPhoto = (index) => {
    // This would need to be handled by parent component
    // as it involves server-side deletion
    console.log('Remove existing photo:', index);
  };

  const openFilePicker = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const getTotalPhotos = () => {
    return selectedFiles.length + existingPhotos.length;
  };

  const getRemainingSlots = () => {
    return maxFiles - getTotalPhotos();
  };

  return (
    <div className="photo-upload">
      <div className="upload-header">
        <label className="upload-label">
          Photos ({getTotalPhotos()}/{maxFiles})
        </label>
        {getRemainingSlots() > 0 && (
          <span className="remaining-info">
            {getRemainingSlots()} more photo
            {getRemainingSlots() !== 1 ? 's' : ''} allowed
          </span>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="upload-error">
          <span className="error-icon">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Existing Photos */}
      {existingPhotos.length > 0 && (
        <div className="existing-photos">
          <div className="photos-grid">
            {existingPhotos.map((photo, index) => (
              <div key={`existing-${index}`} className="photo-preview">
                <img src={photo.url} alt={`Photo ${index + 1}`} />
                <button
                  type="button"
                  className="photo-remove"
                  onClick={() => removeExistingPhoto(index)}
                  disabled={disabled}
                >
                  ✕
                </button>
                <span className="photo-badge">Uploaded</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Photo Previews */}
      {previewUrls.length > 0 && (
        <div className="preview-section">
          <div className="photos-grid">
            {previewUrls.map((url, index) => (
              <div key={`preview-${index}`} className="photo-preview">
                <img src={url} alt={`Preview ${index + 1}`} />
                <button
                  type="button"
                  className="photo-remove"
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                >
                  ✕
                </button>
                <div className="photo-info">
                  {selectedFiles[index] && (
                    <span className="photo-size">
                      {(selectedFiles[index].size / 1024 / 1024).toFixed(2)}MB
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Area */}
      {getRemainingSlots() > 0 && (
        <div
          className={`upload-area ${isDragging ? 'dragging' : ''} ${
            disabled ? 'disabled' : ''
          }`}
          onClick={openFilePicker}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            disabled={disabled}
            className="file-input"
          />

          <div className="upload-content">
            <div className="upload-icon">📷</div>
            <div className="upload-text">
              <p className="upload-primary">
                {isDragging
                  ? 'Drop photos here'
                  : 'Click to upload or drag and drop'}
              </p>
              <p className="upload-secondary">
                PNG, JPG, GIF, WebP (max {maxSize}MB each)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Text */}
      {getTotalPhotos() === 0 && (
        <div className="upload-hint">
          <span className="hint-icon">💡</span>
          <span>Adding photos helps resolve issues faster</span>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
