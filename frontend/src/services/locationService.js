// src/services/locationService.js
import api from './api';
import { API_ENDPOINTS } from '../config/api.config';

/**
 * Internal helpers (declared first so we can use them anywhere)
 */
const toRadians = (degrees) => degrees * (Math.PI / 180);
const toDegrees = (radians) => radians * (180 / Math.PI);

const clamp = (v, min, max) => {
  const n = Number(v);
  if (Number.isNaN(n)) return min;
  return Math.min(Math.max(n, min), max);
};

const safeParseFloat = (v, fallback = null) => {
  if (typeof v === 'undefined' || v === null || v === '') return fallback;
  const n = parseFloat(v);
  return Number.isNaN(n) ? fallback : n;
};

/**
 * locationService
 */
const locationService = {
  // ============================================
  // GEOCODING
  // ============================================

  /**
   * Geocode address to coordinates
   * @param {string} address
   * @returns {Promise<Object>}
   */
  geocode: async (address) => {
    try {
      const response = await api.get(API_ENDPOINTS.LOCATION.GEOCODE, {
        params: { address },
      });
      console.log('📍 Geocode response:', {
        address,
        resultCount: response.data?.data?.length ?? 0,
      });
      // Assuming backend returns { success, data: [{ lat, lng, address }] }
      return response.data;
    } catch (error) {
      console.error('Geocode error:', error);
      throw error;
    }
  },

  /**
   * Reverse geocode coordinates to address
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<Object>}
   */
  reverseGeocode: async (latitude, longitude) => {
    try {
      const response = await api.get(API_ENDPOINTS.LOCATION.REVERSE_GEOCODE, {
        params: { latitude, longitude },
      });
      console.log('📍 Reverse geocode:', {
        latitude,
        longitude,
        data: !!response.data?.data?.address, // Check if address exists
      });
      // Assuming backend returns { success, data: { address, city, ... } }
      return response.data;
    } catch (error) {
      console.error('Reverse geocode error:', error);
      throw error;
    }
  },

  // ============================================
  // GEOLOCATION (browser)
  // ============================================

  /**
   * Get current position using browser geolocation
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  getCurrentPosition: (options = {}) => {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options,
    };

    return new Promise((resolve, reject) => {
      if (!navigator?.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      console.log('📍 Getting current position...');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const result = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          };
          console.log('✅ Position obtained:', result);
          resolve(result);
        },
        (error) => {
          let message = 'Failed to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              message = 'Location request timeout';
              break;
            default:
              message = 'An unknown error occurred';
              break;
          }
          console.error('❌ Geolocation error:', message);
          reject(new Error(message));
        },
        defaultOptions,
      );
    });
  },

  /**
   * Watch position changes
   * @param {Function} successCallback
   * @param {Function} errorCallback
   * @param {Object} options
   * @returns {number|null} Watch ID or null if unsupported
   */
  watchPosition: (successCallback, errorCallback, options = {}) => {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options,
    };

    if (!navigator?.geolocation) {
      errorCallback(new Error('Geolocation is not supported'));
      return null;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        successCallback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        console.error('watchPosition error:', error);
        errorCallback(error);
      },
      defaultOptions,
    );

    return watchId;
  },

  /**
   * Clear watch position
   * @param {number} watchId
   */
  clearWatch: (watchId) => {
    if (watchId && navigator?.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  },

  // ============================================
  // DISTANCE & PROXIMITY
  // ============================================

  /**
   * Calculate distance (server-side)
   * @param {number} lat1
   * @param {number} lng1
   * @param {number} lat2
   * @param {number} lng2
   * @returns {Promise<Object>} { success, data: { distanceKm, distanceMiles } }
   */
  calculateDistance: async (lat1, lng1, lat2, lng2) => {
    try {
      const response = await api.get(API_ENDPOINTS.LOCATION.DISTANCE, {
        params: { lat1, lng1, lat2, lng2 },
      });
      return response.data;
    } catch (error) {
      console.error('Calculate distance error:', error);
      throw error;
    }
  },

  /**
   * Calculate distance (client-side Haversine) in kilometers
   * @returns {number} distance in km
   */
  calculateDistanceLocal: (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in km
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  },

  /**
   * Get nearby locations (wrapper for backend endpoint)
   * Normalizes response to { data, meta }
   * @param {number} latitude
   * @param {number} longitude
   * @param {number} radius (in km)
   * @param {Object} filters (status, category, priority, etc.)
   * @returns {Promise<{data: Array, meta: Object}>}
   */
  getNearbyLocations: async (latitude, longitude, radius = 5, filters = {}) => {
    try {
      console.log('📍 Fetching nearby issues:', {
        latitude,
        longitude,
        radius,
        filters,
      });

      // Use the specific nearby issues endpoint
      const response = await api.get(API_ENDPOINTS.LOCATION.NEARBY_ISSUES, {
        params: { latitude, longitude, radius, ...filters },
      });

      const data = response.data?.data ?? [];
      const meta = response.data?.meta ?? {};

      console.log('✅ Nearby issues response:', { count: data.length, meta });

      return { data, meta };
    } catch (error) {
      console.error('Get nearby locations error:', error);
      throw error;
    }
  },

  /**
   * Get issues within specific map bounds
   * @param {Object} bounds { swLat, swLng, neLat, neLng }
   * @param {Object} filters (status, category, priority, etc.)
   * @returns {Promise<{data: Array, meta: Object}>}
   */
  getIssuesInBounds: async (bounds, filters = {}) => {
    try {
      if (
        !bounds?.swLat ||
        !bounds?.swLng ||
        !bounds?.neLat ||
        !bounds?.neLng
      ) {
        throw new Error('Invalid bounds object provided');
      }
      console.log('📍 Fetching issues in bounds:', { bounds, filters });

      // Ensure all bounds are proper numbers (not strings)
      const params = {
        swLat: Number(bounds.swLat),
        swLng: Number(bounds.swLng),
        neLat: Number(bounds.neLat),
        neLng: Number(bounds.neLng),
        ...filters,
        limit: filters.limit || 1000,
      };

      // Remove any undefined or null filter values
      Object.keys(params).forEach(key => {
        if (params[key] === undefined || params[key] === null || params[key] === '') {
          delete params[key];
        }
      });

      console.log('📤 Request params:', params);

      const response = await api.get(API_ENDPOINTS.LOCATION.ISSUES_BOUNDS, {
        params,
      });

      const data = response.data?.data ?? [];
      const meta = response.data?.meta ?? {};

      console.log('✅ Issues in bounds response:', {
        count: data.length,
        meta,
      });
      return { data, meta };
    } catch (error) {
      console.error('Get issues in bounds error:', error);
      console.error('Error response:', error.response?.data);
      throw error;
    }
  },

  // ============================================
  // VALIDATION
  // ============================================

  /**
   * Validate coordinates (server-side, if endpoint exists)
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<Object>} { success, data: { isValid } }
   */
  validateCoordinates: async (latitude, longitude) => {
    try {
      // Ensure endpoint exists before calling
      if (!API_ENDPOINTS.LOCATION.VALIDATE) {
        console.warn('validateCoordinates: Backend endpoint not configured.');
        // Fallback to client-side validation
        return {
          success: true,
          data: {
            isValid: locationService.isValidCoordinates(latitude, longitude),
          },
        };
      }
      const response = await api.get(API_ENDPOINTS.LOCATION.VALIDATE, {
        params: { latitude, longitude },
      });
      return response.data;
    } catch (error) {
      console.error('Validate coordinates error:', error);
      throw error;
    }
  },

  /**
   * Validate coordinates (client-side)
   * @param {number} latitude
   * @param {number} longitude
   * @returns {boolean}
   */
  isValidCoordinates: (latitude, longitude) => {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      !isNaN(latitude) && // Added NaN check
      !isNaN(longitude) && // Added NaN check
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  },

  /**
   * Validate address (client-side basic check)
   * @param {string} address
   * @returns {boolean}
   */
  isValidAddress: (address) => {
    return address && typeof address === 'string' && address.trim().length >= 5;
  },

  // ============================================
  // FORMATTING
  // ============================================

  /**
   * Format coordinates string
   * @param {number} latitude
   * @param {number} longitude
   * @param {number} precision
   * @returns {string} e.g., "40.712800, -74.006000"
   */
  formatCoordinates: (latitude, longitude, precision = 6) => {
    if (typeof latitude !== 'number' || typeof longitude !== 'number')
      return '';
    const lat = safeParseFloat(latitude);
    const lng = safeParseFloat(longitude);
    if (lat === null || lng === null) return '';
    return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
  },

  /**
   * Format distance with units
   * @param {number} distance in km
   * @param {string} unit ('km', 'mi')
   * @returns {string} e.g., "1.23 km", "500 m", "0.76 mi", "123 ft"
   */
  formatDistance: (distance, unit = 'km') => {
    const distKm = safeParseFloat(distance);
    if (distKm === null) return '';

    if (unit === 'mi') {
      const miles = distKm * 0.621371;
      return miles < 0.1
        ? `${Math.round(miles * 5280)} ft`
        : `${miles.toFixed(2)} mi`;
    }
    // Default to km/m
    return distKm < 1
      ? `${Math.round(distKm * 1000)} m`
      : `${distKm.toFixed(2)} km`;
  },

  /**
   * Format location object for display
   * @param {Object} location (can have lat/lng or latitude/longitude)
   * @returns {Object|null} standardized location object or null
   */
  formatLocation: (location) => {
    if (!location || typeof location !== 'object') return null;
    const lat = safeParseFloat(location.latitude ?? location.lat);
    const lng = safeParseFloat(location.longitude ?? location.lng);

    if (lat === null || lng === null) return null; // Invalid coordinates

    return {
      latitude: lat,
      longitude: lng,
      address: location.address ?? location.formatted_address ?? '',
      city: location.city ?? '',
      state: location.state ?? '',
      country: location.country ?? '',
      postalCode: location.postalCode ?? location.zip ?? '',
      // Provides a fallback display address if formatted isn't available
      formatted:
        location.formatted_address ??
        location.address ??
        locationService.formatCoordinates(lat, lng, 4),
    };
  },

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  toRadians, // exported for convenience
  toDegrees, // exported for convenience

  /**
   * Calculate bounding box around a center point
   * @param {number} latitude in degrees
   * @param {number} longitude in degrees
   * @param {number} radius in km
   * @returns {Object|null} { minLat, maxLat, minLng, maxLng } or null
   */
  getBounds: (latitude, longitude, radius) => {
    const lat = safeParseFloat(latitude);
    const lng = safeParseFloat(longitude);
    const radKm = safeParseFloat(radius, 1); // Default radius 1km

    if (lat === null || lng === null || radKm === null || radKm <= 0) {
      return null;
    }

    const R = 6371; // Earth radius in km
    const radDist = radKm / R; // Angular distance in radians
    const radLat = toRadians(lat);
    const radLng = toRadians(lng);

    let minLat = radLat - radDist;
    let maxLat = radLat + radDist;

    let minLng, maxLng;
    if (minLat > -Math.PI / 2 && maxLat < Math.PI / 2) {
      const deltaLng = Math.asin(Math.sin(radDist) / Math.cos(radLat));
      minLng = radLng - deltaLng;
      if (minLng < -Math.PI) minLng += 2 * Math.PI;
      maxLng = radLng + deltaLng;
      if (maxLng > Math.PI) maxLng -= 2 * Math.PI;
    } else {
      // Pole crossing
      minLat = Math.max(minLat, -Math.PI / 2);
      maxLat = Math.min(maxLat, Math.PI / 2);
      minLng = -Math.PI;
      maxLng = Math.PI;
    }

    return {
      swLat: toDegrees(minLat),
      swLng: toDegrees(minLng),
      neLat: toDegrees(maxLat),
      neLng: toDegrees(maxLng),
    };
  },

  /**
   * Calculate the center point of multiple coordinates
   * @param {Array<Object>} coordinates [{ lat, lng } or { latitude, longitude }]
   * @returns {Object|null} { latitude, longitude } or null
   */
  getCenterPoint: (coordinates) => {
    if (!Array.isArray(coordinates) || coordinates.length === 0) return null;

    const validCoords = coordinates
      .map((coord) => ({
        lat: safeParseFloat(coord.lat ?? coord.latitude),
        lng: safeParseFloat(coord.lng ?? coord.longitude),
      }))
      .filter((c) => c.lat !== null && c.lng !== null);

    if (validCoords.length === 0) return null;
    if (validCoords.length === 1)
      return { latitude: validCoords[0].lat, longitude: validCoords[0].lng };

    let x = 0,
      y = 0,
      z = 0;
    validCoords.forEach((coord) => {
      const radLat = toRadians(coord.lat);
      const radLng = toRadians(coord.lng);
      x += Math.cos(radLat) * Math.cos(radLng);
      y += Math.cos(radLat) * Math.sin(radLng);
      z += Math.sin(radLat);
    });

    const total = validCoords.length;
    x /= total;
    y /= total;
    z /= total;

    const centralLng = Math.atan2(y, x);
    const centralHyp = Math.sqrt(x * x + y * y);
    const centralLat = Math.atan2(z, centralHyp);

    return {
      latitude: toDegrees(centralLat),
      longitude: toDegrees(centralLng),
    };
  },

  /**
   * Check if point is within radius (km) of another point
   * @param {number} lat1
   * @param {number} lng1
   * @param {number} lat2
   * @param {number} lng2
   * @param {number} radius in km
   * @returns {boolean}
   */
  isWithinRadius: (lat1, lng1, lat2, lng2, radius) => {
    const rKm = safeParseFloat(radius);
    if (rKm === null || rKm < 0) return false;
    const distance = locationService.calculateDistanceLocal(
      lat1,
      lng1,
      lat2,
      lng2,
    );
    return distance <= rKm;
  },

  /**
   * Sort locations by distance from a center point
   * @param {Array<Object>} locations [{ latitude, longitude } or { lat, lng }]
   * @param {number} centerLat
   * @param {number} centerLng
   * @returns {Array<Object>} locations with added 'distanceKm' property, sorted
   */
  sortByDistance: (locations, centerLat, centerLng) => {
    if (!Array.isArray(locations)) return [];
    return locations
      .map((location) => {
        const lat = safeParseFloat(location.latitude ?? location.lat);
        const lng = safeParseFloat(location.longitude ?? location.lng);
        const distanceKm =
          lat !== null && lng !== null
            ? locationService.calculateDistanceLocal(
                centerLat,
                centerLng,
                lat,
                lng,
              )
            : Infinity; // Put invalid locations last
        return { ...location, distanceKm };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  },

  /**
   * Filter locations within a radius (km)
   * @param {Array<Object>} locations
   * @param {number} centerLat
   * @param {number} centerLng
   * @param {number} radius in km
   * @returns {Array<Object>} filtered locations
   */
  filterByRadius: (locations, centerLat, centerLng, radius) => {
    if (!Array.isArray(locations)) return [];
    return locations.filter((location) =>
      locationService.isWithinRadius(
        location.latitude ?? location.lat,
        location.longitude ?? location.lng,
        centerLat,
        centerLng,
        radius,
      ),
    );
  },

  // ============================================
  // MAP HELPERS
  // ============================================

  /** Get OpenStreetMap URL for a point */
  getOpenStreetMapUrl: (latitude, longitude, zoom = 15) => {
    const lat = safeParseFloat(latitude);
    const lng = safeParseFloat(longitude);
    if (lat === null || lng === null) return '';
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=${clamp(
      zoom,
      1,
      19,
    )}`;
  },

  /** Get Google Maps URL for a point (fallback) */
  getGoogleMapsUrl: (latitude, longitude, zoom = 15) => {
    const lat = safeParseFloat(latitude);
    const lng = safeParseFloat(longitude);
    if (lat === null || lng === null) return '';
    return `https://www.google.com/maps?q=${lat},${lng}&z=${clamp(
      zoom,
      1,
      21,
    )}`;
  },

  /** Get Google Maps directions URL */
  getDirectionsUrl: (origin, destination) => {
    const oLat = safeParseFloat(origin.lat ?? origin.latitude);
    const oLng = safeParseFloat(origin.lng ?? origin.longitude);
    const dLat = safeParseFloat(destination.lat ?? destination.latitude);
    const dLng = safeParseFloat(destination.lng ?? destination.longitude);
    if (oLat === null || oLng === null || dLat === null || dLng === null)
      return '';
    return `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLng}&destination=${dLat},${dLng}`;
  },

  /** Get Leaflet tile layer URL (OpenStreetMap) */
  getLeafletTileUrl: (mapType = 'standard') => {
    const tileUrls = {
      standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    };
    return tileUrls[mapType] || tileUrls.standard;
  },

  /** Get Leaflet tile attribution */
  getLeafletAttribution: (mapType = 'standard') => {
    const attributions = {
      standard: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      satellite: '&copy; <a href="https://www.esri.com/">Esri</a>',
      terrain: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors',
      dark: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
      light: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    };
    return attributions[mapType] || attributions.standard;
  },

  // ============================================
  // STORAGE (localStorage helpers)
  // ============================================

  /** Save location data to localStorage */
  saveLocation: (key, location) => {
    try {
      if (!key || !location) return;
      localStorage.setItem(
        `location_${key}`,
        JSON.stringify({
          ...location,
          timestamp: Date.now(),
        }),
      );
    } catch (error) {
      console.error('Save location error:', error);
    }
  },

  /** Get saved location from localStorage, checking expiry */
  getSavedLocation: (key, maxAge = 3600000) => {
    // Default maxAge 1 hour
    try {
      if (!key) return null;
      const saved = localStorage.getItem(`location_${key}`);
      if (!saved) return null;

      const location = JSON.parse(saved);
      if (!location || !location.timestamp) {
        localStorage.removeItem(`location_${key}`); // Clear invalid data
        return null;
      }

      if (maxAge && Date.now() - location.timestamp > maxAge) {
        localStorage.removeItem(`location_${key}`); // Expired
        return null;
      }
      return location;
    } catch (error) {
      console.error('Get saved location error:', error);
      // Attempt to clear potentially corrupt item
      try {
        localStorage.removeItem(`location_${key}`);
      } catch (e) {}
      return null;
    }
  },

  /** Clear saved location */
  clearSavedLocation: (key) => {
    try {
      if (!key) return;
      localStorage.removeItem(`location_${key}`);
    } catch (error) {
      console.error('Clear saved location error:', error);
    }
  },

  /** Get last known location */
  getLastKnownLocation: () => locationService.getSavedLocation('last_known'),

  /** Save last known location */
  saveLastKnownLocation: (location) =>
    locationService.saveLocation('last_known', location),
};

export default locationService;
