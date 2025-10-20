// CategoryContext.js
import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import categoryService from '../services/categoryService';

const CategoryContext = createContext();

/**
 * Hook to consume CategoryContext
 */
export const useCategory = () => {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategory must be used within CategoryProvider');
  }
  return context;
};

/**
 * Provider that loads and exposes categories + helpers
 */
export const CategoryProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // track mounted status to avoid state updates after unmount
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Fetch categories from API.
   * If `params` is empty and cached categories are available (within service cache),
   * use them first and then refresh in background.
   *
   * Returns the array of categories (or throws on error).
   *
   * @param {Object} params - query params for the API
   * @param {Object} options - { force: boolean } when true, bypass cache
   */
  const fetchCategories = useCallback(
    async (params = {}, options = { force: false }) => {
      try {
        setLoading(true);
        setError(null);

        console.log('📋 CategoryContext: Fetching categories', {
          params,
          options,
        });

        // If no params and cache exists and not forced, use cached value
        if (
          !options.force &&
          (!params || Object.keys(params).length === 0) &&
          typeof categoryService.getCachedCategories === 'function'
        ) {
          try {
            const cached = categoryService.getCachedCategories();
            if (cached && Array.isArray(cached) && cached.length > 0) {
              console.log('🗂️ CategoryContext: Using cached categories', {
                count: cached.length,
              });
              if (mountedRef.current) setCategories(cached);
              // still fetch fresh in background to update cache/state
              (async () => {
                try {
                  const fresh = await categoryService.getCategories();
                  if (mountedRef.current && fresh?.data) {
                    setCategories(fresh.data);
                    if (
                      typeof categoryService.setCachedCategories === 'function'
                    ) {
                      categoryService.setCachedCategories(fresh.data);
                    }
                    console.log(
                      '🔁 CategoryContext: Cache refreshed with latest categories',
                      {
                        count: fresh.data.length,
                      },
                    );
                  }
                } catch (bgErr) {
                  // background refresh failure shouldn't surface to caller
                  console.warn(
                    'CategoryContext: background refresh failed',
                    bgErr,
                  );
                }
              })();
              return cached;
            }
          } catch (cacheErr) {
            console.warn('CategoryContext: cache read error:', cacheErr);
          }
        }

        // Normal fetch (or forced)
        const response = await categoryService.getCategories(params);
        // service returns { data: [...], pagination, success, message }
        const data = response?.data ?? [];

        if (mountedRef.current) {
          setCategories(Array.isArray(data) ? data : []);
          if (
            typeof categoryService.setCachedCategories === 'function' &&
            (!params || Object.keys(params).length === 0)
          ) {
            try {
              categoryService.setCachedCategories(
                Array.isArray(data) ? data : [],
              );
            } catch (cacheErr) {
              console.warn('CategoryContext: cache write error:', cacheErr);
            }
          }
        }

        console.log('✅ CategoryContext: Categories fetched:', {
          count: Array.isArray(data) ? data.length : 0,
        });

        return data;
      } catch (err) {
        const errorMessage =
          err?.response?.data?.message ||
          err?.message ||
          'Failed to fetch categories';
        if (mountedRef.current) setError(errorMessage);
        console.error('❌ CategoryContext: Fetch categories error:', err);
        throw err;
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [],
  );

  // initial load on mount
  useEffect(() => {
    // Fire-and-forget; errors are handled inside fetchCategories and rethrown if needed
    fetchCategories().catch(() => {
      // swallow here to avoid unhandled rejection when called from useEffect
    });
  }, [fetchCategories]);

  /**
   * Helper: find category by id (accepts _id or id)
   */
  const getCategoryById = useCallback(
    (id) => {
      if (!id) return null;
      return (
        categories.find((cat) => cat?._id === id || cat?.id === id) ?? null
      );
    },
    [categories],
  );

  /**
   * Helper: find category by name (checks `name` and `displayName`)
   */
  const getCategoryByName = useCallback(
    (name) => {
      if (!name) return null;
      return (
        categories.find(
          (cat) =>
            String(cat?.name).toLowerCase() === String(name).toLowerCase() ||
            String(cat?.displayName).toLowerCase() ===
              String(name).toLowerCase(),
        ) ?? null
      );
    },
    [categories],
  );

  const value = {
    categories,
    loading,
    error,
    fetchCategories,
    getCategoryById,
    getCategoryByName,
    // convenience mutators for UI components to update local state quickly
    setCategories,
    clearCategories: useCallback(() => setCategories([]), []),
  };

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
};

export default CategoryContext;
