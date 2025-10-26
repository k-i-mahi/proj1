import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import categoryService from '../services/categoryService';
import dataService from '../services/dataService';
import MapView from '../components/MapView';
import Feedback from '../components/Feedback';
import './Map.css';

const Map = () => {
  const { user } = useAuth();

  // State management
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Load categories with enhanced error handling, retry support,
   * and clear developer logs for debugging.
   */
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📍 Loading categories for map...');

      // Use dataService for better caching and consistency
      const response = await dataService.getCategories({
        isActive: 'true',
        sort: 'order',
      });

      if (response.success) {
        const categoryList = response.data || [];

        console.log('✅ Categories loaded for map:', {
          count: categoryList.length,
          categories: categoryList,
        });

        setCategories(categoryList);
      } else {
        console.warn('Failed to load categories via dataService:', response.message);
        
        // Fallback to categoryService
        try {
          const fallbackResponse = await categoryService.getCategories({
            isActive: 'true',
            sort: 'order',
          });

          const categoryList = fallbackResponse?.data || [];
          setCategories(categoryList);
        } catch (fallbackErr) {
          console.error('❌ Fallback load categories error:', fallbackErr);
          const errorMessage =
            fallbackErr.response?.data?.message ||
            fallbackErr.message ||
            'Failed to load categories. Please try again.';
          setError(errorMessage);
          setCategories([]);
        }
      }
    } catch (err) {
      console.error('❌ Load categories error:', err);

      // Extract readable message
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Failed to load categories. Please try again.';

      setError(errorMessage);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load categories on component mount
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // 🔄 Loading State
  if (loading) {
    return (
      <div className="map-page">
        <Feedback
          type="loading"
          fullPage={true}
          message="Loading map and categories..."
        />
      </div>
    );
  }

  // ❌ Error State with Retry Option
  if (error) {
    return (
      <div className="map-page">
        <Feedback
          type="error"
          title="Failed to Load Map Data"
          message={error}
          icon="🗺️"
          fullPage={true}
          action={loadCategories}
          actionText="Retry"
        />
      </div>
    );
  }

  // ✅ Success State (Render MapView)
  return (
    <div className="map-page">
      <MapView categories={categories} user={user} />
    </div>
  );
};

export default Map;
