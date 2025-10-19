import React, { useState, useEffect, useRef, useCallback } from 'react';
import locationService from '../services/locationService';
import './LocationPicker.css';

const LocationPicker = ({
  latitude,
  longitude,
  address,
  onLocationChange,
  disabled = false,
  showMap = true,
  height = '300px',
}) => {
  const [location, setLocation] = useState({
    lat: latitude ? parseFloat(latitude) : null,
    lng: longitude ? parseFloat(longitude) : null,
  });

  const [currentAddress, setCurrentAddress] = useState(address || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Move initializeMap to useCallback to fix dependency warning
  const initializeMap = useCallback(() => {
    if (!window.L) {
      console.error('Leaflet not loaded');
      setError('Map service not available');
      return;
    }

    if (!location.lat || !location.lng) return;

    try {
      const map = window.L.map(mapRef.current, {
        center: [location.lat, location.lng],
        zoom: 15,
        zoomControl: true,
      });

      const tileUrl = locationService.getLeafletTileUrl('standard');
      const attribution = locationService.getLeafletAttribution('standard');

      window.L.tileLayer(tileUrl, {
        attribution: attribution,
        maxZoom: 19,
      }).addTo(map);

      const markerIcon = window.L.divIcon({
        className: 'custom-marker',
        html: '<div style="background-color: #667eea; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = window.L.marker([location.lat, location.lng], {
        icon: markerIcon,
        draggable: !disabled,
        title: 'Issue Location',
      }).addTo(map);

      if (!disabled) {
        marker.on('dragend', (event) => {
          const newLatLng = event.target.getLatLng();
          handleLocationUpdate(newLatLng.lat, newLatLng.lng);
        });

        map.on('click', (event) => {
          const newLatLng = event.latlng;
          marker.setLatLng(newLatLng);
          handleLocationUpdate(newLatLng.lat, newLatLng.lng);
        });
      }

      mapInstanceRef.current = map;
      markerRef.current = marker;
      setMapReady(true);
      setError('');
    } catch (err) {
      console.error('Map initialization error:', err);
      setError('Failed to initialize map');
    }
  }, [location.lat, location.lng, disabled]); // Add dependencies

  const handleLocationUpdate = useCallback((lat, lng) => {
    setLocation({ lat, lng });
    setCurrentAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);

    if (onLocationChange) {
      onLocationChange({
        latitude: lat,
        longitude: lng,
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      });
    }
  }, [onLocationChange]);

  const updateMapLocation = useCallback((lat, lng) => {
    if (mapInstanceRef.current && markerRef.current) {
      const newLatLng = [lat, lng];
      mapInstanceRef.current.setView(newLatLng, mapInstanceRef.current.getZoom());
      markerRef.current.setLatLng(newLatLng);
    }
  }, []);

  // Initialize map when location is available
  useEffect(() => {
    if (location.lat && location.lng && showMap && !mapInstanceRef.current) {
      initializeMap();
    }
  }, [location.lat, location.lng, showMap, initializeMap]);

  // Update location when props change
  useEffect(() => {
    if (latitude && longitude) {
      const newLat = parseFloat(latitude);
      const newLng = parseFloat(longitude);

      if (newLat !== location.lat || newLng !== location.lng) {
        setLocation({ lat: newLat, lng: newLng });
        updateMapLocation(newLat, newLng);
      }
    }

    if (address && address !== currentAddress) {
      setCurrentAddress(address);
    }
  }, [latitude, longitude, address, location.lat, location.lng, currentAddress, updateMapLocation]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setLocation({ lat, lng });
        handleLocationUpdate(lat, lng);
        updateMapLocation(lat, lng);
        setLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Unable to get your location';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
          default:
            errorMessage = 'An unknown error occurred';
        }

        setError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleCoordinateChange = (field, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const newLocation = { ...location, [field]: numValue };
    setLocation(newLocation);

    if (newLocation.lat && newLocation.lng) {
      handleLocationUpdate(newLocation.lat, newLocation.lng);
      updateMapLocation(newLocation.lat, newLocation.lng);
    }
  };

  const isValidLocation = () => {
    return (
      location.lat !== null &&
      location.lng !== null &&
      !isNaN(location.lat) &&
      !isNaN(location.lng) &&
      location.lat >= -90 &&
      location.lat <= 90 &&
      location.lng >= -180 &&
      location.lng <= 180
    );
  };

  return (
    <div className="location-picker">
      <div className="location-actions">
        <button
          type="button"
          className="btn-current-location"
          onClick={getCurrentLocation}
          disabled={disabled || loading}
        >
          <span className="location-icon">📍</span>
          <span>{loading ? 'Getting Location...' : 'Use Current Location'}</span>
        </button>

        {isValidLocation() && (
          <div className="location-status">
            <span className="status-icon">✓</span>
            <span className="status-text">Location set</span>
          </div>
        )}
      </div>

      {error && (
        <div className="location-error">
          <span className="error-icon">⚠</span>
          <span>{error}</span>
        </div>
      )}

      <div className="coordinates-input">
        <div className="coordinate-group">
          <label htmlFor="latitude" className="coordinate-label">Latitude</label>
          <input
            type="number"
            id="latitude"
            step="any"
            min="-90"
            max="90"
            value={location.lat || ''}
            onChange={(e) => handleCoordinateChange('lat', e.target.value)}
            placeholder="e.g., 22.818"
            className="coordinate-input"
            disabled={disabled}
            required
          />
        </div>

        <div className="coordinate-group">
          <label htmlFor="longitude" className="coordinate-label">Longitude</label>
          <input
            type="number"
            id="longitude"
            step="any"
            min="-180"
            max="180"
            value={location.lng || ''}
            onChange={(e) => handleCoordinateChange('lng', e.target.value)}
            placeholder="e.g., 89.5539"
            className="coordinate-input"
            disabled={disabled}
            required
          />
        </div>
      </div>

      {currentAddress && (
        <div className="address-display">
          <label className="address-label">Coordinates</label>
          <div className="address-value">
            <span className="address-icon">📌</span>
            <span>{currentAddress}</span>
          </div>
        </div>
      )}

      {showMap && isValidLocation() && (
        <div className="map-container">
          <div ref={mapRef} className="map-canvas" style={{ height }} />
          {!mapReady && (
            <div className="map-loading">
              <div className="spinner"></div>
              <p>Loading map...</p>
            </div>
          )}
          {!disabled && (
            <div className="map-hint">
              <span className="hint-icon">💡</span>
              <span>Click on the map or drag the marker to set location</span>
            </div>
          )}
        </div>
      )}

      {!window.L && showMap && (
        <div className="map-loading">
          <p>Loading map service...</p>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
