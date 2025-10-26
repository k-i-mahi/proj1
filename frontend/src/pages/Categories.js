// Categories.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import categoryService from '../services/categoryService';
import dataService from '../services/dataService';
import Modal, { ConfirmDialog } from '../components/Modal';
import Feedback from '../components/Feedback';
import Badge from '../components/Badge';
import './Categories.css';

const Categories = () => {
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    category: null,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive

  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    icon: '',
    color: '#667eea',
    order: 0,
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState({});
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Load categories from service and set state.
   * dataService.getCategories() returns { data, pagination, success, message }.
   */
  const loadCategories = useCallback(
    async (params = {}) => {
      try {
        setLoading(true);
        console.log('📋 Loading categories...', params);
        
        // Use dataService for better caching and consistency
        const response = await dataService.getCategories(params);
        
        if (response.success) {
          const data = response.data ?? [];
          console.log('✅ Categories loaded via dataService:', {
            count: Array.isArray(data) ? data.length : 0,
          });
          if (mountedRef.current) setCategories(Array.isArray(data) ? data : []);
          return data;
        } else {
          console.warn('Failed to load categories via dataService:', response.message);
          
          // Fallback to categoryService
          const fallbackResponse = await categoryService.getCategories(params);
          const data = fallbackResponse?.data ?? [];
          console.log('✅ Categories loaded via fallback:', {
            count: Array.isArray(data) ? data.length : 0,
          });
          if (mountedRef.current) setCategories(Array.isArray(data) ? data : []);
          return data;
        }
      } catch (error) {
        console.error('❌ Load categories error:', error);
        const message =
          error?.response?.data?.message ||
          error?.message ||
          'Failed to load categories';
        if (mountedRef.current) setCategories([]);
        showError(message);
        throw error;
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [showError],
  );

  useEffect(() => {
    // initial load
    loadCategories().catch(() => {
      // already handled inside loadCategories
    });
  }, [loadCategories]);

  const validateForm = () => {
    const errors = {};

    const name = (formData.name ?? '').toString().trim();
    const displayName = (formData.displayName ?? '').toString().trim();
    const icon = formData.icon ?? '';
    const color = formData.color ?? '';
    const order = formData.order;

    if (!name) {
      errors.name = 'Name is required';
    } else if (!/^[a-z0-9-]+$/.test(name)) {
      errors.name = 'Name must be lowercase alphanumeric with hyphens';
    }

    if (!displayName) {
      errors.displayName = 'Display name is required';
    }

    if (icon && icon.length > 10) {
      errors.icon = 'Icon must be 10 characters or less';
    }

    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      errors.color = 'Invalid color format (use #RRGGBB)';
    }

    if (order !== undefined && order !== null && Number(order) < 0) {
      errors.order = 'Order must be a positive number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let v = value;

    if (type === 'checkbox') v = checked;
    if (type === 'number') v = value === '' ? '' : Number(value);

    setFormData((prev) => ({
      ...prev,
      [name]: v,
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!validateForm()) return;

    try {
      console.log('📋 Submitting category:', {
        editing: !!editingCategory,
        payload: formData,
      });

      if (editingCategory) {
        // prefer using id from editingCategory (supports _id or id)
        const id = editingCategory._id ?? editingCategory.id;
        await categoryService.updateCategory(id, formData);
        showSuccess('Category updated successfully');
      } else {
        await categoryService.createCategory(formData);
        showSuccess('Category created successfully');
      }

      handleCloseModal();
      await loadCategories();
    } catch (error) {
      console.error('❌ Submit error:', error);
      const message =
        error?.response?.data?.message || error?.message || 'Operation failed';
      showError(message);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      displayName: category.displayName || '',
      description: category.description || '',
      icon: category.icon || '',
      color: category.color || '#667eea',
      order: category.order ?? 0,
      isActive: category.isActive !== undefined ? category.isActive : true,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm.category) return;
    try {
      const id = deleteConfirm.category._id ?? deleteConfirm.category.id;
      await categoryService.deleteCategory(id);
      showSuccess('Category deleted successfully');
      setDeleteConfirm({ show: false, category: null });
      await loadCategories();
    } catch (error) {
      console.error('❌ Delete error:', error);
      const message =
        error?.response?.data?.message || 'Failed to delete category';
      showError(message);
    }
  };

  const handleToggleStatus = async (category) => {
    try {
      const id = category._id ?? category.id;
      console.log('📋 Toggling status for:', id);
      await categoryService.toggleCategoryStatus(id);
      showSuccess(
        `Category ${
          category.isActive ? 'deactivated' : 'activated'
        } successfully`,
      );
      await loadCategories();
    } catch (error) {
      console.error('❌ Toggle status error:', error);
      const message =
        error?.response?.data?.message || 'Failed to update category status';
      showError(message);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      displayName: '',
      description: '',
      icon: '',
      color: '#667eea',
      order: 0,
      isActive: true,
    });
    setFormErrors({});
  };

  const filteredCategories = (categories || []).filter((cat) => {
    const q = (searchQuery ?? '').toString().toLowerCase().trim();
    const name = (cat?.name ?? '').toString().toLowerCase();
    const display = (cat?.displayName ?? '').toString().toLowerCase();

    const matchesSearch = !q || name.includes(q) || display.includes(q);

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && cat?.isActive) ||
      (filterStatus === 'inactive' && !cat?.isActive);

    return matchesSearch && matchesStatus;
  });

  // Access Control
  if (user?.role !== 'admin') {
    return (
      <div className="categories-page">
        <Feedback
          type="error"
          title="Access Denied"
          message="Only administrators can manage categories."
          icon="🚫"
          fullPage={true}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="categories-page">
        <Feedback type="loading" fullPage={true} />
      </div>
    );
  }

  return (
    <div className="categories-page">
      <div className="page-container">
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">Category Management</h1>
            <p className="page-subtitle">
              Manage issue categories and their settings
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingCategory(null);
              setFormErrors({});
              setFormData({
                name: '',
                displayName: '',
                description: '',
                icon: '',
                color: '#667eea',
                order: 0,
                isActive: true,
              });
              setShowModal(true);
            }}
          >
            <span className="btn-icon">➕</span>
            <span>Add Category</span>
          </button>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                className="search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="filter-tabs">
            <button
              className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All ({categories.length})
            </button>
            <button
              className={`filter-tab ${
                filterStatus === 'active' ? 'active' : ''
              }`}
              onClick={() => setFilterStatus('active')}
            >
              Active ({categories.filter((c) => c.isActive).length})
            </button>
            <button
              className={`filter-tab ${
                filterStatus === 'inactive' ? 'active' : ''
              }`}
              onClick={() => setFilterStatus('inactive')}
            >
              Inactive ({categories.filter((c) => !c.isActive).length})
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{categories.length}</div>
              <div className="stat-label">Total Categories</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">
                {categories.filter((c) => c.isActive).length}
              </div>
              <div className="stat-label">Active</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <div className="stat-value">
                {categories.reduce(
                  (sum, c) => sum + (c.metadata?.issueCount || 0),
                  0,
                )}
              </div>
              <div className="stat-label">Total Issues</div>
            </div>
          </div>
        </div>

        {/* Categories List */}
        {filteredCategories.length === 0 ? (
          <Feedback
            type="empty"
            title="No Categories Found"
            message={
              searchQuery
                ? 'No categories match your search'
                : 'Get started by creating your first category'
            }
            icon="📁"
            action={!searchQuery ? () => setShowModal(true) : undefined}
            actionText="Create Category"
          />
        ) : (
          <div className="categories-grid">
            {filteredCategories.map((category) => {
              const id = category._id ?? category.id;
              return (
                <div key={id} className="category-card">
                  <div className="category-header">
                    <div
                      className="category-icon-box"
                      style={{ background: category.color ?? '#eee' }}
                    >
                      <span className="category-icon-large">
                        {category.icon || '📁'}
                      </span>
                    </div>
                    <div className="category-actions">
                      <button
                        className="action-btn"
                        onClick={() => handleEdit(category)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        className="action-btn"
                        onClick={() => handleToggleStatus(category)}
                        title={category.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {category.isActive ? '🔓' : '🔒'}
                      </button>
                      <button
                        className="action-btn danger"
                        onClick={() =>
                          setDeleteConfirm({ show: true, category })
                        }
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="category-body">
                    <div className="category-title-row">
                      <h3 className="category-title">{category.displayName}</h3>
                      {!category.isActive && (
                        <Badge
                          type="custom"
                          value="Inactive"
                          variant="#6b7280"
                        />
                      )}
                    </div>

                    <p className="category-name">@{category.name}</p>

                    {category.description && (
                      <p className="category-description">
                        {category.description}
                      </p>
                    )}

                    <div className="category-meta">
                      <div className="meta-item">
                        <span className="meta-icon">📝</span>
                        <span className="meta-text">
                          {category.metadata?.issueCount || 0} issues
                        </span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-icon">📊</span>
                        <span className="meta-text">
                          Order: {category.order ?? 0}
                        </span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-icon">🎨</span>
                        <div
                          className="color-preview"
                          style={{ background: category.color ?? '#667eea' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingCategory ? 'Edit Category' : 'Create New Category'}
        size="medium"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCloseModal}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
            >
              {editingCategory ? 'Update Category' : 'Create Category'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="category-form">
          {/* Name */}
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Name (URL-friendly) *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`form-input ${formErrors.name ? 'error' : ''}`}
              placeholder="e.g., water-supply"
              disabled={!!editingCategory} // prevent changing slug after creation
            />
            {formErrors.name && (
              <span className="field-error">{formErrors.name}</span>
            )}
            <span className="field-hint">
              Lowercase letters, numbers, and hyphens only
            </span>
          </div>

          {/* Display Name */}
          <div className="form-group">
            <label htmlFor="displayName" className="form-label">
              Display Name *
            </label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleInputChange}
              className={`form-input ${formErrors.displayName ? 'error' : ''}`}
              placeholder="e.g., Water Supply"
            />
            {formErrors.displayName && (
              <span className="field-error">{formErrors.displayName}</span>
            )}
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="form-input"
              rows="3"
              placeholder="Brief description of this category"
            />
          </div>

          {/* Icon & Color Row */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="icon" className="form-label">
                Icon (Emoji)
              </label>
              <input
                type="text"
                id="icon"
                name="icon"
                value={formData.icon}
                onChange={handleInputChange}
                className={`form-input ${formErrors.icon ? 'error' : ''}`}
                placeholder="💧"
                maxLength="10"
              />
              {formErrors.icon && (
                <span className="field-error">{formErrors.icon}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="color" className="form-label">
                Color
              </label>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  id="color-picker"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  className="color-picker"
                />
                <input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  className={`form-input ${formErrors.color ? 'error' : ''}`}
                  placeholder="#667eea"
                />
              </div>
              {formErrors.color && (
                <span className="field-error">{formErrors.color}</span>
              )}
            </div>
          </div>

          {/* Order */}
          <div className="form-group">
            <label htmlFor="order" className="form-label">
              Display Order
            </label>
            <input
              type="number"
              id="order"
              name="order"
              value={formData.order}
              onChange={handleInputChange}
              className="form-input"
              min="0"
            />
            <span className="field-hint">Lower numbers appear first</span>
          </div>

          {/* Active Status */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isActive"
                checked={!!formData.isActive}
                onChange={handleInputChange}
              />
              <span>Active (visible to users)</span>
            </label>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, category: null })}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteConfirm.category?.displayName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default Categories;
