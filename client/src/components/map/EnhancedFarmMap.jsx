import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polygon, 
  Circle, 
  Polyline,
  ZoomControl,
  LayersControl,
  ScaleControl,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import 'leaflet-routing-machine';
import 'leaflet-draw';
import 'leaflet.markercluster';
import { EditControl } from 'react-leaflet-draw';
import { FiMap, FiSun, FiNavigation, FiDownload, FiFilter, FiGrid, FiCamera, FiCloud, FiWind, FiThermometer, FiDroplet, FiTarget, FiLayers, FiZap } from 'react-icons/fi';
import { calculateDistance, calculatePolygonArea, getTileLayer } from '../../utils/mapUtils';
import * as turf from '@turf/turf';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom hooks for map features
function MapEvents({ onMapClick, onZoom }) {
  const map = useMapEvents({
    click: (e) => onMapClick && onMapClick(e.latlng),
    zoomend: () => onZoom && onZoom(map.getZoom()),
  });
  return null;
}

function HeatmapLayer({ data, radius = 25, blur = 15, maxZoom = 17 }) {
  const map = useMap();
  const heatmapRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Remove existing heatmap
    if (heatmapRef.current) {
      map.removeLayer(heatmapRef.current);
    }

    // Create heatmap layer
    const heatData = data.map(point => {
      const value = point.value || 0;
      // Normalize value for heatmap intensity
      const intensity = Math.min(1, value / 100);
      return [point.lat, point.lng, intensity];
    });

    heatmapRef.current = L.heatLayer(heatData, {
      radius,
      blur,
      maxZoom,
      gradient: {
        0.1: '#00f',  // Blue - low
        0.3: '#0ff',  // Cyan
        0.5: '#0f0',  // Green - medium
        0.7: '#ff0',  // Yellow
        1.0: '#f00'   // Red - high
      }
    }).addTo(map);

    return () => {
      if (heatmapRef.current) {
        map.removeLayer(heatmapRef.current);
      }
    };
  }, [data, map, radius, blur, maxZoom]);

  return null;
}

function RoutingControl({ waypoints, setRouteInfo }) {
  const map = useMap();
  const routingRef = useRef(null);

  useEffect(() => {
    if (!waypoints || waypoints.length < 2) {
      if (routingRef.current) {
        map.removeControl(routingRef.current);
        routingRef.current = null;
      }
      return;
    }

    // Remove existing routing control
    if (routingRef.current) {
      map.removeControl(routingRef.current);
    }

    // Create routing control
    routingRef.current = L.Routing.control({
      waypoints: waypoints.map(wp => L.latLng(wp.lat, wp.lng)),
      lineOptions: {
        styles: [{ color: '#4CAF50', weight: 4, opacity: 0.8 }],
        extendToWaypoints: true,
        missingRouteTolerance: 0
      },
      showAlternatives: false,
      fitSelectedRoutes: true,
      show: false,
      routeWhileDragging: true,
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: 'driving'
      }),
      createMarker: function(i, wp, n) {
        return L.marker(wp.latLng, {
          icon: L.divIcon({
            html: `<div style="background: ${i === 0 ? '#4CAF50' : i === n-1 ? '#FF9800' : '#2196F3'}; 
                   width: 24px; height: 24px; border-radius: 50%; color: white; 
                   display: flex; align-items: center; justify-content: center;
                   border: 2px solid white; font-weight: bold;">${i+1}</div>`,
            className: 'custom-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 24]
          })
        }).bindPopup(`Waypoint ${i+1}: ${wp.latLng.lat.toFixed(6)}, ${wp.latLng.lng.toFixed(6)}`);
      }
    }).addTo(map);

    // Listen to route found event
    routingRef.current.on('routesfound', function(e) {
      const routes = e.routes;
      const route = routes[0];
      
      if (setRouteInfo) {
        setRouteInfo({
          distance: route.summary.totalDistance / 1000, // Convert to km
          time: route.summary.totalTime / 60, // Convert to minutes
          instructions: route.instructions
        });
      }
    });

    return () => {
      if (routingRef.current) {
        map.removeControl(routingRef.current);
      }
    };
  }, [waypoints, map, setRouteInfo]);

  return null;
}

function WeatherOverlay({ weatherData }) {
  const map = useMap();
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!weatherData || !map) return;

    // Create weather overlay (simulated - in production use actual weather tile service)
    const weatherLayer = L.layerGroup();
    
    // Add temperature markers
    if (weatherData.temperature) {
      weatherData.temperature.forEach(temp => {
        const marker = L.circleMarker([temp.lat, temp.lng], {
          radius: 15,
          fillColor: getTemperatureColor(temp.value),
          color: '#333',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.7
        }).bindPopup(`
          <div style="padding: 10px;">
            <strong>Temperature:</strong> ${temp.value}°C<br/>
            <strong>Location:</strong> ${temp.lat.toFixed(4)}, ${temp.lng.toFixed(4)}<br/>
            <strong>Time:</strong> ${new Date(temp.timestamp).toLocaleTimeString()}
          </div>
        `);
        weatherLayer.addLayer(marker);
      });
    }

    // Add rainfall overlay
    if (weatherData.rainfall) {
      weatherData.rainfall.forEach(rain => {
        const circle = L.circle([rain.lat, rain.lng], {
          radius: rain.intensity * 100, // Scale based on intensity
          color: '#2196F3',
          fillColor: '#2196F3',
          weight: 1,
          opacity: 0.6,
          fillOpacity: 0.3
        }).bindPopup(`
          <div style="padding: 10px;">
            <strong>Rainfall:</strong> ${rain.value} mm<br/>
            <strong>Intensity:</strong> ${rain.intensity}<br/>
            <strong>Duration:</strong> ${rain.duration} min
          </div>
        `);
        weatherLayer.addLayer(circle);
      });
    }

    // Add wind direction arrows
    if (weatherData.wind) {
      weatherData.wind.forEach(wind => {
        const arrow = L.polyline.arrow(
          [wind.lat, wind.lng],
          [
            wind.lat + Math.sin(wind.direction * Math.PI / 180) * 0.01,
            wind.lng + Math.cos(wind.direction * Math.PI / 180) * 0.01
          ],
          {
            color: '#FF9800',
            weight: 3,
            opacity: 0.8,
            arrowheads: { frequency: 'endonly', size: '15px' }
          }
        ).bindPopup(`
          <div style="padding: 10px;">
            <strong>Wind Speed:</strong> ${wind.speed} km/h<br/>
            <strong>Direction:</strong> ${wind.direction}°<br/>
            <strong>Gusts:</strong> ${wind.gusts} km/h
          </div>
        `);
        weatherLayer.addLayer(arrow);
      });
    }

    weatherLayer.addTo(map);
    overlayRef.current = weatherLayer;

    return () => {
      if (overlayRef.current) {
        overlayRef.current.remove();
      }
    };
  }, [weatherData, map]);

  return null;
}

function getTemperatureColor(temp) {
  if (temp < 0) return '#2196F3';    // Blue - very cold
  if (temp < 10) return '#4CAF50';   // Green - cool
  if (temp < 25) return '#FFEB3B';   // Yellow - comfortable
  if (temp < 35) return '#FF9800';   // Orange - warm
  return '#F44336';                  // Red - hot
}

// Main Enhanced Farm Map Component
const EnhancedFarmMap = ({
  farms = [],
  sensors = [],
  selectedFarm = null,
  onFarmSelect = () => {},
  onSensorClick = () => {},
  onZoneCreated = () => {},
  height = '600px',
  showControls = true,
  showLegend = true,
  activeFeatures = {
    heatmap: true,
    routing: true,
    drawing: true,
    weather: true,
    elevation: true,
    gps: true
  }
}) => {
  const mapRef = useRef(null);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
  const [mapZoom, setMapZoom] = useState(5);
  const [activeLayer, setActiveLayer] = useState('standard');
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [routeWaypoints, setRouteWaypoints] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [gpsTracks, setGpsTracks] = useState([]);
  const [drawingMode, setDrawingMode] = useState(null);
  const [zones, setZones] = useState([]);
  const [elevationProfile, setElevationProfile] = useState(null);

  // Initialize map features
  useEffect(() => {
    // Generate sample heatmap data from sensors
    const generateHeatmapData = () => {
      return sensors.map(sensor => ({
        lat: sensor.location?.latitude || mapCenter[0] + (Math.random() - 0.5) * 0.1,
        lng: sensor.location?.longitude || mapCenter[1] + (Math.random() - 0.5) * 0.1,
        value: sensor.currentReading?.value || Math.random() * 100
      }));
    };

    // Generate sample weather data
    const generateWeatherData = () => ({
      temperature: [
        { lat: mapCenter[0], lng: mapCenter[1], value: 25, timestamp: new Date() }
      ],
      rainfall: [
        { lat: mapCenter[0] + 0.01, lng: mapCenter[1] + 0.01, value: 5, intensity: 'light', duration: 30 }
      ],
      wind: [
        { lat: mapCenter[0], lng: mapCenter[1], speed: 15, direction: 45, gusts: 20 }
      ]
    });

    // Generate sample GPS tracks
    const generateGpsTracks = () => {
      return [
        {
          id: 1,
          name: 'Tractor-1',
          path: [
            [mapCenter[0] - 0.001, mapCenter[1] - 0.001],
            [mapCenter[0] - 0.0005, mapCenter[1]],
            [mapCenter[0], mapCenter[1] + 0.001],
            [mapCenter[0] + 0.001, mapCenter[1] + 0.0005]
          ],
          color: '#FF5722',
          speed: 15,
          lastUpdate: new Date()
        }
      ];
    };

    setHeatmapData(generateHeatmapData());
    setWeatherData(generateWeatherData());
    setGpsTracks(generateGpsTracks());
  }, [sensors, mapCenter]);

  // Center map on selected farm
  useEffect(() => {
    if (selectedFarm && farms.length > 0) {
      const farm = farms.find(f => f._id === selectedFarm);
      if (farm?.location?.coordinates) {
        const coords = farm.location.coordinates[0][0];
        const center = [coords[1], coords[0]];
        setMapCenter(center);
        setMapZoom(15);
        
        if (mapRef.current) {
          mapRef.current.setView(center, 15);
        }
      }
    }
  }, [selectedFarm, farms]);

  // Handle drawing events
  const handleCreated = (e) => {
    const { layerType, layer } = e;
    const newZone = {
      id: Date.now(),
      type: layerType,
      coordinates: layer.getLatLngs(),
      area: calculatePolygonArea(layer.getLatLngs()[0]),
      name: `Zone ${zones.length + 1}`
    };
    
    setZones(prev => [...prev, newZone]);
    onZoneCreated && onZoneCreated(newZone);
  };

  // Handle map click for routing
  const handleMapClick = (latlng) => {
    if (drawingMode === 'route') {
      setRouteWaypoints(prev => [...prev, { lat: latlng.lat, lng: latlng.lng }]);
    }
  };

  // Create sensor icon
  const createSensorIcon = (sensor) => {
    let color = '#4CAF50'; // Active
    if (sensor.status === 'error') color = '#F44336';
    if (sensor.status === 'offline') color = '#9E9E9E';
    if (sensor.status === 'warning') color = '#FF9800';

    let iconChar = '📡';
    switch(sensor.type) {
      case 'temperature': iconChar = '🌡️'; break;
      case 'humidity': iconChar = '💧'; break;
      case 'soil_moisture': iconChar = '🌱'; break;
      case 'light_intensity': iconChar = '☀️'; break;
      case 'co2': iconChar = '💨'; break;
      case 'rainfall': iconChar = '🌧️'; break;
      case 'wind_speed': iconChar = '💨'; break;
      case 'camera': iconChar = '📷'; break;
      default: iconChar = '📡';
    }

    return L.divIcon({
      html: `
        <div style="
          background: ${color};
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 16px;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
          animation: ${sensor.status === 'error' ? 'alert-pulse 1.5s infinite' : 'none'};
        ">
          ${iconChar}
        </div>
      `,
      className: 'custom-sensor-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });
  };

  // Render farms
  const renderFarms = () => {
    return farms.map(farm => {
      if (!farm.location?.coordinates) return null;
      
      const coordinates = farm.location.coordinates[0].map(coord => [coord[1], coord[0]]);
      const isSelected = farm._id === selectedFarm;
      
      return (
        <Polygon
          key={farm._id}
          pathOptions={{
            color: isSelected ? '#FF9800' : '#4CAF50',
            weight: isSelected ? 4 : 3,
            opacity: 0.8,
            fillColor: isSelected ? '#FF9800' : '#4CAF50',
            fillOpacity: 0.2
          }}
          positions={coordinates}
          eventHandlers={{
            click: () => onFarmSelect(farm._id)
          }}
        >
          <Popup>
            <div className="p-3 min-w-[200px]">
              <h3 className="font-bold text-lg mb-2">{farm.name}</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Status:</strong> <span className="text-green-600">{farm.status}</span></p>
                <p><strong>Size:</strong> {farm.size?.value || 'N/A'} {farm.size?.unit || ''}</p>
                <p><strong>Area:</strong> {calculatePolygonArea(coordinates).toFixed(2)} hectares</p>
                <p><strong>Sensors:</strong> {farm.sensors?.length || 0}</p>
              </div>
            </div>
          </Popup>
        </Polygon>
      );
    });
  };

  // Render sensors
  const renderSensors = () => {
    return sensors.map(sensor => {
      if (!sensor.location) return null;
      
      return (
        <Marker
          key={sensor._id}
          position={[sensor.location.latitude, sensor.location.longitude]}
          icon={createSensorIcon(sensor)}
          eventHandlers={{
            click: () => onSensorClick(sensor)
          }}
        >
          <Popup>
            <div className="p-3 min-w-[220px]">
              <h4 className="font-bold text-lg">{sensor.name}</h4>
              <div className="mt-2 space-y-1 text-sm">
                <p><strong>Type:</strong> {sensor.type.replace('_', ' ')}</p>
                <p><strong>Value:</strong> {sensor.currentReading?.value || '--'}{sensor.currentReading?.unit}</p>
                <p><strong>Battery:</strong> {sensor.batteryLevel || '--'}%</p>
              </div>
            </div>
          </Popup>
        </Marker>
      );
    });
  };

  // Render GPS tracks
  const renderGpsTracks = () => {
    return gpsTracks.map(track => (
      <Polyline
        key={track.id}
        pathOptions={{
          color: track.color,
          weight: 4,
          opacity: 0.7,
          dashArray: '5, 5'
        }}
        positions={track.path}
      >
        <Popup>
          <div className="p-3">
            <h4 className="font-bold text-lg">{track.name}</h4>
            <p><strong>Speed:</strong> {track.speed} km/h</p>
            <p><strong>Last Update:</strong> {track.lastUpdate.toLocaleTimeString()}</p>
            <p><strong>Distance:</strong> {calculateDistance(
              track.path[0][0], track.path[0][1],
              track.path[track.path.length-1][0], track.path[track.path.length-1][1]
            ).toFixed(2)} km</p>
          </div>
        </Popup>
      </Polyline>
    ));
  };

  // Render zones
  const renderZones = () => {
    return zones.map(zone => {
      const zoneColors = {
        irrigation: { color: '#2196F3', fillColor: '#2196F3' },
        crop: { color: '#4CAF50', fillColor: '#4CAF50' },
        restricted: { color: '#F44336', fillColor: '#F44336' },
        buffer: { color: '#FF9800', fillColor: '#FF9800' }
      };
      
      const style = zoneColors[zone.type] || { color: '#9C27B0', fillColor: '#9C27B0' };
      
      return (
        <Polygon
          key={zone.id}
          pathOptions={{
            ...style,
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.2,
            dashArray: zone.type === 'buffer' ? '5, 5' : undefined
          }}
          positions={zone.coordinates}
        >
          <Popup>
            <div className="p-3">
              <h4 className="font-bold text-lg">{zone.name}</h4>
              <p><strong>Type:</strong> {zone.type}</p>
              <p><strong>Area:</strong> {zone.area.toFixed(2)} hectares</p>
              <p><strong>Sensors in zone:</strong> {
                sensors.filter(s => 
                  turf.booleanPointInPolygon(
                    turf.point([s.location.longitude, s.location.latitude]),
                    turf.polygon([zone.coordinates.map(c => [c.lng, c.lat])])
                  )
                ).length
              }</p>
            </div>
          </Popup>
        </Polygon>
      );
    });
  };

  const handleExportMap = (format = 'geojson') => {
    // Export all map data
    const exportData = {
      farms: farms.map(farm => ({
        name: farm.name,
        coordinates: farm.location?.coordinates,
        sensors: farm.sensors?.length
      })),
      zones: zones,
      sensors: sensors.map(sensor => ({
        name: sensor.name,
        location: sensor.location,
        type: sensor.type
      })),
      gpsTracks: gpsTracks,
      timestamp: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `agri360-map-export-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="relative">
      {/* Feature Controls */}
      <div className="mb-4 flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${drawingMode === 'route' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-white border border-gray-300'}`}
            onClick={() => setDrawingMode(drawingMode === 'route' ? null : 'route')}
          >
            <FiNavigation /> {drawingMode === 'route' ? 'Adding Route Points...' : 'Add Route'}
          </button>
          
          <button
            className="px-4 py-2 rounded-lg bg-white border border-gray-300 flex items-center gap-2"
            onClick={() => setRouteWaypoints([])}
            disabled={routeWaypoints.length === 0}
          >
            Clear Route
          </button>
          
          <button
            className="px-4 py-2 rounded-lg bg-white border border-gray-300 flex items-center gap-2"
            onClick={() => handleExportMap()}
          >
            <FiDownload /> Export Map
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div 
        className="rounded-lg overflow-hidden border border-gray-200 relative"
        style={{ height }}
      >
        <MapContainer
          ref={mapRef}
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          whenCreated={(map) => {
            mapRef.current = map;
          }}
        >
          <MapEvents onMapClick={handleMapClick} onZoom={setMapZoom} />
          
          <LayersControl position="topright">
            {/* Base Layers */}
            <LayersControl.BaseLayer checked name="OpenStreetMap">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
            
            <LayersControl.BaseLayer name="Satellite">
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
            
            <LayersControl.BaseLayer name="Topography">
              <TileLayer
                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                attribution='Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)'
                maxZoom={17}
              />
            </LayersControl.BaseLayer>
            
            <LayersControl.BaseLayer name="Hydrological">
              <TileLayer
                url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
                attribution='© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team'
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
            
            {/* Overlay Layers */}
            {activeFeatures.heatmap && (
              <LayersControl.Overlay name="Soil Moisture Heatmap" checked>
                <HeatmapLayer data={heatmapData} />
              </LayersControl.Overlay>
            )}
            
            {activeFeatures.weather && weatherData && (
              <LayersControl.Overlay name="Weather Overlay">
                <WeatherOverlay weatherData={weatherData} />
              </LayersControl.Overlay>
            )}
            
            {activeFeatures.routing && routeWaypoints.length > 1 && (
              <LayersControl.Overlay name="Routing" checked>
                <RoutingControl waypoints={routeWaypoints} setRouteInfo={setRouteInfo} />
              </LayersControl.Overlay>
            )}
          </LayersControl>
          
          <ZoomControl position="bottomright" />
          <ScaleControl position="bottomleft" />
          
          {/* Drawing Tool */}
          {activeFeatures.drawing && (
            <EditControl
              position="topright"
              onCreated={handleCreated}
              draw={{
                rectangle: true,
                polygon: true,
                circle: true,
                marker: false,
                polyline: false,
                circlemarker: false
              }}
            />
          )}
          
          {/* Render map features */}
          {renderFarms()}
          {renderSensors()}
          {renderZones()}
          {renderGpsTracks()}
          
          {/* Waypoint markers */}
          {routeWaypoints.map((wp, index) => (
            <Marker
              key={index}
              position={[wp.lat, wp.lng]}
              icon={L.divIcon({
                html: `<div style="background: ${index === 0 ? '#4CAF50' : index === routeWaypoints.length-1 ? '#FF9800' : '#2196F3'}; 
                       width: 24px; height: 24px; border-radius: 50%; color: white; 
                       display: flex; align-items: center; justify-content: center;
                       border: 2px solid white; font-weight: bold;">${index+1}</div>`,
                className: 'custom-marker',
                iconSize: [24, 24],
                iconAnchor: [12, 24]
              })}
            />
          ))}
          
          {/* Custom Controls */}
          <div className="leaflet-top leaflet-right">
            <div className="leaflet-control leaflet-bar bg-white rounded-lg shadow-lg p-2 space-y-2">
              <div className="text-xs font-semibold text-gray-700 mb-1">Features</div>
              <button
                className="p-2 hover:bg-gray-100 rounded flex items-center gap-2 text-sm"
                onClick={() => setDrawingMode(drawingMode === 'draw' ? null : 'draw')}
                title="Drawing Tools"
              >
                <FiGrid /> Draw
              </button>
              <button
                className="p-2 hover:bg-gray-100 rounded flex items-center gap-2 text-sm"
                onClick={handleExportMap}
                title="Export Map"
              >
                <FiDownload /> Export
              </button>
              <button
                className="p-2 hover:bg-gray-100 rounded flex items-center gap-2 text-sm"
                onClick={() => {
                  if (mapRef.current) {
                    mapRef.current.setView([20.5937, 78.9629], 5);
                  }
                }}
                title="Reset View"
              >
                <FiNavigation /> Reset
              </button>
            </div>
          </div>
        </MapContainer>
      </div>

      {/* Route Info Panel */}
      {routeInfo && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-bold text-blue-800 mb-2">Route Information</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{routeInfo.distance.toFixed(2)}</div>
              <div className="text-sm text-blue-500">Distance (km)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{routeInfo.time.toFixed(0)}</div>
              <div className="text-sm text-blue-500">Time (min)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{routeWaypoints.length}</div>
              <div className="text-sm text-blue-500">Waypoints</div>
            </div>
          </div>
        </div>
      )}

      {/* Feature Panels */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FiThermometer className="text-green-600" />
            <h4 className="font-bold text-green-800">Heatmap Analysis</h4>
          </div>
          <p className="text-sm text-green-600">
            Showing {heatmapData.length} data points
            <br />
            Visualizing spatial distribution
          </p>
        </div>
        
        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FiCloud className="text-purple-600" />
            <h4 className="font-bold text-purple-800">Weather Data</h4>
          </div>
          <p className="text-sm text-purple-600">
            Temperature, rainfall, wind
            <br />
            Real-time monitoring
          </p>
        </div>
        
        <div className="p-4 bg-orange-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FiTarget className="text-orange-600" />
            <h4 className="font-bold text-orange-800">GPS Tracking</h4>
          </div>
          <p className="text-sm text-orange-600">
            {gpsTracks.length} active tracks
            <br />
            Equipment monitoring
          </p>
        </div>
      </div>
    </div>
  );
};

export default EnhancedFarmMap;