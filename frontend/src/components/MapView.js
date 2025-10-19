import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import locationService from '../services/locationService';
import IssueDetailModal from './IssueDetailModal';
import IssueFilters from './IssueFilters';
import Feedback from './Feedback';
import './MapView.css';

const DEFAULT_CENTER = [22.818, 89.5539];
const DEFAULT_ZOOM = 12;

const MapView = ({ categories = [] }) => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({});
  const [mapType, setMapType] = useState('standard');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showClustering, setShowClustering] = useState(true);
  const [mapBounds, setMapBounds] = useState(null);
  const [initialCenter, setInitialCenter] = useState(DEFAULT_CENTER);
  const [mapInitialized, setMapInitialized] = useState(false);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const markerLayerRef = useRef(null);
  const clusterGroupRef = useRef(null);
  const heatLayerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const initAttemptedRef = useRef(false);

  // Check for Leaflet library
  const checkLeafletLibrary = useCallback(() => {
    console.log('🔍 Checking Leaflet availability...');
    if (typeof window === 'undefined') {
      console.error('❌ Window is undefined');
      return false;
    }
    if (!window.L) {
      console.error('❌ Leaflet (window.L) is not available');
      setError('Leaflet library not loaded. Please refresh the page.');
      return false;
    }
    console.log('✅ Leaflet is available:', window.L.version);
    return true;
  }, []);

  // Initialize map - FIXED: Removed mapBounds from dependencies
  const initializeMap = useCallback(() => {
    if (initAttemptedRef.current) {
      console.log('⏭️ Map initialization already attempted');
      return;
    }

    initAttemptedRef.current = true;

    if (!checkLeafletLibrary()) {
      console.error('❌ Leaflet check failed during initialization');
      return;
    }

    if (!mapRef.current) {
      console.error('❌ Map container ref is not available');
      setError('Map container not found.');
      return;
    }

    try {
      console.log('🗺️ Initializing Leaflet map with center:', initialCenter);

      // Remove existing map instance if any
      if (mapInstanceRef.current) {
        console.log('🔄 Removing existing map instance');
        try {
          mapInstanceRef.current.remove();
        } catch (err) {
          console.warn('Error removing old map instance:', err);
        }
        mapInstanceRef.current = null;
      }

      // Create map with error handling
      const map = window.L.map(mapRef.current, {
        center: initialCenter,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true,
      });

      console.log('✅ Map instance created');

      // Add tile layer
      const tileUrl = locationService.getLeafletTileUrl(mapType);
      const attribution = locationService.getLeafletAttribution(mapType);
      
      const tileLayer = window.L.tileLayer(tileUrl, {
        attribution: attribution,
        maxZoom: 19,
      });
      
      tileLayer.addTo(map);
      tileLayerRef.current = tileLayer;
      console.log('✅ Tile layer added');

      // Create marker layer group
      markerLayerRef.current = window.L.layerGroup().addTo(map);
      console.log('✅ Marker layer created');

      // Create cluster group if library available
      if (window.L.markerClusterGroup) {
        clusterGroupRef.current = window.L.markerClusterGroup({
          maxClusterRadius: 50,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true,
        });
        console.log('✅ Cluster group created');
      } else {
        console.warn('⚠️ Marker clustering not available');
      }

      // Store map reference BEFORE setting up event listeners
      mapInstanceRef.current = map;

      // Listen to map movement - FIXED: Only after map is stored in ref
      map.on('moveend', () => {
        try {
          const bounds = map.getBounds();
          if (bounds) {
            const newBounds = {
              swLat: bounds.getSouth(),
              swLng: bounds.getWest(),
              neLat: bounds.getNorth(),
              neLng: bounds.getEast(),
            };
            
            console.log('🗺️ Map bounds updated:', newBounds);
            setMapBounds(newBounds);
          }
        } catch (err) {
          console.error('Error getting map bounds:', err);
        }
      });

      // Mark as initialized
      setMapInitialized(true);
      console.log('✅ Leaflet map initialized successfully');

      // Force resize and get initial bounds after a delay
      setTimeout(() => {
        try {
          map.invalidateSize();
          console.log('🔄 Map size invalidated');
          
          const initialBounds = map.getBounds();
          if (initialBounds) {
            setMapBounds({
              swLat: initialBounds.getSouth(),
              swLng: initialBounds.getWest(),
              neLat: initialBounds.getNorth(),
              neLng: initialBounds.getEast(),
            });
            console.log('✅ Initial bounds set');
          }
        } catch (err) {
          console.error('Error in post-initialization:', err);
        }
      }, 200);

    } catch (err) {
      console.error('❌ Map initialization error:', err);
      setError(`Failed to initialize map: ${err.message}`);
      initAttemptedRef.current = false; // Allow retry
      setMapInitialized(false);
    }
  }, [initialCenter, mapType, checkLeafletLibrary]); // FIXED: Removed mapBounds

  // Get user location on mount
  useEffect(() => {
    console.log('🌍 Getting user location...');
    
    locationService
      .getCurrentPosition()
      .then((pos) => {
        const center = [pos.latitude, pos.longitude];
        setInitialCenter(center);
        console.log('✅ User location obtained:', center);
      })
      .catch((err) => {
        console.warn('⚠️ Could not get user location:', err.message);
        console.log('📍 Using default center:', DEFAULT_CENTER);
      });
  }, []);

  // Initialize map when ref is ready and Leaflet is available
  useEffect(() => {
    if (!mapRef.current) {
      console.log('⏳ Waiting for map ref...');
      return;
    }

    if (!window.L) {
      console.log('⏳ Waiting for Leaflet to load...');
      const timer = setTimeout(() => {
        if (window.L && !mapInitialized && !initAttemptedRef.current) {
          console.log('🔄 Retrying map initialization...');
          initializeMap();
        }
      }, 500);
      return () => clearTimeout(timer);
    }

    if (!mapInitialized && !initAttemptedRef.current) {
      console.log('🚀 Starting map initialization...');
      // Add a small delay to ensure DOM is ready
      setTimeout(() => {
        initializeMap();
      }, 100);
    }
  }, [mapInitialized, initializeMap]);

  // Fetch issues when filters or bounds change
  useEffect(() => {
    if (mapInstanceRef.current && mapBounds && mapInitialized) {
      loadIssues();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, mapBounds, mapInitialized]);

  const loadIssues = useCallback(async () => {
    if (!mapInstanceRef.current || !mapBounds) {
      console.log('⏭️ Load issues skipped: Map not ready or bounds missing');
      return;
    }

    setLoading(true);
    setError('');
    console.log('🔄 Loading issues for bounds:', mapBounds, 'filters:', filters);

    try {
      const response = await locationService.getIssuesInBounds(mapBounds, filters);
      const issuesData = response.data || [];

      setIssues(issuesData);
      
      // Call updateMarkers inline instead of as dependency
      if (mapInstanceRef.current && window.L) {
        // Clear markers logic
        if (markerLayerRef.current) {
          markerLayerRef.current.clearLayers();
        }
        if (clusterGroupRef.current && mapInstanceRef.current?.hasLayer(clusterGroupRef.current)) {
          mapInstanceRef.current.removeLayer(clusterGroupRef.current);
          clusterGroupRef.current.clearLayers();
        }
        if (heatLayerRef.current && mapInstanceRef.current?.hasLayer(heatLayerRef.current)) {
          mapInstanceRef.current.removeLayer(heatLayerRef.current);
          heatLayerRef.current = null;
        }
        markersRef.current = [];

        // Update markers logic
        const newMarkers = issuesData
          .filter((issue) =>
            issue.location?.coordinates &&
            locationService.isValidCoordinates(
              issue.location.coordinates[1],
              issue.location.coordinates[0]
            )
          )
          .map((issue) => {
            const lng = issue.location.coordinates[0];
            const lat = issue.location.coordinates[1];

            const icon = getMarkerIcon(issue);
            const marker = window.L.marker([lat, lng], { icon });

            marker.on('click', () => handleMarkerClick(issue, marker));
            marker.issueData = issue;

            return marker;
          });

        markersRef.current = newMarkers;

        if (showHeatmap && window.L.heatLayer) {
          // Heatmap logic (call updateHeatmap inline)
          const heatmapData = issuesData
            .filter((issue) =>
              issue.location?.coordinates &&
              locationService.isValidCoordinates(
                issue.location.coordinates[1],
                issue.location.coordinates[0]
              )
            )
            .map((issue) => {
              const lng = issue.location.coordinates[0];
              const lat = issue.location.coordinates[1];
              const weight = issue.priority === 'urgent' ? 3 : issue.priority === 'high' ? 2 : 1;
              return [lat, lng, weight];
            });

          if (heatLayerRef.current) {
            mapInstanceRef.current.removeLayer(heatLayerRef.current);
          }

          heatLayerRef.current = window.L.heatLayer(heatmapData, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            max: 3,
            gradient: {
              0.0: 'blue',
              0.5: 'lime',
              0.7: 'yellow',
              0.9: 'orange',
              1.0: 'red',
            },
          }).addTo(mapInstanceRef.current);

          console.log(`✅ Updated heatmap with ${heatmapData.length} points`);
        } else if (showClustering && clusterGroupRef.current) {
          // Clustering logic
          clusterGroupRef.current.clearLayers();
          newMarkers.forEach((marker) => clusterGroupRef.current.addLayer(marker));
          
          if (!mapInstanceRef.current.hasLayer(clusterGroupRef.current)) {
            mapInstanceRef.current.addLayer(clusterGroupRef.current);
          }
          console.log(`✅ Updated clustering with ${newMarkers.length} markers`);
        } else {
          newMarkers.forEach((marker) => markerLayerRef.current.addLayer(marker));
        }

        console.log(`✅ Updated ${newMarkers.length} markers on map`);
      }

      console.log(`✅ Loaded ${issuesData.length} issues`);
    } catch (err) {
      console.error('❌ Load issues error:', err);
      const errorMsg = err.message || 'Network error';
      setError(`Failed to load issues: ${errorMsg}`);
      setIssues([]);
      // Clear markers on error
      if (markerLayerRef.current) {
        markerLayerRef.current.clearLayers();
      }
      markersRef.current = [];
    } finally {
      setLoading(false);
    }
  }, [mapBounds, filters, showHeatmap, showClustering]); // Include all dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up map...');
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (err) {
          console.warn('Error during cleanup:', err);
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const updateMarkers = (issuesData) => {
    if (!mapInstanceRef.current || !window.L) {
      console.warn('⚠️ Cannot update markers: Map not ready');
      return;
    }

    clearMarkers();

    const newMarkers = issuesData
      .filter((issue) =>
        issue.location?.coordinates &&
        locationService.isValidCoordinates(
          issue.location.coordinates[1],
          issue.location.coordinates[0]
        )
      )
      .map((issue) => {
        const lng = issue.location.coordinates[0];
        const lat = issue.location.coordinates[1];

        const icon = getMarkerIcon(issue);
        const marker = window.L.marker([lat, lng], { icon });

        marker.on('click', () => handleMarkerClick(issue, marker));
        marker.issueData = issue;

        return marker;
      });

    markersRef.current = newMarkers;

    if (showHeatmap && window.L.heatLayer) {
      updateHeatmap(issuesData);
    } else if (showClustering && clusterGroupRef.current) {
      updateClustering(newMarkers);
    } else {
      newMarkers.forEach((marker) => markerLayerRef.current.addLayer(marker));
    }

    console.log(`✅ Updated ${newMarkers.length} markers on map`);
  };

  const clearMarkers = () => {
    if (markerLayerRef.current) {
      markerLayerRef.current.clearLayers();
    }
    if (clusterGroupRef.current && mapInstanceRef.current?.hasLayer(clusterGroupRef.current)) {
      mapInstanceRef.current.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current.clearLayers();
    }
    if (heatLayerRef.current && mapInstanceRef.current?.hasLayer(heatLayerRef.current)) {
      mapInstanceRef.current.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }
    markersRef.current = [];
  };

  // ...existing code for getMarkerIcon, handleMarkerClick, getStatusColor, getPriorityColor...

  const getMarkerIcon = (issue) => {
    const colors = {
      open: '#3b82f6',
      'in-progress': '#f59e0b',
      resolved: '#10b981',
      closed: '#6b7280',
      rejected: '#ef4444',
    };
    const color = colors[issue.status] || colors.closed;
    const size = issue.priority === 'urgent' ? 14 : issue.priority === 'high' ? 12 : 10;

    return window.L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  const handleMarkerClick = (issue, marker) => {
    if (!mapInstanceRef.current) return;

    const popupContent = `
      <div style="font-family: sans-serif; max-width: 250px; padding: 8px;">
        <h3 style="margin: 0 0 8px; font-size: 1em;">${issue.title}</h3>
        <p style="margin: 0 0 8px; font-size: 0.85em; color: #555;">${issue.description.substring(0, 80)}${issue.description.length > 80 ? '...' : ''}</p>
        <div style="margin-bottom: 8px; display: flex; gap: 5px; flex-wrap: wrap;">
          <span style="padding: 2px 6px; border-radius: 4px; font-size: 0.75em; text-transform: capitalize; color: white; background-color: ${getStatusColor(issue.status)};">${issue.status}</span>
          <span style="padding: 2px 6px; border-radius: 4px; font-size: 0.75em; text-transform: capitalize; color: white; background-color: ${getPriorityColor(issue.priority)};">${issue.priority}</span>
        </div>
        <button onclick="window.viewIssueDetails('${issue._id}')" style="width: 100%; padding: 6px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em; margin-top: 5px;">View Details</button>
      </div>
    `;

    marker.bindPopup(popupContent, { maxWidth: 300 }).openPopup();
  };

  const getStatusColor = (status) => {
    const colors = {
      open: '#3b82f6',
      'in-progress': '#f59e0b',
      resolved: '#10b981',
      closed: '#6b7280',
      rejected: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#f97316',
      urgent: '#ef4444',
    };
    return colors[priority] || '#6b7280';
  };

  const viewIssueDetails = useCallback((issueId) => {
    const issue = issues.find((i) => i._id === issueId);
    if (issue) {
      console.log('📖 Opening details for issue:', issueId);
      setSelectedIssue(issue);
      setShowIssueModal(true);
    } else {
      console.error('❌ Issue not found for ID:', issueId);
    }
  }, [issues]);

  useEffect(() => {
    window.viewIssueDetails = viewIssueDetails;
    return () => {
      delete window.viewIssueDetails;
    };
  }, [viewIssueDetails]);

  const updateClustering = (markers) => {
    if (!clusterGroupRef.current) {
      console.warn('⚠️ Marker clustering not available');
      return;
    }

    clusterGroupRef.current.clearLayers();
    markers.forEach((marker) => clusterGroupRef.current.addLayer(marker));
    
    if (!mapInstanceRef.current.hasLayer(clusterGroupRef.current)) {
      mapInstanceRef.current.addLayer(clusterGroupRef.current);
    }

    console.log(`✅ Updated clustering with ${markers.length} markers`);
  };

  const updateHeatmap = (issuesData) => {
    if (!window.L.heatLayer) {
      console.warn('⚠️ Heatmap library not available');
      return;
    }

    const heatmapData = issuesData
      .filter((issue) =>
        issue.location?.coordinates &&
        locationService.isValidCoordinates(
          issue.location.coordinates[1],
          issue.location.coordinates[0]
        )
      )
      .map((issue) => {
        const lng = issue.location.coordinates[0];
        const lat = issue.location.coordinates[1];
        const weight = issue.priority === 'urgent' ? 3 : issue.priority === 'high' ? 2 : 1;
        return [lat, lng, weight];
      });

    if (heatLayerRef.current) {
      mapInstanceRef.current.removeLayer(heatLayerRef.current);
    }

    heatLayerRef.current = window.L.heatLayer(heatmapData, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 3,
      gradient: {
        0.0: 'blue',
        0.5: 'lime',
        0.7: 'yellow',
        0.9: 'orange',
        1.0: 'red',
      },
    }).addTo(mapInstanceRef.current);

    console.log(`✅ Updated heatmap with ${heatmapData.length} points`);
  };

  const toggleMapType = (type) => {
    if (!tileLayerRef.current || !mapInstanceRef.current) return;

    setMapType(type);
    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    const tileUrl = locationService.getLeafletTileUrl(type);
    const attribution = locationService.getLeafletAttribution(type);

    tileLayerRef.current = window.L.tileLayer(tileUrl, {
      attribution: attribution,
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);
  };

  const toggleHeatmap = () => {
    if (!window.L.heatLayer) {
      setError('Heatmap library not loaded.');
      return;
    }

    const newShowHeatmap = !showHeatmap;
    setShowHeatmap(newShowHeatmap);

    if (newShowHeatmap) {
      clearMarkers();
      updateHeatmap(issues);
    } else {
      if (heatLayerRef.current) {
        mapInstanceRef.current.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      updateMarkers(issues);
    }
  };

  const toggleClustering = () => {
    if (!clusterGroupRef.current) {
      setError('Marker clustering library not loaded.');
      return;
    }

    if (showHeatmap) return;

    const newShowClustering = !showClustering;
    setShowClustering(newShowClustering);

    clearMarkers();
    updateMarkers(issues);
  };

  const handleFiltersChange = (newFilters) => {
    console.log('🔍 Filters changed:', newFilters);
    setFilters(newFilters);
  };

  const handleIssueUpdate = () => {
    loadIssues();
    setShowIssueModal(false);
    setSelectedIssue(null);
  };

  return (
    <div className="map-view">
      <div className="map-controls">
        <IssueFilters
          categories={categories}
          onFiltersChange={handleFiltersChange}
          showUserFilters={!!user}
        />

        <div className="view-controls">
          <div className="control-group">
            <label className="control-label">Map Type</label>
            <div className="button-group">
              {['standard', 'satellite', 'terrain'].map((type) => (
                <button
                  key={type}
                  className={`control-btn ${mapType === type ? 'active' : ''}`}
                  onClick={() => toggleMapType(type)}
                  title={type.charAt(0).toUpperCase() + type.slice(1)}
                  disabled={!mapInitialized}
                >
                  {type === 'standard' ? '🗺️' : type === 'satellite' ? '🛰️' : '⛰️'}
                  <span className="btn-text">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label className="control-label">View Options</label>
            <div className="button-group">
              <button
                className={`control-btn ${showHeatmap ? 'active' : ''}`}
                onClick={toggleHeatmap}
                disabled={!window.L?.heatLayer || !mapInitialized}
                title={window.L?.heatLayer ? (showHeatmap ? 'Hide Heatmap' : 'Show Heatmap') : 'Heatmap library not loaded'}
              >
                🔥<span className="btn-text">Heatmap</span>
              </button>
              <button
                className={`control-btn ${showClustering ? 'active' : ''}`}
                onClick={toggleClustering}
                disabled={showHeatmap || !clusterGroupRef.current || !mapInitialized}
                title={clusterGroupRef.current ? (showClustering ? 'Disable Clustering' : 'Enable Clustering') : 'Clustering library not loaded'}
              >
                📍<span className="btn-text">Clustering</span>
              </button>
            </div>
          </div>

          <div className="map-stats">
            <div className="stat-item">
              <span className="stat-label">Issues Visible:</span>
              <span className="stat-value">{loading ? '...' : issues.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="map-container">
        {!mapInitialized && !error && (
          <div className="map-feedback-overlay">
            <Feedback type="loading" message="Initializing Map..." />
          </div>
        )}

        {error && (
          <div className="map-feedback-overlay">
            <Feedback type="error" title="Map Error" message={error} />
          </div>
        )}

        <div ref={mapRef} className={`map-canvas ${!mapInitialized ? 'loading' : ''}`} />

        {mapInitialized && !showHeatmap && (
          <div className="map-legend">
            <h4 className="legend-title">Status Key</h4>
            <div className="legend-items">
              {['open', 'in-progress', 'resolved', 'closed'].map((status) => (
                <div key={status} className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: getStatusColor(status) }} />
                  <span className="legend-label">{status.replace('-', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {mapInitialized && loading && (
          <div className="map-loading-overlay data-loading">
            <div className="spinner-small"></div>
            <span>Loading issues...</span>
          </div>
        )}
      </div>

      {showIssueModal && selectedIssue && (
        <IssueDetailModal
          issue={selectedIssue}
          isOpen={showIssueModal}
          onClose={() => {
            setShowIssueModal(false);
            setSelectedIssue(null);
          }}
          onUpdate={handleIssueUpdate}
        />
      )}
    </div>
  );
};

export default MapView;
